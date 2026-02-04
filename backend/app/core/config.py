from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://gfn:gfn@localhost:5432/gfn"
    JWT_SECRET: str = "dev-secret-change"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 60

    # pentru test local: creează automat un Inspector General
    DEV_CREATE_IG: bool = True
    DEV_IG_EMAIL: str = "inspector.general@gfn.local"
    DEV_IG_PASSWORD: str = "ChangeMe123!"

settings = Settings()
