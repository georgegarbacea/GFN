from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.core.db import get_db
from app.models.control import Control
from app.schemas.control import ControlCreate, ControlOut
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/controls", tags=["controls"])

@router.post("", response_model=ControlOut, status_code=201)
def create_control(
    body: ControlCreate,
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    c = Control(
        created_by_user_id=u.id,
        result=body.result,
        control_type=body.control_type,
        payload=body.payload,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return ControlOut(id=c.id, result=c.result, control_type=c.control_type, payload=c.payload)

@router.get("")
def list_controls(
    db: Session = Depends(get_db),
    u: User = Depends(get_current_user),
):
    # MVP: inspector vede doar ce a creat; IG vede tot
    stmt = select(Control).order_by(Control.id.desc())
    if u.role not in ("inspector_general", "admin", "director_national"):
        stmt = stmt.where(Control.created_by_user_id == u.id)

    rows = db.scalars(stmt).all()
    return [{
        "id": r.id,
        "created_at": r.created_at.isoformat(),
        "created_by_user_id": r.created_by_user_id,
        "result": r.result,
        "control_type": r.control_type
    } for r in rows]
