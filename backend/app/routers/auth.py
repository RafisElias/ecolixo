from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.user import LoginRequest, Token, UserCreate, UserOut
from app.services import auth_service
from app.services.rate_limit import registration_limit

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, request: Request, db: AsyncSession = Depends(get_db)):
    client_ip = _client_ip(request)
    registration_limit.check(client_ip)
    user = await auth_service.register_user(body, db)
    registration_limit.record(client_ip)
    return user


@router.post("/login", response_model=Token)
async def login(body: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    return await auth_service.login_user(body, db, _client_ip(request))
