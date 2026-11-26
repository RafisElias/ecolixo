"""Integração HTTP + PostgreSQL. Cada teste usa uma transação revertida ao final."""

import unittest
from types import SimpleNamespace
from uuid import uuid4

from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.database import engine, get_db
from app.main import app
from app.models.user import User, UserType
from app.models.waste_category import WasteCategory


class PickupServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.connection = await engine.connect()
        self.transaction = await self.connection.begin()
        self.db = AsyncSession(bind=self.connection, join_transaction_mode="create_savepoint", expire_on_commit=False)
        suffix = uuid4().hex
        self.owner = User(name="Teste", email=f"{suffix}@example.com", password="not-used", type=UserType.citizen)
        self.category = WasteCategory(name=f"Teste {suffix}", map_color="#123456")
        self.db.add_all([self.owner, self.category])
        await self.db.flush()
        self.current_user = self.owner

        async def session():
            yield self.db

        app.dependency_overrides[get_db] = session
        app.dependency_overrides[get_current_user] = lambda: self.current_user
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
        self.body = {
            "name": "Reciclagem de teste",
            "provider_type": "company",
            "contact": "teste@example.com",
            "service_area": "São Paulo",
            "pricing": "free",
            "category_ids": [self.category.id],
        }

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        await self.client.aclose()
        await self.db.close()
        await self.transaction.rollback()
        await self.connection.close()
        # Evita reutilizar conexões de outro event loop do unittest.
        await engine.dispose()

    async def test_crud_and_filter(self):
        response = await self.client.post("/pickup-services", json=self.body)
        self.assertEqual(response.status_code, 201, response.text)
        service = response.json()
        self.assertEqual(service["user_id"], self.owner.id)
        self.assertEqual(service["categories"][0]["id"], self.category.id)
        service_id = service["id"]
        detail = await self.client.get(f"/pickup-services/{service_id}")
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["categories"], service["categories"])
        listing = await self.client.get("/pickup-services", params={"category_id": self.category.id})
        self.assertIn(service_id, [item["id"] for item in listing.json()])
        listing = await self.client.get("/pickup-services", params={"category_id": 9223372036854775807})
        self.assertEqual(listing.json(), [])
        updated = await self.client.put(
            f"/pickup-services/{service_id}", json={**self.body, "name": "Nome atualizado", "pricing": "paid"}
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["name"], "Nome atualizado")
        self.assertEqual((await self.client.delete(f"/pickup-services/{service_id}")).status_code, 204)
        self.assertEqual((await self.client.get(f"/pickup-services/{service_id}")).status_code, 404)
        self.assertEqual((await self.client.put(f"/pickup-services/{service_id}", json=self.body)).status_code, 404)

    async def test_other_user_cannot_modify_or_delete(self):
        response = await self.client.post("/pickup-services", json=self.body)
        service_id = response.json()["id"]
        self.current_user = SimpleNamespace(id=-1)
        self.assertEqual((await self.client.put(f"/pickup-services/{service_id}", json=self.body)).status_code, 403)
        self.assertEqual((await self.client.delete(f"/pickup-services/{service_id}")).status_code, 403)

    async def test_optional_coverage_and_removal(self):
        response = await self.client.post("/pickup-services", json=self.body)
        self.assertEqual(response.status_code, 201, response.text)
        self.assertIsNone(response.json()["reference_latitude"])
        service_id = response.json()["id"]
        geo = {"reference_latitude": -23.55, "reference_longitude": -46.63, "radius_km": 5}
        response = await self.client.put(f"/pickup-services/{service_id}", json={**self.body, **geo})
        self.assertEqual(response.status_code, 200, response.text)
        for key, value in geo.items():
            self.assertEqual(response.json()[key], value)
        response = await self.client.get(f"/pickup-services/{service_id}")
        self.assertEqual(response.json()["radius_km"], 5)
        response = await self.client.put(f"/pickup-services/{service_id}", json={**self.body, **dict.fromkeys(geo)})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIsNone(response.json()["radius_km"])

    async def test_invalid_input(self):
        for changes in [
            {"category_ids": []},
            {"category_ids": [9223372036854775807]},
            {"name": "  "},
            {"contact": ""},
            {"provider_type": "invalid"},
            {"pricing": "invalid"},
            {"user_id": -1},
            {"reference_latitude": -23.55},
            {"reference_latitude": 91, "reference_longitude": 0, "radius_km": 5},
            {"reference_latitude": 0, "reference_longitude": -181, "radius_km": 5},
            {"reference_latitude": 0, "reference_longitude": 0, "radius_km": 0},
            {"reference_latitude": 0, "reference_longitude": 0, "radius_km": 101},
        ]:
            with self.subTest(changes=changes):
                response = await self.client.post("/pickup-services", json={**self.body, **changes})
                self.assertEqual(response.status_code, 422, response.text)

    async def test_authentication_required(self):
        del app.dependency_overrides[get_current_user]
        for method, path in [
            ("GET", "/pickup-services"),
            ("GET", "/pickup-services/1"),
            ("POST", "/pickup-services"),
            ("PUT", "/pickup-services/1"),
            ("DELETE", "/pickup-services/1"),
        ]:
            response = await self.client.request(method, path, json=self.body if method in ("POST", "PUT") else None)
            self.assertIn(response.status_code, (401, 403))
