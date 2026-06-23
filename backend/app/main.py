from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from passlib.context import CryptContext

from app.core.config import settings
from app.core.db import Base, engine, SessionLocal
from app.models.user import User
from app.models.control import Control  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.controls import router as controls_router
from app.routers.public_controls import router as public_controls_router

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

app = FastAPI(title="GFN Portal API (MVP)")

UI_DIR = Path(__file__).resolve().parent / "ui"

# expune fisierele statice din /ui
app.mount("/ui", StaticFiles(directory=str(UI_DIR)), name="ui")


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

    # creeaza automat userul Inspector General daca nu exista deja
    if settings.DEV_CREATE_IG:
        db = SessionLocal()
        try:
            email = settings.DEV_IG_EMAIL.lower().strip()
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


# rute API
app.include_router(auth_router)
app.include_router(controls_router)
app.include_router(public_controls_router)


@app.get("/")
def root():
    return {
        "app": "GFN Portal API",
        "status": "ok",
        "docs": "/docs",
        "map": "/map",
        "control_form": "/control-form",
        "public_controls_map": "/public/controls/map",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/map")
def map_page():
    return FileResponse(UI_DIR / "map.html")


@app.get("/control-form")
def control_form_page():
    return FileResponse(UI_DIR / "control_form.html")


@app.get("/approve-users")
def approve_users_page():
    return FileResponse(UI_DIR / "approve_users.html")