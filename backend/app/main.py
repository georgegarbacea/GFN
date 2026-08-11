from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from sqlalchemy import text
from passlib.context import CryptContext

from app.core.config import settings
from app.core.db import Base, engine, SessionLocal
from app.models.user import User
from app.models.control import Control  # noqa: F401
from app.routers.auth import router as auth_router
from app.routers.controls import router as controls_router
from app.routers.public_controls import router as public_controls_router

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

app = FastAPI(
    title="GFN Portal API",
    docs_url="/docs" if settings.ENABLE_API_DOCS else None,
    redoc_url="/redoc" if settings.ENABLE_API_DOCS else None,
    openapi_url="/openapi.json" if settings.ENABLE_API_DOCS else None,
)

UI_DIR = Path(__file__).resolve().parent / "ui"
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads" / "control_reports"

# expune fisierele statice din /ui
app.mount("/ui", StaticFiles(directory=str(UI_DIR)), name="ui")


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(self), payment=(), usb=()"
    )
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

    if request.url.path.startswith(("/auth", "/controls", "/public")):
        response.headers["Cache-Control"] = "no-store"

    if settings.ENABLE_HSTS:
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

    return response


def ensure_control_report_columns():
    statements = [
        "ALTER TABLE controls ADD COLUMN IF NOT EXISTS report_file_path VARCHAR(500)",
        "ALTER TABLE controls ADD COLUMN IF NOT EXISTS report_original_filename VARCHAR(255)",
        "ALTER TABLE controls ADD COLUMN IF NOT EXISTS report_uploaded_at TIMESTAMP",
        "ALTER TABLE controls ADD COLUMN IF NOT EXISTS report_uploaded_by_user_id INTEGER REFERENCES users(id)",
        "ALTER TABLE controls ADD COLUMN IF NOT EXISTS report_number VARCHAR(100)",
        "ALTER TABLE controls ADD COLUMN IF NOT EXISTS report_date DATE",
        "ALTER TABLE controls ADD COLUMN IF NOT EXISTS report_notes TEXT",
        "CREATE INDEX IF NOT EXISTS idx_controls_report_uploaded_at ON controls (report_uploaded_at)",
        "CREATE INDEX IF NOT EXISTS idx_controls_report_uploaded_by ON controls (report_uploaded_by_user_id)",
    ]
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    ensure_control_report_columns()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # creeaza automat userul Inspector General daca nu exista deja
    if settings.DEV_CREATE_IG:
        if not settings.DEV_IG_EMAIL or not settings.DEV_IG_PASSWORD:
            raise RuntimeError(
                "DEV_CREATE_IG necesita DEV_IG_EMAIL si DEV_IG_PASSWORD explicite."
            )
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
        "docs": "/docs" if settings.ENABLE_API_DOCS else None,
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
