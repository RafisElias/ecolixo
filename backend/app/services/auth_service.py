import hmac

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.models.user import User, UserType
from app.schemas.user import UserCreate, LoginRequest, UserOut, Token
from app.auth.jwt import hash_password, verify_password, create_access_token


async def register_user(body: UserCreate, db: AsyncSession) -> User:
    """Registra um novo usuário com validações de senha e código de gestor."""
    if body.password != body.password_confirm:
        raise HTTPException(status_code=400, detail="As senhas não coincidem")

    if body.type == UserType.manager:
        if not body.registration_code:
            raise HTTPException(
                status_code=400, detail="Informe o código de cadastro de gestor"
            )
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


async def login_user(body: LoginRequest, db: AsyncSession) -> Token:
    """Autentica usuário e retorna token JWT."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="E-mail ou senha incorretos"
        )

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=UserOut.model_validate(user))
