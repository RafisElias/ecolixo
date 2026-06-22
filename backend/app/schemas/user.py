from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserType


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    password_confirm: str
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
