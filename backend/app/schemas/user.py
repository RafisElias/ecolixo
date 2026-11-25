from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserType


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    password_confirm: str

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        if len(value.encode()) > 72:
            raise ValueError("A senha deve ter no máximo 72 bytes")
        return value
    type: UserType = UserType.citizen
    registration_code: str = ""


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    type: UserType
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
