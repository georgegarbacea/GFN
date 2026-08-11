from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_MINUTES: int = 60
    ENVIRONMENT: str = "production"
    ENABLE_API_DOCS: bool = False
    ENABLE_HSTS: bool = False

    # Se activeaza explicit numai intr-un mediu local controlat.
    DEV_CREATE_IG: bool = False
    DEV_IG_EMAIL: Optional[str] = None
    DEV_IG_PASSWORD: Optional[str] = None


settings = Settings()
