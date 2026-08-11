import json
import os
import random
import sys
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import or_, select, update

PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.config import settings
from app.core.db import SessionLocal
from app.models.control import Control
from app.models.user import User


DEMO_COUNT = int(os.getenv("GFN_DEMO_COUNT", "500"))
DEMO_START_DATE = os.getenv("GFN_DEMO_START_DATE", "2026-02-01")
DEMO_END_DATE = os.getenv("GFN_DEMO_END_DATE")
DEMO_RESET = os.getenv("GFN_DEMO_RESET", "").lower() == "true"
DEMO_BATCH = os.getenv("GFN_DEMO_BATCH", f"seed_demo_{datetime.now():%Y%m%d%H%M%S}")

ROMANIA_BOUNDS = {
    "min_lat": 43.0,
    "max_lat": 49.0,
    "min_lon": 20.0,
    "max_lon": 30.5,
}

APP_DIR = Path(__file__).resolve().parents[1]
GARZI_GEOJSON_PATH = APP_DIR / "ui" / "gfn_garzi.geojson"

GUARD_NAME_MAP = {
    "GF Brasov": "Garda Forestiera Brasov",
    "GF Bucuresti": "Garda Forestiera Bucuresti",
    "GF Cluj": "Garda Forestiera Cluj",
    "GF Focsani": "Garda Forestiera Focsani",
    "GF Oradea": "Garda Forestiera Oradea",
    "GF Ploiesti": "Garda Forestiera Ploiesti",
    "GF Ramnicu Valcea": "Garda Forestiera Ramnicu Valcea",
    "GF Suceava": "Garda Forestiera Suceava",
    "GF Timisoara": "Garda Forestiera Timisoara",
}

GUARD_JUDETE = {
    "Garda Forestiera Brasov": ["Brasov", "Covasna", "Harghita"],
    "Garda Forestiera Bucuresti": ["Ilfov", "Giurgiu", "Calarasi", "Ialomita", "Teleorman"],
    "Garda Forestiera Cluj": ["Cluj", "Bistrita-Nasaud", "Maramures", "Salaj", "Mures"],
    "Garda Forestiera Focsani": ["Vrancea", "Buzau", "Galati", "Braila", "Bacau"],
    "Garda Forestiera Oradea": ["Bihor", "Satu Mare"],
    "Garda Forestiera Ploiesti": ["Prahova", "Dambovita", "Arges"],
    "Garda Forestiera Ramnicu Valcea": ["Valcea", "Gorj", "Dolj", "Olt"],
    "Garda Forestiera Suceava": ["Suceava", "Botosani", "Neamt", "Iasi"],
    "Garda Forestiera Timisoara": ["Timis", "Arad", "Caras-Severin", "Hunedoara"],
}

GUARD_LOCALITATI = {
    "Garda Forestiera Brasov": ["Brasov", "Zarnesti", "Rasnov", "Predeal", "Sfantu Gheorghe", "Miercurea Ciuc"],
    "Garda Forestiera Bucuresti": ["Bucuresti", "Snagov", "Buftea", "Giurgiu", "Calarasi", "Slobozia"],
    "Garda Forestiera Cluj": ["Cluj-Napoca", "Bistrita", "Baia Mare", "Zalau", "Reghin", "Dej"],
    "Garda Forestiera Focsani": ["Focsani", "Buzau", "Galati", "Braila", "Adjud", "Onesti"],
    "Garda Forestiera Oradea": ["Oradea", "Beius", "Alesd", "Satu Mare", "Carei", "Marghita"],
    "Garda Forestiera Ploiesti": ["Ploiesti", "Campina", "Targoviste", "Pitesti", "Curtea de Arges", "Valenii de Munte"],
    "Garda Forestiera Ramnicu Valcea": ["Ramnicu Valcea", "Horezu", "Targu Jiu", "Craiova", "Slatina", "Calimanesti"],
    "Garda Forestiera Suceava": ["Suceava", "Vatra Dornei", "Campulung Moldovenesc", "Falticeni", "Piatra Neamt", "Botosani"],
    "Garda Forestiera Timisoara": ["Timisoara", "Arad", "Resita", "Caransebes", "Deva", "Lugoj"],
}

FOREST_AREA_HA = {
    "Garda Forestiera Brasov": 1_052_021.00,
    "Garda Forestiera Bucuresti": 177_378.29,
    "Garda Forestiera Cluj": 836_921.18,
    "Garda Forestiera Focsani": 588_137.00,
    "Garda Forestiera Oradea": 580_810.00,
    "Garda Forestiera Ploiesti": 542_266.96,
    "Garda Forestiera Ramnicu Valcea": 774_224.35,
    "Garda Forestiera Suceava": 1_128_751.00,
    "Garda Forestiera Timisoara": 1_183_505.00,
}

CONTROL_TYPES = ["fond", "tematic", "operativ", "sesizare"]
CONTROL_TYPE_WEIGHTS = [0.14, 0.34, 0.32, 0.20]

RESULTS = ["conform", "neconform", "avertisment", "sanctiune", "sesizare_penala"]
RESULT_WEIGHTS = [0.58, 0.13, 0.11, 0.15, 0.03]

DOMAIN_CATEGORIES = {
    "Domeniul silvic": [
        "Control de fond",
        "Control partial",
        "Instalatii / depozite materiale lemnoase",
        "Exploatarea masei lemnoase",
        "Control anual regenerari",
        "Lucrari regenerare / impadurire",
        "Verificarea actelor de punere in valoare",
        "Controlul circulatiei materialelor lemnoase",
    ],
    "Domeniul cinegetic": [
        "Control de fond",
        "Criterii de licentiere",
        "Respectarea prevederilor legale la vanatoare",
        "Populare / repopulare",
        "Prevenire / combatere braconaj",
        "Studii de evaluare in teren",
        "Procese-verbale de pagube",
    ],
}

TIP_ENTITATE_BY_DOMAIN = {
    "Domeniul silvic": [
        "ocol silvic",
        "operator economic",
        "depozit materiale lemnoase",
        "exploatator forestier",
        "primarie",
        "persoana fizica",
    ],
    "Domeniul cinegetic": [
        "gestionar fond cinegetic",
        "asociatie vanatoare",
        "operator cinegetic",
        "persoana fizica",
    ],
}

ENTITATI = {
    "ocol silvic": ["Ocolul Silvic Demo Nord", "Ocolul Silvic Demo Sud", "Ocolul Silvic Valea Mare", "Ocolul Silvic Muntele Verde"],
    "operator economic": ["SC Forest Demo SRL", "SC Lemn Control SRL", "SC Exploatare Test SRL", "SC Depozit Lemnos SRL"],
    "depozit materiale lemnoase": ["Depozit Lemnos Demo Vest", "Depozit Sortare Valea Bradului", "Depozit Materiale Lemnoase Nord"],
    "exploatator forestier": ["Exploatare Forestiera Demo SRL", "Lucrari Silvice Test SRL", "Parchet Demo 24 SRL"],
    "primarie": ["Primaria Demo", "Primaria Valea Padurii", "Primaria Muntele Mic"],
    "persoana fizica": ["Persoana fizica verificata", "Detinator teren forestier", "Transportator persoana fizica"],
    "gestionar fond cinegetic": ["Gestionar Fond Cinegetic Demo", "Asociatia Cinegetica Codrii", "Fond Cinegetic Valea Mare"],
    "asociatie vanatoare": ["Asociatia Vanatorilor Demo", "AVPS Codrul Verde", "Asociatia Cinegetica Nord"],
    "operator cinegetic": ["Operator Cinegetic Demo SRL", "Servicii Cinegetice Test SRL"],
}

INSPECTORI = [
    "Preda Larisa",
    "Ilie Stefan",
    "Matei Claudiu",
    "Popescu Andrei",
    "Ionescu Mihai",
    "Dumitrescu Elena",
    "Stan Radu",
    "Georgescu Vlad",
    "Munteanu Ioana",
    "Marin Cristian",
    "Petrescu Alexandra",
    "Lupu Daniel",
    "Constantin Sorin",
    "Rusu Ana",
    "Dobre Irina",
    "Nita Alexandru",
    "Moldovan Catalin",
    "Toma Gabriel",
]

PETITIONARI = [
    "Andrei Pop",
    "Maria Iancu",
    "Cristian Dinu",
    "Elena Muresan",
    "Sorin Pavel",
    "Ioana Radu",
    "Alexandru Matei",
    "Gabriel Stan",
]

ABATERI = [
    "transport de materiale lemnoase fara documente complete",
    "neconcordante intre stocul scriptic si stocul faptic",
    "nerespectarea tehnologiei de exploatare aprobate",
    "depozitare neconforma a materialelor lemnoase",
    "lucrari de regenerare executate partial",
    "lipsa documentelor justificative la momentul controlului",
    "nerespectarea prevederilor din autorizatia de exploatare",
    "indicii privind fapte care pot intruni elementele unei infractiuni",
]

MASURI = [
    "s-a dispus remedierea deficientelor si transmiterea dovezilor in termenul legal",
    "s-a aplicat sanctiune contraventionala si s-au stabilit masuri complementare",
    "s-a dispus verificarea documentelor suplimentare si monitorizarea operatorului",
    "s-a dispus confiscarea valorica si sesizarea organelor competente, dupa caz",
    "s-a stabilit plan de masuri pentru intrarea in legalitate",
]

ACTE_NORMATIVE = [
    ("Legea nr. 171/2010", "art. 19"),
    ("Codul silvic", "art. 107"),
    ("HG nr. 497/2020", "art. 8"),
    ("OUG nr. 195/2005", "art. 96"),
    ("Legea vanatorii si a protectiei fondului cinegetic nr. 407/2006", "art. 42"),
]


@dataclass
class GuardGeometry:
    source_name: str
    display_name: str
    polygons: list[list[list[tuple[float, float]]]]
    bbox: tuple[float, float, float, float]


def is_inside_romania(lat: float, lon: float) -> bool:
    return (
        ROMANIA_BOUNDS["min_lat"] <= lat <= ROMANIA_BOUNDS["max_lat"]
        and ROMANIA_BOUNDS["min_lon"] <= lon <= ROMANIA_BOUNDS["max_lon"]
    )


def point_in_ring(lon: float, lat: float, ring: list[tuple[float, float]]) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        intersects = (yi > lat) != (yj > lat)
        if intersects:
            x_at_y = (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi
            if lon < x_at_y:
                inside = not inside
        j = i
    return inside


def point_in_polygon(lon: float, lat: float, polygon: list[list[tuple[float, float]]]) -> bool:
    if not polygon or not point_in_ring(lon, lat, polygon[0]):
        return False
    for hole in polygon[1:]:
        if point_in_ring(lon, lat, hole):
            return False
    return True


def point_in_multipolygon(lon: float, lat: float, polygons: list[list[list[tuple[float, float]]]]) -> bool:
    return any(point_in_polygon(lon, lat, polygon) for polygon in polygons)


def feature_to_polygons(feature: dict[str, Any]) -> list[list[list[tuple[float, float]]]]:
    geometry = feature.get("geometry") or {}
    geom_type = geometry.get("type")
    coordinates = geometry.get("coordinates") or []

    if geom_type == "Polygon":
        coordinates = [coordinates]
    if geom_type != "MultiPolygon" and geometry.get("type") != "Polygon":
        raise ValueError(f"Geometrie neacceptata: {geom_type}")

    polygons: list[list[list[tuple[float, float]]]] = []
    for polygon in coordinates:
        rings = []
        for ring in polygon:
            rings.append([(float(lon), float(lat)) for lon, lat in ring])
        if rings:
            polygons.append(rings)
    return polygons


def polygons_bbox(polygons: list[list[list[tuple[float, float]]]]) -> tuple[float, float, float, float]:
    points = [point for polygon in polygons for ring in polygon for point in ring]
    min_lon = min(point[0] for point in points)
    max_lon = max(point[0] for point in points)
    min_lat = min(point[1] for point in points)
    max_lat = max(point[1] for point in points)
    return min_lon, min_lat, max_lon, max_lat


def load_guard_geometries(path: Path = GARZI_GEOJSON_PATH) -> list[GuardGeometry]:
    if not path.exists():
        raise FileNotFoundError(f"Nu gasesc fisierul GeoJSON: {path}")

    data = json.loads(path.read_text(encoding="utf-8-sig"))
    guards = []
    for feature in data.get("features", []):
        props = feature.get("properties") or {}
        source_name = props.get("GARDA") or props.get("garda") or props.get("name")
        if not source_name:
            raise ValueError("Feature fara proprietatea GARDA in GeoJSON.")
        polygons = feature_to_polygons(feature)
        guards.append(
            GuardGeometry(
                source_name=source_name,
                display_name=GUARD_NAME_MAP.get(source_name, source_name),
                polygons=polygons,
                bbox=polygons_bbox(polygons),
            )
        )
    if not guards:
        raise ValueError("GeoJSON-ul nu contine garzi.")
    return guards


def random_point_in_guard(guard: GuardGeometry, rng: random.Random) -> tuple[float, float]:
    min_lon, min_lat, max_lon, max_lat = guard.bbox
    for _ in range(25000):
        lon = rng.uniform(min_lon, max_lon)
        lat = rng.uniform(min_lat, max_lat)
        if is_inside_romania(lat, lon) and point_in_multipolygon(lon, lat, guard.polygons):
            return round(lat, 6), round(lon, 6)
    raise RuntimeError(f"Nu am reusit sa generez punct valid in poligonul {guard.display_name}.")


def distribute_controls(guards: list[GuardGeometry], total: int) -> dict[str, int]:
    if total < len(guards):
        raise ValueError(f"DEMO_COUNT trebuie sa fie cel putin {len(guards)} pentru a acoperi toate garzile.")

    weights = {
        guard.display_name: max(FOREST_AREA_HA.get(guard.display_name, 400_000.0), 100_000.0)
        for guard in guards
    }
    weight_total = sum(weights.values())
    raw = {name: total * weight / weight_total for name, weight in weights.items()}
    min_per_guard = min(10, max(1, total // (len(guards) * 8)))
    counts = {name: max(min_per_guard, int(value)) for name, value in raw.items()}
    names_by_fraction = sorted(raw, key=lambda name: raw[name] - int(raw[name]), reverse=True)

    while sum(counts.values()) < total:
        for name in names_by_fraction:
            counts[name] += 1
            if sum(counts.values()) == total:
                break

    while sum(counts.values()) > total:
        for name in reversed(names_by_fraction):
            if counts[name] > min_per_guard:
                counts[name] -= 1
            if sum(counts.values()) == total:
                break

    return counts


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def random_datetime(rng: random.Random) -> datetime:
    start = parse_date(DEMO_START_DATE)
    end = parse_date(DEMO_END_DATE) if DEMO_END_DATE else date.today()
    if end < start:
        raise ValueError(f"GFN_DEMO_END_DATE ({end}) este inainte de GFN_DEMO_START_DATE ({start}).")
    days = (end - start).days
    d = start + timedelta(days=rng.randint(0, days))
    t = time(
        hour=rng.randint(7, 18),
        minute=rng.choice([0, 5, 10, 15, 20, 30, 40, 45, 50]),
        second=0,
    )
    return datetime.combine(d, t)


def choose_weighted(rng: random.Random, values: list[str], weights: list[float]) -> str:
    return rng.choices(values, weights=weights, k=1)[0]


def inspector_email(name: str) -> str:
    safe = (
        name.lower()
        .replace(" ", ".")
        .replace("a", "a")
        .replace("a", "a")
        .replace("i", "i")
        .replace("s", "s")
        .replace("s", "s")
        .replace("t", "t")
        .replace("t", "t")
    )
    return f"{safe}@gfn.gov.ro"


def random_team(rng: random.Random) -> list[dict[str, str]]:
    team_size = rng.choices([2, 3, 4], weights=[0.72, 0.23, 0.05], k=1)[0]
    names = rng.sample(INSPECTORI, team_size)
    return [{"nume": name, "email": inspector_email(name)} for name in names]


def result_problem(result: str) -> bool:
    return result in {"neconform", "sanctiune", "sesizare_penala"}


def build_payload(index: int, guard: GuardGeometry, rng: random.Random) -> tuple[dict[str, Any], datetime, str, str]:
    created_at = random_datetime(rng)
    lat, lon = random_point_in_guard(guard, rng)
    control_type = choose_weighted(rng, CONTROL_TYPES, CONTROL_TYPE_WEIGHTS)
    result = choose_weighted(rng, RESULTS, RESULT_WEIGHTS)
    if control_type == "sesizare" and result == "conform":
        result = choose_weighted(rng, RESULTS, [0.42, 0.18, 0.16, 0.20, 0.04])

    domain = rng.choices(["Domeniul silvic", "Domeniul cinegetic"], weights=[0.78, 0.22], k=1)[0]
    if control_type == "fond":
        category = "Control de fond"
    else:
        category = rng.choice(DOMAIN_CATEGORIES[domain])

    judet = rng.choice(GUARD_JUDETE.get(guard.display_name, ["-"]))
    localitate = rng.choice(GUARD_LOCALITATI.get(guard.display_name, ["-"]))
    tip_entitate = rng.choice(TIP_ENTITATE_BY_DOMAIN[domain])
    entitate = rng.choice(ENTITATI[tip_entitate])

    fine = 0
    damage = 0
    descriere_abatere = ""
    masuri_dispuse = ""
    act_normativ = ""
    articol = ""
    constatari = "Nu au fost constatate abateri relevante. Controlul a fost consemnat ca fiind conform."

    if result_problem(result):
        fine = rng.choice([1_000, 2_500, 5_000, 7_500, 10_000, 15_000, 20_000, 30_000, 45_000])
        damage = rng.choice([0, 0, 1_250, 3_500, 7_800, 12_500, 22_000, 45_000, 80_000])
        descriere_abatere = rng.choice(ABATERI)
        masuri_dispuse = rng.choice(MASURI)
        act_normativ, articol = rng.choice(ACTE_NORMATIVE)
        constatari = f"S-au constatat aspecte neconforme: {descriere_abatere}. {masuri_dispuse.capitalize()}."
    elif result == "avertisment":
        descriere_abatere = "deficiente minore consemnate in timpul controlului"
        masuri_dispuse = "s-a dispus remedierea deficientelor minore in termenul legal"
        constatari = "Au fost identificate deficiente minore, fara prejudiciu semnificativ."

    is_petition = control_type == "sesizare"
    petition_date = created_at.date() - timedelta(days=rng.randint(1, 28)) if is_petition else None
    petition_no = f"{rng.randint(1000, 9999)}/{petition_date:%d.%m.%Y}" if petition_date else ""
    petitioner = rng.choice(PETITIONARI) if is_petition else ""
    petition_subject = rng.choice(
        [
            "sesizare privind transport de material lemnos",
            "sesizare privind taieri neautorizate",
            "sesizare privind depozitare materiale lemnoase",
            "sesizare privind activitati de exploatare in zona forestiera",
            "sesizare privind posibile fapte de braconaj",
        ]
    ) if is_petition else ""

    payload = {
        "demo_seed": True,
        "demo_batch": DEMO_BATCH,
        "demo_index": index,
        "data_control": created_at.date().isoformat(),
        "ora_control": created_at.strftime("%H:%M"),
        "garda": guard.display_name,
        "judet": judet,
        "localitate": localitate,
        "reper": f"Reper operational demo {index} - {localitate}, zona fond forestier",
        "lat": lat,
        "lon": lon,
        "gps": {"lat": lat, "lon": lon},
        "entitate_controlata": entitate,
        "tip_entitate": tip_entitate,
        "cui": str(rng.randint(10_000_000, 99_999_999)),
        "sediu": f"{localitate}, judetul {judet}",
        "reprezentant_nume": rng.choice(["Ion Popa", "Maria Dobre", "Vasile Istrate", "Elena Pavel", "Sorin Dumitru"]),
        "reprezentant_calitate": rng.choice(["administrator", "sef ocol", "reprezentant legal", "imputernicit"]),
        "control_type": control_type,
        "mod_desfasurare": rng.choice(["Propriu", "Mixt"]),
        "domeniu_control": domain,
        "categorie_control": category,
        "result": result,
        "echipa": random_team(rng),
        "constatari": constatari,
        "constatari_publice": constatari if result != "sesizare_penala" else "Au fost constatate aspecte care necesita verificari suplimentare potrivit legii.",
        "cuantum_amenda_ron": fine,
        "valoare_amenda_lei": fine,
        "amenda": fine,
        "valoare_prejudiciu_ron": damage,
        "prejudiciu": damage,
        "descriere_abatere": descriere_abatere,
        "masuri_dispuse": masuri_dispuse,
        "masuri_publice": masuri_dispuse,
        "act_normativ": act_normativ,
        "articol": articol,
        "confiscari": "material lemnos evaluat" if damage and rng.random() < 0.35 else "",
        "masuri_complementare": [masuri_dispuse] if masuri_dispuse else [],
        "este_sesizare": is_petition,
        "numar_sesizare": petition_no,
        "nume_petitionar": petitioner,
        "data_sesizare": petition_date.isoformat() if petition_date else "",
        "data_inregistrare_sesizare": petition_date.isoformat() if petition_date else "",
        "obiect_sesizare": petition_subject,
        "descriere_sesizare": petition_subject,
        "sesizare_confirmata": is_petition and result_problem(result),
    }

    return payload, created_at, control_type, result


def get_seed_user(db) -> User | None:
    return db.scalar(
        select(User)
        .where(User.role.in_(["inspector_general", "admin"]))
        .order_by(User.id)
        .limit(1)
    )


def looks_like_local_environment() -> bool:
    env = (os.getenv("GFN_ENV") or os.getenv("ENVIRONMENT") or "").lower()
    if env in {"local", "dev", "development", "demo"}:
        return True
    if getattr(settings, "DEV_CREATE_IG", False):
        return True
    database_url = settings.DATABASE_URL.lower()
    return any(marker in database_url for marker in ["localhost", "127.0.0.1", "@db:", "@gfn-db"])


def reset_controls_if_requested(db, user: User) -> None:
    if not DEMO_RESET:
        return

    print("")
    print("ATENTIE: GFN_DEMO_RESET=true este activ.")
    print("Scriptul va marca soft-delete doar controalele demo active inainte de seed.")

    if not looks_like_local_environment():
        raise RuntimeError(
            "Resetul demo este permis doar in mediu local/dev. "
            "Seteaza GFN_ENV=local doar daca rulezi intentionat pe mediul local."
        )

    now = datetime.now()
    result = db.execute(
        update(Control)
        .where(Control.deleted_at.is_(None))
        .where(
            or_(
                Control.payload.op("->>")("demo_seed") == "true",
                Control.payload.op("->>")("fake") == "true",
                Control.payload.op("->>")("fake_batch").isnot(None),
            )
        )
        .values(deleted_at=now, deleted_by_user_id=user.id)
    )
    print(f"Controale demo marcate deleted_at: {result.rowcount or 0}")


def validate_generated_payload(payload: dict[str, Any], guard: GuardGeometry) -> tuple[bool, bool]:
    gps = payload.get("gps") or {}
    lat = gps.get("lat")
    lon = gps.get("lon")
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return False, False
    in_romania = is_inside_romania(float(lat), float(lon))
    in_guard = point_in_multipolygon(float(lon), float(lat), guard.polygons)
    required = [
        payload.get("garda"),
        payload.get("judet"),
        payload.get("localitate"),
        payload.get("domeniu_control"),
        payload.get("categorie_control"),
    ]
    return bool(in_romania and in_guard and all(required)), not in_romania


def main() -> None:
    rng = random.Random(os.getenv("GFN_DEMO_SEED", "gfn-demo-controls"))
    guards = load_guard_geometries()
    counts = distribute_controls(guards, DEMO_COUNT)
    guard_by_name = {guard.display_name: guard for guard in guards}

    print(f"GeoJSON incarcat: {len(guards)} garzi din {GARZI_GEOJSON_PATH}")
    print(f"Controale de creat: {DEMO_COUNT}")
    print(f"Perioada demo: {DEMO_START_DATE} - {DEMO_END_DATE or date.today().isoformat()}")
    print(f"Batch demo: {DEMO_BATCH}")

    with SessionLocal() as db:
        user = get_seed_user(db)
        if not user:
            print("")
            print("EROARE: Nu exista user cu rol inspector_general sau admin.")
            print("Creeaza/aproba un utilizator admin/inspector_general inainte de seed.")
            return

        print(f"User seed: id={user.id}, email={user.email}, role={user.role}")
        reset_controls_if_requested(db, user)

        created = 0
        valid_coordinates = 0
        outside_romania = 0
        controls: list[Control] = []
        for guard_name, count in sorted(counts.items()):
            guard = guard_by_name[guard_name]
            for _ in range(count):
                created += 1
                payload, created_at, control_type, result = build_payload(created, guard, rng)
                is_valid, is_outside = validate_generated_payload(payload, guard)
                if is_valid:
                    valid_coordinates += 1
                if is_outside:
                    outside_romania += 1
                controls.append(
                    Control(
                        created_at=created_at,
                        created_by_user_id=user.id,
                        result=result,
                        control_type=control_type,
                        payload=payload,
                    )
                )

                if len(controls) >= 250:
                    db.add_all(controls)
                    db.flush()
                    controls.clear()
                    print(f"{created}/{DEMO_COUNT} controale demo pregatite...")

        if controls:
            db.add_all(controls)
            db.flush()

        db.commit()

    print("")
    print(f"Total controale generate: {created}")
    print(f"Coordonate valide: {valid_coordinates}")
    print(f"In afara Romaniei: {outside_romania}")
    print("Distributie pe garzi:")
    for guard_name, count in sorted(counts.items()):
        print(f"- {guard_name}: {count}")


if __name__ == "__main__":
    main()
