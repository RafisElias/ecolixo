"""Script para popular o banco com pontos de coleta de teste.

Uso:
    docker compose exec backend python seed_points.py
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).parent))

from app.database import AsyncSessionLocal
from app.models.disposal_point import DisposalPoint, PointStatus
from app.models.user import User
from app.models.waste_category import WasteCategory
from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
from sqlalchemy import select

# Pontos de coleta em São Paulo (lat, lng, descrição, status)
SAMPLE_POINTS = [
    # --- Zona Sul ---
    ("Av. Paulista, 1000",       -23.5614, -46.6556, "Smartphone quebrado",              "pending"),
    ("Av. Brigadeiro Faria Lima, 2000", -23.5869, -46.6843, "Monitor LCD antigo",         "pending"),
    ("Rua Augusta, 500",         -23.5558, -46.6594, "Notebook velho",                   "under_review"),
    ("Av. Rebouças, 3000",       -23.5657, -46.6711, "Geladeira pequena",                "resolved"),
    ("Rua Oscar Freire, 900",    -23.5602, -46.6678, "Baterias de celular",              "pending"),

    # --- Zona Oeste ---
    ("Rua Teodoro Sampaio, 1500",-23.5517, -46.6883, "TV 32 polegadas",                  "under_review"),
    ("Av. Heitor Penteado, 500", -23.5389, -46.7061, "Micro-ondas",                      "resolved"),
    ("Largo da Batata, 100",     -23.5540, -46.6934, "Cabos e carregadores",             "pending"),
    ("Rua dos Pinheiros, 800",   -23.5587, -46.6789, "Tablet com tela quebrada",         "pending"),
    ("Av. Faria Lima, 3500",     -23.5914, -46.6889, "Roteador e modem antigos",         "under_review"),

    # --- Centro ---
    ("Praça da Sé, 1",           -23.5505, -46.6333, "Teclado e mouse",                  "resolved"),
    ("Rua 25 de Março, 500",     -23.5456, -46.6344, "Bateria de notebook",              "pending"),
    ("Av. São João, 700",        -23.5439, -46.6419, "Monitor CRT antigo",               "pending"),
    ("Largo do Arouche, 100",    -23.5397, -46.6417, "Fones de ouvido estragados",       "under_review"),
    ("Praça da República, 50",   -23.5456, -46.6431, "Ventilador queimado",              "pending"),

    # --- Zona Norte ---
    ("Av. Cruzeiro do Sul, 2000",-23.5144, -46.6231, "Impressora jato de tinta",         "resolved"),
    ("Rua Voluntários da Pátria, 3000", -23.5192, -46.6192, "Monitor LED",               "pending"),
    ("Av. Eng. Caetano Álvares, 5000", -23.4818, -46.6272, "Geladeira",                  "under_review"),

    # --- Zona Leste ---
    ("Av. Radial Leste, 3000",   -23.5481, -46.5981, "CPU desktop antigo",              "pending"),
    ("Rua do Oratório, 2000",    -23.5589, -46.5894, "Aparelho de som",                 "resolved"),
    ("Av. Sapopemba, 8000",      -23.6019, -46.5725, "Notebook com tela quebrada",      "pending"),
    ("Praça do Carmo, 100",      -23.5564, -46.6081, "Carregador de laptop",             "under_review"),
]


async def seed():
    print("🚀 Iniciando seed de pontos de coleta...\n")

    async with AsyncSessionLocal() as session:
        # Pega todos os usuários existentes
        result = await session.execute(select(User))
        users = result.scalars().all()

        if not users:
            print("❌ Nenhum usuário encontrado! Execute seed_users.py primeiro.")
            return

        # Pega as categorias
        cat_result = await session.execute(select(WasteCategory))
        categories = cat_result.scalars().all()

        if not categories:
            print("❌ Nenhuma categoria encontrada! Execute o seed.sql primeiro.")
            return

        from sqlalchemy import func as sa_func

        count_before = (await session.execute(sa_func.count(DisposalPoint.id))).scalar() or 0
        print(f"   Pontos existentes: {count_before}")
        print(f"   Usuários disponíveis: {len(users)}")
        print(f"   Categorias disponíveis: {len(categories)}\n")

        criados = 0

        for i, (desc, lat, lng, obs, status_str) in enumerate(SAMPLE_POINTS):
            user = users[i % len(users)]
            # Cada ponto recebe de 1 a 3 categorias
            cat1 = categories[i % len(categories)]
            cat2 = categories[(i + 1) % len(categories)]
            cat3 = categories[(i + 2) % len(categories)]
            assigned = list({cat1, cat2, cat3})[: (i % 3) + 1]

            point = DisposalPoint(
                user_id=user.id,
                categories=assigned,
                description=f"{desc} — {obs}",
                photo_url=None,
                status=PointStatus(status_str),
                location=ST_SetSRID(ST_MakePoint(lng, lat), 4326),
            )
            session.add(point)
            criados += 1

        await session.commit()

        count_after = (await session.execute(sa_func.count(DisposalPoint.id))).scalar() or 0
        print(f"\n📊 Resumo: {criados} pontos de coleta criados, total agora: {count_after}")
        print("✅ Seed concluído!")


if __name__ == "__main__":
    asyncio.run(seed())
