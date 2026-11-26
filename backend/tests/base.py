"""Base para testes de integração HTTP + PostgreSQL com transação revertida ao final."""

import tempfile
import unittest
from uuid import uuid4

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.config import settings
from app.database import engine, get_db
from app.main import app
from app.models.disposal_point import DisposalPoint
from app.models.user import User, UserType
from app.models.waste_category import WasteCategory
from app.services.rate_limit import registration_limit


class IntegrationTestCase(unittest.IsolatedAsyncioTestCase):
    override_auth = True

    async def asyncSetUp(self):
        self.connection = await engine.connect()
        self.transaction = await self.connection.begin()
        self.db = AsyncSession(bind=self.connection, join_transaction_mode="create_savepoint", expire_on_commit=False)
        self.suffix = uuid4().hex
        self.citizen = User(
            name="Cidadã", email=f"c{self.suffix}@example.com", password="not-used", type=UserType.citizen
        )
        self.manager = User(
            name="Gestor", email=f"g{self.suffix}@example.com", password="not-used", type=UserType.manager
        )
        self.category = WasteCategory(name=f"Teste {self.suffix}", map_color="#123456")
        self.db.add_all([self.citizen, self.manager, self.category])
        await self.db.flush()
        self.current_user = self.citizen
        registration_limit.reset()

        # Uploads de teste nunca vão para o volume real.
        self.upload_dir = tempfile.TemporaryDirectory()
        self.original_upload_dir = settings.upload_dir
        settings.upload_dir = self.upload_dir.name

        async def session():
            yield self.db

        app.dependency_overrides[get_db] = session
        if self.override_auth:
            app.dependency_overrides[get_current_user] = lambda: self.current_user
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        settings.upload_dir = self.original_upload_dir
        self.upload_dir.cleanup()
        await self.client.aclose()
        await self.db.close()
        await self.transaction.rollback()
        await self.connection.close()
        # Evita reutilizar conexões de outro event loop do unittest.
        await engine.dispose()

    async def add_point(
        self, owner: User, description: str | None = "Ponto de teste", review_status: str = "pending"
    ) -> int:
        point = DisposalPoint(
            user_id=owner.id,
            description=description,
            review_status=review_status,
            location="SRID=4326;POINT(-46.63 -23.55)",
            categories=[self.category],
        )
        self.db.add(point)
        await self.db.flush()
        return point.id
