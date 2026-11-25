import json
import os

from tests.base import IntegrationTestCase

PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


class PointTests(IntegrationTestCase):
    def form(self, **overrides) -> dict:
        data = {"latitude": "-23.55", "longitude": "-46.63", "category_ids": json.dumps([self.category.id])}
        data.update(overrides)
        return data

    async def test_create_point_with_photo(self):
        response = await self.client.post(
            "/points", data=self.form(description="Monitor"), files={"photo": ("foto.png", PNG, "image/png")},
        )
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        self.assertEqual(body["review_status"], "pending")
        self.assertEqual([c["id"] for c in body["categories"]], [self.category.id])
        self.assertAlmostEqual(body["latitude"], -23.55)
        saved = os.path.join(self.upload_dir.name, os.path.basename(body["photo_url"]))
        self.assertTrue(body["photo_url"].endswith(".png"))
        with open(saved, "rb") as f:
            self.assertEqual(f.read(), PNG)

    async def test_rejects_out_of_range_coordinates(self):
        for field, value in (("latitude", "91"), ("longitude", "-181")):
            response = await self.client.post("/points", data=self.form(**{field: value}))
            self.assertEqual(response.status_code, 422, response.text)

    async def test_rejects_invalid_categories(self):
        for raw in ("não-é-json", json.dumps({"id": 1}), json.dumps(["1"]), json.dumps([9223372036854775807])):
            response = await self.client.post("/points", data=self.form(category_ids=raw))
            self.assertEqual(response.status_code, 422, raw)

    async def test_rejects_fake_image_without_saving(self):
        response = await self.client.post(
            "/points", data=self.form(), files={"photo": ("foto.jpg", b"<?php echo 1; ?>", "image/jpeg")},
        )
        self.assertEqual(response.status_code, 415, response.text)
        response = await self.client.post(
            "/points", data=self.form(), files={"photo": ("foto.gif", PNG, "image/gif")},
        )
        self.assertEqual(response.status_code, 415, response.text)
        self.assertEqual(os.listdir(self.upload_dir.name), [])

    async def test_invalid_category_does_not_leave_orphan_photo(self):
        response = await self.client.post(
            "/points", data=self.form(category_ids="[9223372036854775807]"),
            files={"photo": ("foto.png", PNG, "image/png")},
        )
        self.assertEqual(response.status_code, 422)
        self.assertEqual(os.listdir(self.upload_dir.name), [])

    async def test_rejects_photo_over_size_limit(self):
        from app.config import settings
        original, settings.max_upload_mb = settings.max_upload_mb, 0
        try:
            response = await self.client.post(
                "/points", data=self.form(), files={"photo": ("foto.png", PNG, "image/png")},
            )
        finally:
            settings.max_upload_mb = original
        self.assertEqual(response.status_code, 413)

    async def test_rejected_points_hidden_from_citizens_only(self):
        visible = await self.add_point(self.citizen, review_status="approved")
        hidden = await self.add_point(self.citizen, review_status="rejected")
        ids = [p["id"] for p in (await self.client.get("/points")).json()]
        self.assertIn(visible, ids)
        self.assertNotIn(hidden, ids)
        self.current_user = self.manager
        ids = [p["id"] for p in (await self.client.get("/points")).json()]
        self.assertIn(hidden, ids)

    async def test_manager_updates_status_and_notifies_owner(self):
        point_id = await self.add_point(self.citizen)
        self.current_user = self.manager
        response = await self.client.patch(f"/points/{point_id}/status", json={"status": "resolved"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "resolved")
        self.current_user = self.citizen
        self.assertEqual(
            (await self.client.patch(f"/points/{point_id}/status", json={"status": "pending"})).status_code, 403,
        )
        notifications = (await self.client.get("/notifications")).json()
        self.assertIn("Resolvido", notifications[0]["message"])
        self.assertFalse(notifications[0]["read"])
        self.assertEqual((await self.client.patch("/notifications/read-all")).status_code, 204)
        self.assertTrue(all(n["read"] for n in (await self.client.get("/notifications")).json()))

    async def test_status_update_unknown_point(self):
        self.current_user = self.manager
        response = await self.client.patch("/points/9223372036854775807/status", json={"status": "resolved"})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"], "Ponto de coleta não encontrado")

    async def test_manager_generates_report(self):
        await self.add_point(self.citizen)
        self.current_user = self.manager
        body = {"period_start": "2000-01-01", "period_end": "2100-01-01"}
        response = await self.client.post("/reports", json=body)
        self.assertEqual(response.status_code, 201, response.text)
        report = response.json()
        self.assertGreaterEqual(report["total_records"], 1)
        self.assertGreaterEqual(report["data"]["by_category"][str(self.category.id)], 1)
        listed = (await self.client.get("/reports")).json()
        self.assertIn(report["id"], [r["id"] for r in listed])
        self.current_user = self.citizen
        self.assertEqual((await self.client.post("/reports", json=body)).status_code, 403)
