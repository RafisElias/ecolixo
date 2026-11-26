"""Integração HTTP + PostgreSQL da gamificação. Cada teste usa uma transação revertida ao final."""

import unittest
from uuid import uuid4

from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import get_current_user
from app.database import engine, get_db
from app.main import app
from app.models.disposal_point import DisposalPoint
from app.models.gamification import ScoreEvent
from app.models.user import User, UserType
from app.services.missions import MISSIONS

MISSION = MISSIONS[0]
CORRECT = {q.id: q.correct_option_id for q in MISSION.questions}


class GamificationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.connection = await engine.connect()
        self.transaction = await self.connection.begin()
        self.db = AsyncSession(bind=self.connection, join_transaction_mode="create_savepoint", expire_on_commit=False)
        suffix = uuid4().hex
        self.citizen = User(name="Cidadã", email=f"c{suffix}@example.com", password="not-used", type=UserType.citizen)
        self.manager = User(name="Gestor", email=f"g{suffix}@example.com", password="not-used", type=UserType.manager)
        self.db.add_all([self.citizen, self.manager])
        await self.db.flush()
        self.current_user = self.citizen

        async def session():
            yield self.db

        app.dependency_overrides[get_db] = session
        app.dependency_overrides[get_current_user] = lambda: self.current_user
        self.client = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")

    async def asyncTearDown(self):
        app.dependency_overrides.clear()
        await self.client.aclose()
        await self.db.close()
        await self.transaction.rollback()
        await self.connection.close()
        await engine.dispose()

    async def _point(self, owner: User, description: str | None = "Ponto de teste") -> int:
        point = DisposalPoint(user_id=owner.id, description=description, location="SRID=4326;POINT(-46.63 -23.55)")
        self.db.add(point)
        await self.db.flush()
        return point.id

    async def _journey(self, user: User | None = None) -> dict:
        previous, self.current_user = self.current_user, user or self.citizen
        response = await self.client.get("/gamification/journey")
        self.current_user = previous
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    async def _review(self, point_id: int, status: str):
        self.current_user = self.manager
        response = await self.client.patch(f"/points/{point_id}/review", json={"review_status": status})
        self.current_user = self.citizen
        return response

    async def test_missions_do_not_expose_answers(self):
        response = await self.client.get("/gamification/missions")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("correct_option_id", response.text)
        self.assertEqual(len(response.json()), len(MISSIONS))
        self.assertFalse(response.json()[0]["completed"])

    async def test_wrong_answer_awards_nothing(self):
        answers = {**CORRECT, MISSION.questions[0].id: "resposta-invalida"}
        response = await self.client.post(f"/gamification/missions/{MISSION.key}/complete", json={"answers": answers})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(
            response.json(),
            {
                "passed": False,
                "already_completed": False,
                "points_awarded": 0,
                "incorrect_question_ids": [MISSION.questions[0].id],
            },
        )
        journey = await self._journey()
        self.assertEqual(journey["balance"], 0)
        self.assertEqual(journey["missions_completed"], 0)

    async def test_mission_scores_only_once(self):
        url = f"/gamification/missions/{MISSION.key}/complete"
        first = await self.client.post(url, json={"answers": CORRECT})
        self.assertEqual(first.json()["points_awarded"], 10)
        second = await self.client.post(url, json={"answers": CORRECT})
        self.assertEqual(
            second.json(),
            {
                "passed": True,
                "already_completed": True,
                "points_awarded": 0,
                "incorrect_question_ids": [],
            },
        )
        journey = await self._journey()
        self.assertEqual(journey["balance"], 10)
        self.assertEqual(len(journey["history"]), 1)
        unlocked = {a["key"] for a in journey["achievements"] if a["unlocked"]}
        self.assertEqual(unlocked, {"primeiro-aprendizado"})
        missions = (await self.client.get("/gamification/missions")).json()
        self.assertTrue(missions[0]["completed"])

    async def test_unknown_mission(self):
        response = await self.client.post("/gamification/missions/inexistente/complete", json={"answers": {}})
        self.assertEqual(response.status_code, 404)

    async def test_approval_is_idempotent_and_revocable(self):
        point_id = await self._point(self.citizen)
        approved = await self._review(point_id, "approved")
        self.assertEqual(approved.status_code, 200, approved.text)
        self.assertEqual(approved.json()["review_status"], "approved")
        self.assertIsNotNone(approved.json()["reviewed_at"])
        await self._review(point_id, "approved")
        journey = await self._journey()
        self.assertEqual(journey["balance"], 30)
        self.assertEqual(len(journey["history"]), 1)
        self.assertEqual(journey["contributions"]["approved"], 1)

        await self._review(point_id, "rejected")
        journey = await self._journey()
        self.assertEqual(journey["balance"], 0)
        self.assertIsNotNone(journey["history"][0]["revoked_at"])
        self.assertFalse(any(a["unlocked"] for a in journey["achievements"]))

        await self._review(point_id, "approved")
        journey = await self._journey()
        self.assertEqual(journey["balance"], 30)
        # Histórico auditável: a revogação anterior continua registrada.
        self.assertEqual([e["revoked_at"] is None for e in journey["history"]], [True, False])

    async def test_back_to_pending_revokes_and_clears_reviewer(self):
        point_id = await self._point(self.citizen)
        await self._review(point_id, "approved")
        response = await self._review(point_id, "pending")
        self.assertIsNone(response.json()["reviewed_at"])
        self.assertEqual((await self._journey())["balance"], 0)
        point = (await self.db.execute(select(DisposalPoint).where(DisposalPoint.id == point_id))).scalar_one()
        self.assertIsNone(point.reviewed_by)

    async def test_demo_point_never_scores(self):
        point_id = await self._point(self.citizen, "[DEMO] Ponto fictício")
        response = await self._review(point_id, "approved")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual((await self._journey())["balance"], 0)
        events = (
            (await self.db.execute(select(ScoreEvent).where(ScoreEvent.user_id == self.citizen.id))).scalars().all()
        )
        self.assertEqual(events, [])

    async def test_only_other_managers_can_review(self):
        point_id = await self._point(self.citizen)
        response = await self.client.patch(f"/points/{point_id}/review", json={"review_status": "approved"})
        self.assertEqual(response.status_code, 403)
        own_point = await self._point(self.manager)
        self.assertEqual((await self._review(own_point, "approved")).status_code, 403)
        self.assertEqual((await self._review(9223372036854775807, "approved")).status_code, 404)
        self.assertEqual((await self._review(point_id, "invalido")).status_code, 422)

    async def test_review_status_filter(self):
        point_id = await self._point(self.citizen)
        await self._review(point_id, "approved")
        listing = await self.client.get("/points", params={"review_status": "approved"})
        self.assertIn(point_id, [p["id"] for p in listing.json()])
        listing = await self.client.get("/points", params={"review_status": "rejected"})
        self.assertNotIn(point_id, [p["id"] for p in listing.json()])


if __name__ == "__main__":
    unittest.main()
