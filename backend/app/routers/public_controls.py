from fastapi import APIRouter
from sqlalchemy import text

from app.core.db import SessionLocal


router = APIRouter(prefix="/public", tags=["public"])


def get_payload_value(payload: dict, *keys, default=None):
    for key in keys:
        if key in payload and payload.get(key) not in (None, ""):
            return payload.get(key)
    return default


def get_nested_value(payload: dict, parent_key: str, child_key: str, default=None):
    parent = payload.get(parent_key) or {}
    if isinstance(parent, dict):
        return parent.get(child_key, default)
    return default


def normalize_number(value):
    if value in (None, ""):
        return None

    try:
        if isinstance(value, str):
            value = (
                value
                .replace("RON", "")
                .replace("ron", "")
                .replace(".", "")
                .replace(",", ".")
                .strip()
            )

        return float(value)
    except Exception:
        return None


def normalize_text(value):
    if value in (None, ""):
        return None

    return str(value).strip()


def get_public_text(payload: dict, *keys):
    value = get_payload_value(payload, *keys)

    if value in (None, ""):
        return None

    if isinstance(value, list):
        return ", ".join(str(item).strip() for item in value if item not in (None, ""))

    return str(value).strip()


@router.get("/controls/map")
def get_public_controls_map():
    """
    Endpoint public pentru harta controalelor GFN.

    Returneaza date publice/agregabile.

    NU returneaza:
    - echipa de control
    - nume inspectori
    - emailuri
    - created_by_user_id
    - entitate controlata
    - nume petitionar
    - descriere abatere / fapta
    - masuri dispuse
    - observatii interne
    """

    db = SessionLocal()

    try:
        sql = text(
            """
            SELECT
                id,
                created_at,
                control_type,
                result,
                payload
            FROM controls
            WHERE deleted_at IS NULL
            ORDER BY created_at DESC
            """
        )

        rows = db.execute(sql).fetchall()
        data = []

        for row in rows:
            payload = row.payload or {}
            gps = payload.get("gps") or {}

            lat = (
                get_payload_value(payload, "lat", "latitude")
                or gps.get("lat")
            )

            lon = (
                get_payload_value(payload, "lon", "lng", "longitude")
                or gps.get("lon")
                or gps.get("lng")
            )

            domeniu_control = get_payload_value(
                payload,
                "domeniu_control",
                "domeniu",
                "control_domain",
                "domain",
            )

            categorie_control = get_payload_value(
                payload,
                "categorie_control",
                "categoria_controlului",
                "control_category",
                "categorie",
                "category",
            )

            cuantum_amenda_ron = normalize_number(
                get_payload_value(
                    payload,
                    "cuantum_amenda_ron",
                    "cuantum_amenda",
                    "amenda_ron",
                    "valoare_amenda",
                    "valoare_amenda_ron",
                    "amenda",
                )
            )

            valoare_prejudiciu_ron = normalize_number(
                get_payload_value(
                    payload,
                    "valoare_prejudiciu_ron",
                    "prejudiciu_ron",
                    "valoare_prejudiciu",
                    "prejudiciu",
                )
            )

            numar_sesizare = normalize_text(
                get_payload_value(
                    payload,
                    "numar_sesizare",
                    "numar_petitie",
                    "nr_sesizare",
                    "nr_petitie",
                    "sesizare_numar",
                    "petitie_numar",
                )
            )

            data_sesizare = normalize_text(
                get_payload_value(
                    payload,
                    "data_sesizare",
                    "data_inregistrare_sesizare",
                    "data_petitie",
                    "data_numar_sesizare",
                )
            )

            obiect_sesizare = get_public_text(
                payload,
                "obiect_sesizare",
                "descriere_sesizare",
                "rezumat_sesizare",
                "continut_sesizare",
                "motiv_sesizare",
            )

            constatari_publice = get_public_text(
                payload,
                "constatari_publice",
                "rezumat_public_constatari",
                "concluzie_publica",
            )

            masuri_publice = get_public_text(
                payload,
                "masuri_publice",
                "masuri_dispuse_publice",
                "concluzie_masuri_publice",
            )

            este_sesizare = bool(
                payload.get("este_sesizare")
                or numar_sesizare
                or row.control_type == "sesizare"
                or payload.get("control_type") == "sesizare"
            )

            item = {
                "id": row.id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "data_control": payload.get("data_control"),
                "control_type": (
                    row.control_type
                    or payload.get("control_type")
                    or payload.get("mod_desfasurare")
                ),
                "result": row.result or payload.get("result"),
                "garda": payload.get("garda"),
                "judet": payload.get("judet"),
                "localitate": payload.get("localitate"),
                "lat": lat,
                "lon": lon,

                # campuri publice pentru statistici
                "domeniu_control": domeniu_control,
                "categorie_control": categorie_control,
                "cuantum_amenda_ron": cuantum_amenda_ron,
                "valoare_prejudiciu_ron": valoare_prejudiciu_ron,

                # camp public pentru verificarea sesizarii
                # NU returnam numele petitionarului.
                "este_sesizare": este_sesizare,
                "numar_sesizare": numar_sesizare,
                "data_sesizare": data_sesizare,
                "obiect_sesizare": obiect_sesizare,
                "constatari_publice": constatari_publice,
                "masuri_publice": masuri_publice,
            }

            data.append(item)

        return data

    finally:
        db.close()
