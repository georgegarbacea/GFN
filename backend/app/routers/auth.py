from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ApproveUserRequest

router = APIRouter(prefix="/auth", tags=["auth"])
pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login-form")


def hash_password(p: str) -> str:
    return pwd.hash(p)


def verify_password(p: str, hp: str) -> bool:
    return pwd.verify(p, hp)


def create_access_token(u: User) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    payload = {
        "sub": str(u.id),
        "role": u.role,
        "email": u.email,
        "exp": exp,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)


# ================= REGISTER =================
@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    email = body.email.lower().strip()

    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email deja inregistrat.")

    u = User(
        email=email,
        hashed_password=hash_password(body.password),
        first_name=body.first_name.strip(),
        last_name=body.last_name.strip(),
        role="inspector",
        is_approved=False,
    )

    db.add(u)
    db.commit()

    return {"message": "Cont creat. Asteapta aprobare."}


# ================= LOGIN =================
@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    u = db.scalar(select(User).where(User.email == email))

    if not u or not verify_password(body.password, u.hashed_password):
        raise HTTPException(status_code=401, detail="Credentiale invalide.")

    if not u.is_approved:
        raise HTTPException(status_code=403, detail="Cont neaprobat inca.")

    return TokenResponse(access_token=create_access_token(u))


@router.post("/login-form", response_model=TokenResponse)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    email = form_data.username.lower().strip()
    u = db.scalar(select(User).where(User.email == email))

    if not u or not verify_password(form_data.password, u.hashed_password):
        raise HTTPException(status_code=401, detail="Credentiale invalide.")

    if not u.is_approved:
        raise HTTPException(status_code=403, detail="Cont neaprobat inca.")

    return TokenResponse(access_token=create_access_token(u))


# ================= AUTH =================
def get_current_user(token: str = Depends(oauth2), db: Session = Depends(get_db)) -> User:
    try:
        data = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
        user_id = int(data["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token invalid.")

    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status_code=401, detail="User inexistent.")

    return u


def require_role(*roles: str):
    def _guard(u: User = Depends(get_current_user)) -> User:
        if u.role not in roles:
            raise HTTPException(status_code=403, detail="Acces interzis.")
        return u
    return _guard


# ================= ME =================
@router.get("/me")
def me(u: User = Depends(get_current_user)):
    return {
        "id": u.id,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "full_name": f"{u.last_name or ''} {u.first_name or ''}".strip(),
        "role": u.role,
        "is_approved": u.is_approved,
    }


# ================= APPROVE =================
@router.post("/approve")
def approve_user(
    body: ApproveUserRequest,
    db: Session = Depends(get_db),
    _ig: User = Depends(require_role("inspector_general", "admin", "ministru")),
):
    u = db.get(User, body.user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User inexistent.")

    u.is_approved = body.is_approved
    u.role = body.role
    db.commit()

    return {"message": "User actualizat."}


# ================= DEV APPROVE =================
@router.post("/dev-approve-user")
def dev_approve_user(
    email: str,
    db: Session = Depends(get_db),
):
    email = email.lower().strip()
    u = db.scalar(select(User).where(User.email == email))

    if not u:
        raise HTTPException(status_code=404, detail="Utilizatorul nu exista.")

    u.is_approved = True

    if not u.role:
        u.role = "inspector"

    db.commit()
    db.refresh(u)

    return {
        "message": "Utilizator aprobat cu succes.",
        "id": u.id,
        "email": u.email,
        "role": u.role,
        "is_approved": u.is_approved,
    }


# ================= DEV SET PASSWORD =================
@router.post("/dev-set-password")
def dev_set_password(
    email: str,
    new_password: str,
    db: Session = Depends(get_db),
):
    email = email.lower().strip()
    u = db.scalar(select(User).where(User.email == email))

    if not u:
        raise HTTPException(status_code=404, detail="Utilizatorul nu exista.")

    u.hashed_password = hash_password(new_password)

    db.commit()
    db.refresh(u)

    return {
        "message": "Parola a fost resetata cu succes.",
        "email": u.email,
    }


# ================= LIST =================
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _ig: User = Depends(require_role("inspector_general", "admin", "ministru")),
):
    rows = db.scalars(select(User).order_by(User.id)).all()

    return [
        {
            "id": r.id,
            "email": r.email,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "full_name": f"{r.last_name or ''} {r.first_name or ''}".strip(),
            "role": r.role,
            "is_approved": r.is_approved,
        }
        for r in rows
    ]


# ================= SEARCH =================
@router.get("/users/search")
def search_users(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    _u: User = Depends(get_current_user),
):
    pattern = f"%{q.strip()}%"

    rows = db.scalars(
        select(User)
        .where(User.is_approved == True)
        .where(
            or_(
                User.email.ilike(pattern),
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
            )
        )
        .order_by(User.last_name, User.first_name)
    ).all()

    return [
        {
            "id": r.id,
            "email": r.email,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "full_name": f"{r.last_name or ''} {r.first_name or ''}".strip(),
            "role": r.role,
        }
        for r in rows
    ]
@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    users = db.query(User).filter(User.is_approved == True).all()

    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role
        }
        for u in users
    ]