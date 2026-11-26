import hmac

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, hash_password, verify_password
from app.config import settings
from app.models.user import User, UserType
from app.schemas.user import LoginRequest, Token, UserCreate, UserOut
from app.services.login_throttle import login_throttle


async def register_user(body: UserCreate, db: AsyncSession) -> User:
    """Registra um novo usuário com validações de senha e código de gestor."""
    if body.password != body.password_confirm:
        raise HTTPException(status_code=400, detail="As senhas não coincidem")

    if body.type == UserType.manager:
        if not body.registration_code:
            raise HTTPException(status_code=400, detail="Informe o código de cadastro de gestor")
        expected = settings.gestor_registration_code
        # Comparação em tempo constante; código vazio no servidor desativa o cadastro de gestores.
        if not expected or not hmac.compare_digest(body.registration_code.encode(), expected.encode()):
            raise HTTPException(status_code=400, detail="Código de cadastro de gestor inválido")

    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado")

    user = User(
        name=body.name,
        email=body.email,
        password=hash_password(body.password),
        type=body.type,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def login_user(body: LoginRequest, db: AsyncSession, client_ip: str = "unknown") -> Token:
    """Autentica usuário e retorna token JWT, limitando tentativas falhas."""
    retry_after = login_throttle.retry_after(body.email, client_ip)
    if retry_after:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Muitas tentativas de login. Aguarde alguns minutos e tente novamente.",
            headers={"Retry-After": str(retry_after)},
        )
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password):
        login_throttle.failure(body.email, client_ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos")
    login_throttle.success(body.email, client_ip)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))
