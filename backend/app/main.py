from fastapi import FastAPI
from sqlalchemy import select
from passlib.context import CryptContext

from app.core.db import Base, engine, SessionLocal
from app.core.config import settings
from app.models.user import User  # IMPORTANT: import models to register tables
from app.models.control import Control  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.controls import router as controls_router

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

app = FastAPI(title="GFN Portal API (MVP)")

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

    # DEV: creează automat un Inspector General (local)
    if settings.DEV_CREATE_IG:
        db = SessionLocal()
        try:
            email = settings.DEV_IG_EMAIL.lower()
            existing = db.scalar(select(User).where(User.email == email))
            if not existing:
                u = User(
                    email=email,
                    hashed_password=pwd.hash(settings.DEV_IG_PASSWORD),
                    role="inspector_general",
                    is_approved=True,
                )
                db.add(u)
                db.commit()
        finally:
            db.close()

app.include_router(auth_router)
app.include_router(controls_router)

@app.get("/health")
def health():
    return {"status": "ok"}
