import csv
import unicodedata
from io import StringIO
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select, func, Integer, Float, or_
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.control import Control
from app.models.control_audit_log import ControlAuditLog
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.control import ControlCreate, ControlOut, ControlUpdate

router = APIRouter(prefix="/controls", tags=["controls"])


ADMIN_ROLES = (
    "admin",
    "inspector_general",
    "ministru",
    "inspector_sef",
    "director_national",
)

CONTROL_REPORT_UPLOAD_DIR = Path(__file__).resolve().parents[1] / "uploads" / "control_reports"
MAX_REPORT_PDF_BYTES = 20 * 1024 * 1024


def strip_text_diacritics(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_payload_text(value: Any) -> Any:
    if isinstance(value, str):
        return value

    if isinstance(value, list):
        return [normalize_payload_text(item) for item in value]

    if isinstance(value, dict):
        return {key: normalize_payload_text(item) for key, item in value.items()}

    return value


def normalize_identity(value: Any) -> str:
    if value in (None, ""):
        return ""
    value = strip_text_diacritics(str(value)).lower().strip()
    return " ".join(value.replace("_", " ").replace("-", " ").split())


def user_full_name(user: User) -> str:
    return f"{user.last_name or ''} {user.first_name or ''}".strip()


def user_identity_tokens(user: User) -> set[str]:
    tokens = {
        normalize_identity(user.email),
        normalize_identity(user_full_name(user)),
        normalize_identity(f"{user.first_name or ''} {user.last_name or ''}".strip()),
        normalize_identity(user.first_name),
        normalize_identity(user.last_name),
    }
    return {token for token in tokens if token}


def payload_value(payload: dict, *keys, default=None):
    """
    Cauta o valoare in payload folosind mai multe denumiri posibile.
    Util pentru compatibilitate cu formulare vechi/noi.
    """
    if not isinstance(payload, dict):
        return default

    for key in keys:
        value = payload.get(key)
        if value not in (None, ""):
            return value

    return default


def parse_payload_date(value: Any) -> Optional[date]:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if value in (None, ""):
        return None
    raw = str(value).strip()
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw[:10], fmt).date()
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
    except Exception:
        return None


def get_control_field_date(control: Control) -> Optional[date]:
    payload = control.payload or {}
    return parse_payload_date(payload_value(payload, "data_control")) or (
        control.created_at.date() if control.created_at else None
    )


def get_control_start_date(control: Control) -> Optional[date]:
    payload = control.payload or {}
    return (
        parse_payload_date(
            payload_value(
                payload,
                "field_submitted_at",
                "data_transmitere_teren",
                "data_trimitere_teren",
                "submitted_at",
            )
        )
        or parse_payload_date(payload_value(payload, "data_control"))
        or (control.created_at.date() if control.created_at else None)
    )


def get_report_status(control: Control) -> str:
    return "finalizat" if control.report_uploaded_at else "fara_raport"


def get_days_to_report(control: Control) -> Optional[int]:
    start_date = get_control_start_date(control)
    if not start_date:
        return None
    final_date = control.report_uploaded_at.date() if control.report_uploaded_at else date.today()
    return max(0, (final_date - start_date).days)


def get_days_since_field(control: Control) -> Optional[int]:
    return get_days_to_report(control)


def get_response_time_level(control: Control) -> str:
    if control.report_uploaded_at:
        return "finalizat"
    days = get_days_to_report(control)
    if days is None or days <= 5:
        return "green"
    if days <= 10:
        return "yellow"
    return "red"


def get_deadline_status(control: Control) -> str:
    if control.report_uploaded_at:
        return "finalizat"
    days = get_days_to_report(control)
    if days is None or days <= 5:
        return "in_termen"
    if days <= 10:
        return "atentie"
    return "intarziat"


def get_control_team(payload: dict) -> list[dict[str, str]]:
    raw_team = payload_value(payload, "echipa", default=[]) or []
    if not isinstance(raw_team, list):
        raw_team = [raw_team]
    team = []
    for item in raw_team:
        if isinstance(item, dict):
            team.append({
                "nume": str(item.get("nume") or item.get("name") or "").strip(),
                "email": str(item.get("email") or "").strip(),
            })
        elif item not in (None, ""):
            team.append({"nume": str(item).strip(), "email": ""})
    return team


def control_matches_user(control: Control, user: User) -> bool:
    if user.role in ADMIN_ROLES:
        return True
    if control.created_by_user_id == user.id:
        return True

    tokens = user_identity_tokens(user)
    for member in get_control_team(control.payload or {}):
        member_tokens = {
            normalize_identity(member.get("email")),
            normalize_identity(member.get("nume")),
        }
        if tokens.intersection({token for token in member_tokens if token}):
            return True

    return False


def require_control_report_access(control: Control, user: User):
    if not control or control.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Control not found")
    if not control_matches_user(control, user):
        raise HTTPException(status_code=403, detail="Nu ai acces la raportul acestui control.")


def safe_report_storage_name(control_id: int) -> str:
    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
    return f"control_{control_id}_{stamp}.pdf"


def report_file_on_disk(control: Control) -> Path:
    if not control.report_file_path:
        raise HTTPException(status_code=404, detail="Raportul PDF nu exista.")
    filename = Path(control.report_file_path).name
    path = (CONTROL_REPORT_UPLOAD_DIR / filename).resolve()
    upload_root = CONTROL_REPORT_UPLOAD_DIR.resolve()
    if upload_root not in path.parents and path != upload_root:
        raise HTTPException(status_code=400, detail="Cale fisier raport invalida.")
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Fisierul raportului nu exista pe server.")
    return path


def report_url(control: Control) -> Optional[str]:
    return f"/controls/{control.id}/report" if control.report_uploaded_at and control.report_file_path else None


def serialize_control_report(control: Control, user: User) -> dict:
    payload = control.payload or {}
    field_date = get_control_field_date(control)
    start_date = get_control_start_date(control)
    days = get_days_to_report(control)
    status = get_report_status(control)
    deadline = get_deadline_status(control)
    has_report = bool(control.report_uploaded_at)
    return {
        "id": control.id,
        "created_at": control.created_at.isoformat() if control.created_at else None,
        "field_submitted_at": start_date.isoformat() if start_date else None,
        "data_control": field_date.isoformat() if field_date else payload.get("data_control"),
        "garda": payload.get("garda"),
        "localitate": payload.get("localitate"),
        "entitate_controlata": payload.get("entitate_controlata"),
        "control_type": control.control_type,
        "categorie_control": get_categorie_control(payload),
        "domeniu_control": get_domeniu_control(payload),
        "result": control.result,
        "echipa": get_control_team(payload),
        "days_since_field": days,
        "days_to_report": days,
        "has_report": has_report,
        "deadline_status": deadline,
        "report_status": status,
        "response_time_level": get_response_time_level(control),
        "report_uploaded_at": control.report_uploaded_at.isoformat() if control.report_uploaded_at else None,
        "report_original_filename": control.report_original_filename,
        "report_number": control.report_number,
        "report_date": control.report_date.isoformat() if control.report_date else None,
        "report_notes": control.report_notes,
        "report_url": report_url(control),
        "is_overdue": not has_report and (days or 0) > 10,
        "can_upload_report": control_matches_user(control, user),
    }


def gps_value(payload: dict, axis: str):
    """
    Citeste coordonate GPS atat din payload["gps"], cat si din campuri plate.
    axis: "lat" sau "lon".
    """
    if not isinstance(payload, dict):
        return None

    gps = payload.get("gps") or {}
    if not isinstance(gps, dict):
        gps = {}

    if axis == "lat":
        return (
            payload_value(payload, "lat", "latitude")
            or gps.get("lat")
            or gps.get("latitude")
        )

    return (
        payload_value(payload, "lon", "lng", "longitude")
        or gps.get("lon")
        or gps.get("lng")
        or gps.get("longitude")
    )


def normalize_number(value):
    """
    Transforma valori de tip 5000, 5000.50, 5000,50, 5.000, 5.000 RON in float.
    """
    if value in (None, ""):
        return None

    try:
        if isinstance(value, str):
            value = (
                value
                .replace("RON", "")
                .replace("ron", "")
                .replace("lei", "")
                .replace("LEI", "")
                .strip()
            )

            if "." in value and "," in value:
                value = value.replace(".", "").replace(",", ".")
            elif "," in value:
                value = value.replace(",", ".")
            elif value.count(".") == 1:
                left, right = value.split(".")
                if len(right) == 3 and left.isdigit() and right.isdigit():
                    value = left + right

        return float(value)
    except Exception:
        return None


def get_domeniu_control(payload: dict):
    return payload_value(
        payload,
        "domeniu_control",
        "domeniu",
        "control_domain",
        "domain",
    )


def get_categorie_control(payload: dict):
    return payload_value(
        payload,
        "categorie_control",
        "categoria_controlului",
        "control_category",
        "categorie",
        "category",
    )


def get_cuantum_amenda(payload: dict):
    return normalize_number(
        payload_value(
            payload,
            "cuantum_amenda_ron",
            "cuantum_amenda",
            "amenda_ron",
            "valoare_amenda",
            "valoare_amenda_ron",
            "amenda",
        )
    )


def get_valoare_prejudiciu(payload: dict):
    return normalize_number(
        payload_value(
            payload,
            "valoare_prejudiciu_ron",
            "prejudiciu_ron",
            "valoare_prejudiciu",
            "prejudiciu",
        )
    )


def get_descriere_abatere(payload: dict):
    return payload_value(
        payload,
        "descriere_abatere",
        "descriere_fapta",
        "abatere",
        "fapta",
    )


def get_masuri_dispuse(payload: dict):
    return payload_value(
        payload,
        "masuri_dispuse",
        "masuri",
        "masuri_aplicate",
    )


def get_numar_sesizare(payload: dict):
    return payload_value(
        payload,
        "numar_sesizare",
        "numar_petitie",
        "nr_sesizare",
        "nr_petitie",
        "sesizare_numar",
        "petitie_numar",
    )


def get_nume_petitionar(payload: dict):
    return payload_value(
        payload,
        "nume_petitionar",
        "nume_petent",
        "petitionar",
        "petent",
        "nume_sesizant",
        "sesizant",
    )


def get_este_sesizare(payload: dict, control_type: Optional[str] = None):
    return bool(
        payload_value(payload, "este_sesizare")
        or get_numar_sesizare(payload)
        or control_type == "sesizare"
        or payload_value(payload, "control_type") == "sesizare"
    )


def control_to_dict(control: Control) -> dict:
    return {
        "id": control.id,
        "created_at": control.created_at.isoformat() if control.created_at else None,
        "created_by_user_id": control.created_by_user_id,
        "result": control.result,
        "control_type": control.control_type,
        "payload": control.payload,
        "deleted_at": control.deleted_at.isoformat() if control.deleted_at else None,
        "deleted_by_user_id": control.deleted_by_user_id,
        "report_file_path": control.report_file_path,
        "report_original_filename": control.report_original_filename,
        "report_uploaded_at": control.report_uploaded_at.isoformat() if control.report_uploaded_at else None,
        "report_uploaded_by_user_id": control.report_uploaded_by_user_id,
        "report_number": control.report_number,
        "report_date": control.report_date.isoformat() if control.report_date else None,
        "report_notes": control.report_notes,
    }


def add_audit_log(
    db: Session,
    control_id: int,
    action: str,
    user_id: int,
    old_data: Optional[dict] = None,
    new_data: Optional[dict] = None,
):
    log = ControlAuditLog(
        control_id=control_id,
        action=action,
        user_id=user_id,
        old_data=old_data,
        new_data=new_data,
    )
    db.add(log)


def apply_control_filters(
    stmt,
    u: User,
    garda: Optional[str] = None,
    judet: Optional[str] = None,
    result: Optional[str] = None,
    control_type: Optional[str] = None,
    domeniu: Optional[str] = None,
    tip_entitate: Optional[str] = None,
    data_from: Optional[date] = None,
    data_to: Optional[date] = None,
):
    stmt = stmt.where(Control.deleted_at.is_(None))

    if u.role not in ADMIN_ROLES:
        stmt = stmt.where(Control.created_by_user_id == u.id)

    if result:
        stmt = stmt.where(Control.result == result)

    if control_type:
        stmt = stmt.where(Control.control_type == control_type)

    if garda:
        stmt = stmt.where(Control.payload["garda"].astext == garda)

    if judet:
        stmt = stmt.where(Control.payload["judet"].astext == judet)

    if domeniu:
        stmt = stmt.where(
            or_(
                Control.payload["domeniu"].astext == domeniu,
                Control.payload["domeniu_control"].astext == domeniu,
                Control.payload["control_domain"].astext == domeniu,
            )
        )

    if tip_entitate:
        stmt = stmt.where(Control.payload["tip_entitate"].astext == tip_entitate)

    if data_from:
        stmt = stmt.where(Control.payload["data_control"].astext >= data_from.isoformat())

    if data_to:
        stmt = stmt.where(Control.payload["data_control"].astext <= data_to.isoformat())

    return stmt


@router.post("", response_model=ControlOut, status_code=201)
def create_control(
    body: ControlCreate,
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    control = Control(
        created_by_user_id=u.id,
        result=body.result,
        control_type=body.control_type,
        payload=normalize_payload_text(body.payload.model_dump(mode="json")),
    )

    db.add(control)
    db.flush()

    add_audit_log(
        db=db,
        control_id=control.id,
        action="created",
        user_id=u.id,
        old_data=None,
        new_data=control_to_dict(control),
    )

    db.commit()
    db.refresh(control)

    return control


@router.get("", response_model=list[ControlOut])
def list_controls(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    control_type: Optional[str] = Query(None),
    domeniu: Optional[str] = Query(None),
    tip_entitate: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    stmt = select(Control).order_by(Control.id.desc())

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        judet=judet,
        result=result,
        control_type=control_type,
        domeniu=domeniu,
        tip_entitate=tip_entitate,
        data_from=data_from,
        data_to=data_to,
    )

    stmt = stmt.limit(limit).offset(offset)

    rows = db.scalars(stmt).all()
    return rows


@router.get("/paginated")
def list_controls_paginated(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    control_type: Optional[str] = Query(None),
    domeniu: Optional[str] = Query(None),
    tip_entitate: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    base_stmt = select(Control)

    base_stmt = apply_control_filters(
        stmt=base_stmt,
        u=u,
        garda=garda,
        judet=judet,
        result=result,
        control_type=control_type,
        domeniu=domeniu,
        tip_entitate=tip_entitate,
        data_from=data_from,
        data_to=data_to,
    )

    total_stmt = select(func.count()).select_from(base_stmt.subquery())
    total = db.execute(total_stmt).scalar_one()

    items_stmt = base_stmt.order_by(Control.id.desc()).limit(limit).offset(offset)
    items = db.scalars(items_stmt).all()

    return {
        "total": int(total or 0),
        "limit": limit,
        "offset": offset,
        "items": items,
    }


@router.get("/export/csv")
def export_controls_csv(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    control_type: Optional[str] = Query(None),
    domeniu: Optional[str] = Query(None),
    tip_entitate: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    stmt = select(Control).order_by(Control.id.desc())

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        judet=judet,
        result=result,
        control_type=control_type,
        domeniu=domeniu,
        tip_entitate=tip_entitate,
        data_from=data_from,
        data_to=data_to,
    )

    rows = db.scalars(stmt).all()

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "id",
        "created_at",
        "created_by_user_id",
        "result",
        "control_type",
        "data_control",
        "judet",
        "garda",
        "localitate",
        "reper",
        "entitate_controlata",
        "tip_entitate",
        "domeniu_control",
        "categorie_control",
        "cuantum_amenda_ron",
        "valoare_prejudiciu_ron",
        "descriere_abatere",
        "masuri_dispuse",
        "este_sesizare",
        "numar_sesizare",
        "nume_petitionar",
        "lat",
        "lon",
        "constatari",
    ])

    for row in rows:
        payload = row.payload or {}

        writer.writerow([
            row.id,
            row.created_at.isoformat() if row.created_at else "",
            row.created_by_user_id,
            row.result,
            row.control_type,
            payload.get("data_control", ""),
            payload.get("judet", ""),
            payload.get("garda", ""),
            payload.get("localitate", ""),
            payload.get("reper", ""),
            payload.get("entitate_controlata", ""),
            payload.get("tip_entitate", ""),
            get_domeniu_control(payload) or "",
            get_categorie_control(payload) or "",
            get_cuantum_amenda(payload),
            get_valoare_prejudiciu(payload),
            get_descriere_abatere(payload) or "",
            get_masuri_dispuse(payload) or "",
            get_este_sesizare(payload, row.control_type),
            get_numar_sesizare(payload) or "",
            get_nume_petitionar(payload) or "",
            gps_value(payload, "lat") or "",
            gps_value(payload, "lon") or "",
            payload.get("constatari", ""),
        ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=controale_gfn.csv"
        },
    )


@router.get("/stats/by-garda")
def stats_by_garda(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    garda_expr = Control.payload.op("->>")("garda")
    amenda_expr = Control.payload.op("->>")("amenda")
    prejudiciu_expr = Control.payload.op("->>")("prejudiciu")
    data_control_expr = Control.payload.op("->>")("data_control")

    stmt = select(
        garda_expr.label("garda"),
        func.count(Control.id).label("total"),
        func.coalesce(func.sum((Control.result == "conform").cast(Integer)), 0).label("conform"),
        func.coalesce(func.sum((Control.result == "neconform").cast(Integer)), 0).label("neconform"),
        func.coalesce(func.sum((Control.result == "sanctiune").cast(Integer)), 0).label("sanctiune"),
        func.coalesce(func.sum(amenda_expr.cast(Float)), 0).label("amenzi_total"),
        func.coalesce(func.sum(prejudiciu_expr.cast(Float)), 0).label("prejudiciu_total"),
    ).group_by(garda_expr)

    if u.role not in ADMIN_ROLES:
        stmt = stmt.where(Control.created_by_user_id == u.id)

    stmt = stmt.where(Control.deleted_at.is_(None))

    if data_from:
        stmt = stmt.where(data_control_expr >= data_from.isoformat())

    if data_to:
        stmt = stmt.where(data_control_expr <= data_to.isoformat())

    rows = db.execute(stmt).all()

    return [
        {
            "garda": row.garda,
            "total": int(row.total or 0),
            "conform": int(row.conform or 0),
            "neconform": int(row.neconform or 0),
            "sanctiune": int(row.sanctiune or 0),
            "amenzi_total": float(row.amenzi_total or 0),
            "prejudiciu_total": float(row.prejudiciu_total or 0),
        }
        for row in rows
    ]


@router.get("/stats/summary")
def stats_summary(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    control_type: Optional[str] = Query(None),
    domeniu: Optional[str] = Query(None),
    tip_entitate: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    amenda_expr = Control.payload.op("->>")("amenda")
    prejudiciu_expr = Control.payload.op("->>")("prejudiciu")

    stmt = select(
        func.count(Control.id).label("total_controale"),
        func.coalesce(func.sum((Control.result == "conform").cast(Integer)), 0).label("conforme"),
        func.coalesce(func.sum((Control.result == "neconform").cast(Integer)), 0).label("neconforme"),
        func.coalesce(func.sum((Control.result == "avertisment").cast(Integer)), 0).label("avertismente"),
        func.coalesce(func.sum((Control.result == "sanctiune").cast(Integer)), 0).label("sanctiuni"),
        func.coalesce(func.sum((Control.result == "sesizare_penala").cast(Integer)), 0).label("sesizari_penale"),
        func.coalesce(func.sum(amenda_expr.cast(Float)), 0).label("amenzi_total"),
        func.coalesce(func.sum(prejudiciu_expr.cast(Float)), 0).label("prejudiciu_total"),
    )

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        judet=judet,
        result=result,
        control_type=control_type,
        domeniu=domeniu,
        tip_entitate=tip_entitate,
        data_from=data_from,
        data_to=data_to,
    )

    row = db.execute(stmt).one()

    return {
        "total_controale": int(row.total_controale or 0),
        "conforme": int(row.conforme or 0),
        "neconforme": int(row.neconforme or 0),
        "avertismente": int(row.avertismente or 0),
        "sanctiuni": int(row.sanctiuni or 0),
        "sesizari_penale": int(row.sesizari_penale or 0),
        "amenzi_total": float(row.amenzi_total or 0),
        "prejudiciu_total": float(row.prejudiciu_total or 0),
    }


@router.get("/stats/by-judet")
def stats_by_judet(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    judet_expr = Control.payload.op("->>")("judet")
    amenda_expr = Control.payload.op("->>")("amenda")
    prejudiciu_expr = Control.payload.op("->>")("prejudiciu")

    stmt = select(
        judet_expr.label("judet"),
        func.count(Control.id).label("total"),
        func.coalesce(func.sum((Control.result == "conform").cast(Integer)), 0).label("conform"),
        func.coalesce(func.sum((Control.result == "neconform").cast(Integer)), 0).label("neconform"),
        func.coalesce(func.sum((Control.result == "sanctiune").cast(Integer)), 0).label("sanctiune"),
        func.coalesce(func.sum(amenda_expr.cast(Float)), 0).label("amenzi_total"),
        func.coalesce(func.sum(prejudiciu_expr.cast(Float)), 0).label("prejudiciu_total"),
    ).group_by(judet_expr)

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        data_from=data_from,
        data_to=data_to,
    )

    rows = db.execute(stmt).all()

    return [
        {
            "judet": row.judet,
            "total": int(row.total or 0),
            "conform": int(row.conform or 0),
            "neconform": int(row.neconform or 0),
            "sanctiune": int(row.sanctiune or 0),
            "amenzi_total": float(row.amenzi_total or 0),
            "prejudiciu_total": float(row.prejudiciu_total or 0),
        }
        for row in rows
    ]


@router.get("/stats/by-result")
def stats_by_result(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    stmt = select(
        Control.result.label("result"),
        func.count(Control.id).label("total"),
    ).group_by(Control.result)

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        judet=judet,
        data_from=data_from,
        data_to=data_to,
    )

    rows = db.execute(stmt).all()

    return [
        {
            "result": row.result,
            "total": int(row.total or 0),
        }
        for row in rows
    ]


@router.get("/stats/by-month")
def stats_by_month(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    data_control_expr = Control.payload.op("->>")("data_control")
    month_expr = func.substr(data_control_expr, 1, 7)

    stmt = select(
        month_expr.label("month"),
        func.count(Control.id).label("total"),
        func.coalesce(func.sum((Control.result == "conform").cast(Integer)), 0).label("conform"),
        func.coalesce(func.sum((Control.result == "neconform").cast(Integer)), 0).label("neconform"),
        func.coalesce(func.sum((Control.result == "sanctiune").cast(Integer)), 0).label("sanctiune"),
    ).group_by(month_expr).order_by(month_expr)

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        judet=judet,
        result=result,
        data_from=data_from,
        data_to=data_to,
    )

    rows = db.execute(stmt).all()

    return [
        {
            "month": row.month,
            "total": int(row.total or 0),
            "conform": int(row.conform or 0),
            "neconform": int(row.neconform or 0),
            "sanctiune": int(row.sanctiune or 0),
        }
        for row in rows
    ]


@router.get("/stats/by-control-type")
def stats_by_control_type(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    stmt = select(
        Control.control_type.label("control_type"),
        func.count(Control.id).label("total"),
        func.coalesce(func.sum((Control.result == "conform").cast(Integer)), 0).label("conform"),
        func.coalesce(func.sum((Control.result == "neconform").cast(Integer)), 0).label("neconform"),
        func.coalesce(func.sum((Control.result == "avertisment").cast(Integer)), 0).label("avertisment"),
        func.coalesce(func.sum((Control.result == "sanctiune").cast(Integer)), 0).label("sanctiune"),
        func.coalesce(func.sum((Control.result == "sesizare_penala").cast(Integer)), 0).label("sesizare_penala"),
    ).group_by(Control.control_type)

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        judet=judet,
        result=result,
        data_from=data_from,
        data_to=data_to,
    )

    rows = db.execute(stmt).all()

    return [
        {
            "control_type": row.control_type,
            "total": int(row.total or 0),
            "conform": int(row.conform or 0),
            "neconform": int(row.neconform or 0),
            "avertisment": int(row.avertisment or 0),
            "sanctiune": int(row.sanctiune or 0),
            "sesizare_penala": int(row.sesizare_penala or 0),
        }
        for row in rows
    ]


@router.get("/stats/by-inspector")
def stats_by_inspector(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    control_type: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    stmt = select(Control)

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        judet=judet,
        result=result,
        control_type=control_type,
        data_from=data_from,
        data_to=data_to,
    )

    controls = db.scalars(stmt).all()

    inspector_stats = {}

    for control in controls:
        payload = control.payload or {}
        echipa = payload.get("echipa") or []

        for inspector in echipa:
            nume = inspector.get("nume") or "Necunoscut"
            email = inspector.get("email") or ""

            key = email or nume

            if key not in inspector_stats:
                inspector_stats[key] = {
                    "inspector": nume,
                    "email": email,
                    "total": 0,
                    "conform": 0,
                    "neconform": 0,
                    "avertisment": 0,
                    "sanctiune": 0,
                    "sesizare_penala": 0,
                }

            inspector_stats[key]["total"] += 1

            if control.result in inspector_stats[key]:
                inspector_stats[key][control.result] += 1

    return sorted(
        inspector_stats.values(),
        key=lambda x: x["total"],
        reverse=True,
    )


@router.get("/map")
def map_controls(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    garda: Optional[str] = Query(None),
    judet: Optional[str] = Query(None),
    result: Optional[str] = Query(None),
    control_type: Optional[str] = Query(None),
    domeniu: Optional[str] = Query(None),
    tip_entitate: Optional[str] = Query(None),
    data_from: Optional[date] = Query(None),
    data_to: Optional[date] = Query(None),
):
    stmt = select(Control).order_by(Control.id.desc())

    stmt = apply_control_filters(
        stmt=stmt,
        u=u,
        garda=garda,
        judet=judet,
        result=result,
        control_type=control_type,
        domeniu=domeniu,
        tip_entitate=tip_entitate,
        data_from=data_from,
        data_to=data_to,
    )

    rows = db.scalars(stmt).all()

    items = []
    for row in rows:
        payload = row.payload or {}

        lat = gps_value(payload, "lat")
        lon = gps_value(payload, "lon")

        items.append(
            {
                "id": row.id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "created_by_user_id": row.created_by_user_id,
                "result": row.result,
                "control_type": row.control_type,
                "data_control": payload.get("data_control"),
                "date_start": payload.get("date_start"),
                "date_end": payload.get("date_end"),
                "data_control_original": payload.get("data_control_original"),
                "judet": payload.get("judet"),
                "garda": payload.get("garda"),
                "localitate": payload.get("localitate"),
                "reper": payload.get("reper"),
                "entitate_controlata": payload.get("entitate_controlata"),
                "tip_entitate": payload.get("tip_entitate"),
                "cui": payload.get("cui"),
                "sediu": payload.get("sediu"),
                "reprezentant_nume": payload.get("reprezentant_nume"),
                "reprezentant_calitate": payload.get("reprezentant_calitate"),
                "echipa": payload.get("echipa", []),
                "constatari": payload.get("constatari"),
                "constatare_originala": payload.get("constatare_originala"),
                "lat": lat,
                "lon": lon,
                "ora_control": payload.get("ora_control"),
                "mod_desfasurare": payload.get("mod_desfasurare"),
                "parteneri": payload.get("parteneri", []),
                "initiator": payload.get("initiator"),
                "data_sesizare": payload.get("data_sesizare")
                or payload.get("data_inregistrare_sesizare")
                or payload.get("data_petitie"),
                "obiect_sesizare": payload.get("obiect_sesizare")
                or payload.get("descriere_sesizare")
                or payload.get("rezumat_sesizare")
                or payload.get("continut_sesizare"),

                # campuri noi pentru dashboard, rapoarte si PDF intern
                "domeniu_control": get_domeniu_control(payload),
                "categorie_control": get_categorie_control(payload),
                "cuantum_amenda_ron": get_cuantum_amenda(payload),
                "valoare_prejudiciu_ron": get_valoare_prejudiciu(payload),
                "descriere_abatere": get_descriere_abatere(payload),
                "masuri_dispuse": get_masuri_dispuse(payload),
                "masuri_dispuse_original": payload.get("masuri_dispuse_original"),
                "numar_act_control": payload.get("numar_act_control"),
                "tip_control_original": payload.get("tip_control_original"),
                "result_original": payload.get("result_original"),
                "financial_data_available": payload.get("financial_data_available"),
                "act_normativ": payload.get("act_normativ"),
                "articol": payload.get("articol"),
                "confiscari": payload.get("confiscari"),
                "masuri_complementare": payload.get("masuri_complementare", []),

                # sesizare / petitionar - doar endpoint intern autentificat
                "este_sesizare": get_este_sesizare(payload, row.control_type),
                "numar_sesizare": get_numar_sesizare(payload),
                "nume_petitionar": get_nume_petitionar(payload),

                # raport administrativ intern
                "report_status": get_report_status(row),
                "deadline_status": get_deadline_status(row),
                "days_since_field": get_days_since_field(row),
                "days_to_report": get_days_to_report(row),
                "has_report": bool(row.report_uploaded_at),
                "response_time_level": get_response_time_level(row),
                "field_submitted_at": get_control_start_date(row).isoformat() if get_control_start_date(row) else None,
                "report_uploaded_at": row.report_uploaded_at.isoformat() if row.report_uploaded_at else None,
                "report_original_filename": row.report_original_filename,
                "report_number": row.report_number,
                "report_date": row.report_date.isoformat() if row.report_date else None,
                "report_notes": row.report_notes,
                "report_url": report_url(row),
            }
        )

    return items


@router.get("/my-reports")
def my_control_reports(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
    status: str = Query("toate"),
    garda: Optional[str] = Query(None),
    inspector: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
):
    allowed_statuses = {"toate", "fara_raport", "finalizate", "intarziate"}
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Status raport invalid.")

    stmt = select(Control).where(Control.deleted_at.is_(None)).order_by(Control.id.desc())
    rows = db.scalars(stmt).all()

    items = []
    inspector_filter = normalize_identity(inspector)
    garda_filter = normalize_identity(garda)

    for control in rows:
        if not control_matches_user(control, u):
            continue

        payload = control.payload or {}
        field_date = get_control_field_date(control)

        if date_from and field_date and field_date < date_from:
            continue
        if date_to and field_date and field_date > date_to:
            continue
        if garda_filter and normalize_identity(payload.get("garda")) != garda_filter:
            continue
        if inspector_filter:
            team_text = " ".join(
                f"{member.get('nume', '')} {member.get('email', '')}"
                for member in get_control_team(payload)
            )
            if inspector_filter not in normalize_identity(team_text):
                continue

        item = serialize_control_report(control, u)

        if status == "fara_raport" and item["report_status"] != "fara_raport":
            continue
        if status == "finalizate" and item["report_status"] != "finalizat":
            continue
        if status == "intarziate" and not item["is_overdue"]:
            continue

        items.append(item)

    items.sort(
        key=lambda item: (
            item["report_status"] == "finalizat",
            0 if item["deadline_status"] == "intarziat" else 1 if item["deadline_status"] == "atentie" else 2,
            -(item["days_to_report"] or 0),
        )
    )

    return items


@router.post("/{control_id}/report")
async def upload_control_report(
    control_id: int,
    file: UploadFile = File(...),
    report_number: str = Form(...),
    report_date: date = Form(...),
    report_notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    control = db.get(Control, control_id)
    require_control_report_access(control, u)

    original_name = Path(file.filename or "").name
    if not original_name.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Se accepta doar fisiere PDF.")

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in {"application/pdf", "application/x-pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="Tip fisier invalid. Incarca un PDF.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Fisierul PDF este gol.")
    if len(content) > MAX_REPORT_PDF_BYTES:
        raise HTTPException(status_code=413, detail="Fisierul PDF depaseste limita de 20 MB.")
    if not content.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Fisierul incarcat nu pare a fi PDF valid.")

    CONTROL_REPORT_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    safe_name = safe_report_storage_name(control.id)
    disk_path = (CONTROL_REPORT_UPLOAD_DIR / safe_name).resolve()
    upload_root = CONTROL_REPORT_UPLOAD_DIR.resolve()
    if upload_root not in disk_path.parents:
        raise HTTPException(status_code=400, detail="Cale fisier invalida.")

    disk_path.write_bytes(content)

    old_data = control_to_dict(control)
    control.report_file_path = f"control_reports/{safe_name}"
    control.report_original_filename = original_name
    control.report_uploaded_at = datetime.utcnow()
    control.report_uploaded_by_user_id = u.id
    control.report_number = report_number.strip()
    control.report_date = report_date
    control.report_notes = (report_notes or "").strip() or None

    db.flush()
    add_audit_log(
        db=db,
        control_id=control.id,
        action="report_uploaded",
        user_id=u.id,
        old_data=old_data,
        new_data=control_to_dict(control),
    )
    db.commit()
    db.refresh(control)

    return serialize_control_report(control, u)


@router.get("/{control_id}/report")
def download_control_report(
    control_id: int,
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    control = db.get(Control, control_id)
    require_control_report_access(control, u)

    path = report_file_on_disk(control)
    filename = control.report_original_filename or path.name
    return FileResponse(
        path=path,
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/{control_id}", response_model=ControlOut)
def get_control(
    control_id: int,
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    control = db.get(Control, control_id)

    if not control or control.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Control not found")

    if u.role not in ADMIN_ROLES and control.created_by_user_id != u.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return control


@router.patch("/{control_id}", response_model=ControlOut)
def update_control(
    control_id: int,
    body: ControlUpdate,
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    control = db.get(Control, control_id)

    if not control or control.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Control not found")

    if u.role not in ADMIN_ROLES and control.created_by_user_id != u.id:
        raise HTTPException(status_code=403, detail="Access denied")

    old_data = control_to_dict(control)

    if body.result is not None:
        control.result = body.result

    if body.control_type is not None:
        control.control_type = body.control_type

    if body.payload is not None:
        control.payload = normalize_payload_text(body.payload.model_dump(mode="json"))

    db.flush()

    add_audit_log(
        db=db,
        control_id=control.id,
        action="updated",
        user_id=u.id,
        old_data=old_data,
        new_data=control_to_dict(control),
    )

    db.commit()
    db.refresh(control)

    return control


@router.delete("/{control_id}")
def delete_control(
    control_id: int,
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    control = db.get(Control, control_id)

    if not control or control.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Control not found")

    if u.role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Only admin can delete")

    old_data = control_to_dict(control)

    control.deleted_at = datetime.utcnow()
    control.deleted_by_user_id = u.id

    db.flush()

    add_audit_log(
        db=db,
        control_id=control.id,
        action="deleted",
        user_id=u.id,
        old_data=old_data,
        new_data=control_to_dict(control),
    )

    db.commit()

    return {"message": "Control soft deleted"}
