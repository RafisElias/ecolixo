"""Script para popular o banco com usuários de teste.

Uso:
    docker compose exec backend python seed_users.py
"""

import asyncio
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path para importar os módulos do app
sys.path.insert(0, str(Path(__file__).parent))

from app.database import AsyncSessionLocal, engine, Base
from app.models.user import User, UserType
from app.auth.jwt import hash_password

TEST_USERS = [
    # --- Cidadãos ---
    dict(name="Ana Silva",       email="ana@teste.com",      password="123456", type=UserType.citizen),
    dict(name="Carlos Souza",    email="carlos@teste.com",   password="123456", type=UserType.citizen),
    dict(name="Juliana Lima",    email="juliana@teste.com",  password="123456", type=UserType.citizen),
    dict(name="Pedro Santos",    email="pedro@teste.com",    password="123456", type=UserType.citizen),
    dict(name="Marina Oliveira", email="marina@teste.com",   password="123456", type=UserType.citizen),

    # --- Gestores Municipais ---
    dict(name="Roberto Almeida (Gestor)", email="roberto@teste.com", password="123456", type=UserType.manager),
    dict(name="Fernanda Costa (Gestora)", email="fernanda@teste.com",password="123456", type=UserType.manager),
]


async def seed():
    print("🚀 Iniciando seed de usuários...\n")

    async with AsyncSessionLocal() as session:
        criados = 0
        ja_existem = 0

        for data in TEST_USERS:
            from sqlalchemy import select
            result = await session.execute(select(User).where(User.email == data["email"]))
            existing = result.scalar_one_or_none()

            if existing:
                print(f"  ⏭️  {data['email']} — já existe (id={existing.id})")
                ja_existem += 1
                continue

            user = User(
                name=data["name"],
                email=data["email"],
                password=hash_password(data["password"]),
                type=data["type"],
            )
            session.add(user)
            await session.flush()
            print(f"  ✅ {data['email']} — criado (id={user.id}, type={data['type'].value})")
            criados += 1

        await session.commit()

    print(f"\n📊 Resumo: {criados} criados, {ja_existem} já existentes")
    print("✅ Seed concluído!")


if __name__ == "__main__":
    asyncio.run(seed())
