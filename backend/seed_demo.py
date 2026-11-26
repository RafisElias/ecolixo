"""Dados de demonstração seguros para produção (apresentação do TCC).

- Contas donas dos dados com senha aleatória descartada: ninguém entra nelas.
- Pontos e serviços marcados com [DEMO]: nunca geram pontuação.
- Serviços fictícios sem coordenadas (não inventamos endereço de prestador).

Uso (no container do backend):
    python seed_demo.py           # cria (idempotente)
    python seed_demo.py --remove  # apaga contas demo e tudo que pertence a elas
"""

import asyncio
import secrets
import sys
from datetime import UTC, datetime, timedelta

from geoalchemy2.functions import ST_MakePoint, ST_SetSRID
from sqlalchemy import delete, select

from app.auth.jwt import hash_password
from app.database import AsyncSessionLocal, engine
from app.models.disposal_point import DisposalPoint, PointStatus
from app.models.user import User, UserType
from app.models.waste_category import WasteCategory
from app.schemas.pickup_service import PickupServiceCreate
from app.services.pickup_service import save_service
from seed_points import SAMPLE_POINTS
from seed_services import EXAMPLES

DEMO_DOMAIN = "demo.ecolixo.invalid"
OWNERS = [
    ("Demonstração — Centro", "centro"),
    ("Demonstração — Zona Sul e Oeste", "sul-oeste"),
    ("Demonstração — Zonas Norte e Leste", "norte-leste"),
]
# Revisão: a maioria aprovada; alguns pendentes para demonstrar o painel do gestor.
REVIEW_CYCLE = ["approved", "approved", "pending", "approved", "approved", "rejected", "approved", "pending"]


def _email(slug: str) -> str:
    return f"{slug}@{DEMO_DOMAIN}"


async def remove() -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(delete(User).where(User.email.like(f"%@{DEMO_DOMAIN}")))
        await db.commit()
        print(f"Removidas {result.rowcount} contas de demonstração (pontos e serviços em cascata).")


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        categories = {c.name: c for c in (await db.execute(select(WasteCategory))).scalars()}
        if not categories:
            raise RuntimeError("Nenhuma categoria cadastrada.")

        owners = []
        for name, slug in OWNERS:
            user = await db.scalar(select(User).where(User.email == _email(slug)))
            if user is None:
                user = User(
                    name=name,
                    email=_email(slug),
                    password=hash_password(secrets.token_urlsafe(32)),
                    type=UserType.citizen,
                )
                db.add(user)
                await db.flush()
            owners.append(user)

        owner_ids = [o.id for o in owners]
        existing = await db.scalar(select(DisposalPoint.id).where(DisposalPoint.user_id.in_(owner_ids)).limit(1))
        if existing is not None:
            print("Pontos de demonstração já existem; nada a fazer.")
            return

        cats = list(categories.values())
        now = datetime.now(UTC)
        for i, (place, lat, lng, item, status) in enumerate(SAMPLE_POINTS):
            assigned = list({cats[i % len(cats)], cats[(i + 2) % len(cats)]})[: (i % 2) + 1]
            created = now - timedelta(days=(i * 59) // len(SAMPLE_POINTS), hours=i % 7)
            review = REVIEW_CYCLE[i % len(REVIEW_CYCLE)]
            db.add(
                DisposalPoint(
                    user_id=owners[i % len(owners)].id,
                    categories=assigned,
                    description=f"[DEMO] {place} — {item}",
                    photo_url=None,
                    status=PointStatus(status),
                    review_status=review,
                    reviewed_at=None if review == "pending" else created + timedelta(days=1),
                    location=ST_SetSRID(ST_MakePoint(lng, lat), 4326),
                    created_at=created,
                )
            )
        await db.commit()
        print(f"Criados {len(SAMPLE_POINTS)} pontos de demonstração.")

        for i, (_, name, provider_type, contact, area, pricing, names, description) in enumerate(EXAMPLES):
            body = PickupServiceCreate(
                name=name,
                provider_type=provider_type,
                contact=contact,
                service_area=area,
                pricing=pricing,
                category_ids=[categories[n].id for n in names if n in categories],
                description=description,
            )
            await save_service(db, owners[i % len(owners)].id, body)
        print(f"Criados {len(EXAMPLES)} serviços fictícios de demonstração.")


async def main() -> None:
    try:
        await (remove() if "--remove" in sys.argv else seed())
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
