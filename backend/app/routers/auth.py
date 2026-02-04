from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, ApproveUserRequest

router = APIRouter(prefix="/auth", tags=["auth"])
pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

def hash_password(p: str) -> str:
    return pwd.hash(p)

def verify_password(p: str, hp: str) -> bool:
    return pwd.verify(p, hp)

def create_access_token(u: User) -> str:
    exp = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    payload = {"sub": str(u.id), "role": u.role, "email": u.email, "exp": exp}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALG)

@router.post("/register", status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email deja înregistrat.")
    u = User(email=email, hashed_password=hash_password(body.password), role="inspector", is_approved=False)
    db.add(u)
    db.commit()
    return {"message": "Cont creat. Așteaptă aprobare."}

@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    email = body.email.lower()
    u = db.scalar(select(User).where(User.email == email))
    if not u or not verify_password(body.password, u.hashed_password):
        raise HTTPException(status_code=401, detail="Credențiale invalide.")
    if not u.is_approved:
        raise HTTPException(status_code=403, detail="Cont neaprobat încă.")
    return TokenResponse(access_token=create_access_token(u))

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

@router.get("/me")
def me(u: User = Depends(get_current_user)):
    return {"id": u.id, "email": u.email, "role": u.role, "is_approved": u.is_approved}

@router.post("/approve")
def approve_user(
    body: ApproveUserRequest,
    db: Session = Depends(get_db),
    _ig: User = Depends(require_role("inspector_general", "admin")),
):
    u = db.get(User, body.user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User inexistent.")
    u.is_approved = body.is_approved
    u.role = body.role
    db.commit()
    return {"message": "User actualizat."}

@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    _ig: User = Depends(require_role("inspector_general", "admin")),
):
    rows = db.scalars(select(User).order_by(User.id)).all()
    return [{"id": r.id, "email": r.email, "role": r.role, "is_approved": r.is_approved} for r in rows]
