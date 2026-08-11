from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


UserRole = Literal[
    "admin",
    "inspector_general",
    "director_national",
    "inspector_sef",
    "inspector",
    "ministru",
    "raportare_paza",
]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    first_name: str = Field(min_length=2, max_length=100)
    last_name: str = Field(min_length=2, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, value: str) -> str:
        if not any(character.isalpha() for character in value):
            raise ValueError("Parola trebuie sa contina cel putin o litera.")
        if not any(character.isdigit() for character in value):
            raise ValueError("Parola trebuie sa contina cel putin o cifra.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ApproveUserRequest(BaseModel):
    user_id: int
    is_approved: bool
    role: UserRole
