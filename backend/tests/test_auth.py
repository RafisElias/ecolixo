from app.config import settings
from app.services.login_throttle import MAX_FAILURES, login_throttle
from app.services.rate_limit import registration_limit
from tests.base import IntegrationTestCase


class AuthTests(IntegrationTestCase):
    override_auth = False

    async def asyncSetUp(self):
        await super().asyncSetUp()
        login_throttle.reset()

    def body(self, **overrides) -> dict:
        data = {
            "name": "Ana",
            "email": f"ana{self.suffix}@example.com",
            "password": "segredo1",
            "password_confirm": "segredo1",
            "type": "citizen",
        }
        data.update(overrides)
        return data

    async def test_register_login_and_use_token(self):
        response = await self.client.post("/auth/register", json=self.body())
        self.assertEqual(response.status_code, 201, response.text)
        self.assertNotIn("password", response.json())
        login = await self.client.post("/auth/login", json={"email": self.body()["email"], "password": "segredo1"})
        self.assertEqual(login.status_code, 200, login.text)
        token = login.json()["access_token"]
        journey = await self.client.get("/gamification/journey", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(journey.status_code, 200, journey.text)

    async def test_invalid_login_and_token(self):
        await self.client.post("/auth/register", json=self.body())
        wrong = await self.client.post("/auth/login", json={"email": self.body()["email"], "password": "errada1"})
        self.assertEqual(wrong.status_code, 401)
        self.assertEqual(wrong.json()["detail"], "E-mail ou senha incorretos")
        response = await self.client.get("/gamification/journey", headers={"Authorization": "Bearer invalido"})
        self.assertEqual(response.status_code, 401)

    async def test_register_validation(self):
        await self.client.post("/auth/register", json=self.body())
        duplicate = await self.client.post("/auth/register", json=self.body())
        self.assertEqual(duplicate.json()["detail"], "Este e-mail já está cadastrado")
        mismatch = await self.client.post(
            "/auth/register", json=self.body(email=f"x{self.suffix}@example.com", password_confirm="outra12")
        )
        self.assertEqual(mismatch.json()["detail"], "As senhas não coincidem")
        short = await self.client.post(
            "/auth/register",
            json=self.body(email=f"y{self.suffix}@example.com", password="123", password_confirm="123"),
        )
        self.assertEqual(short.status_code, 422)

    async def test_manager_registration_code(self):
        original, settings.gestor_registration_code = settings.gestor_registration_code, "codigo-certo"
        try:
            missing = await self.client.post("/auth/register", json=self.body(type="manager"))
            self.assertEqual(missing.status_code, 400)
            wrong = await self.client.post("/auth/register", json=self.body(type="manager", registration_code="errado"))
            self.assertEqual(wrong.json()["detail"], "Código de cadastro de gestor inválido")
            ok = await self.client.post(
                "/auth/register", json=self.body(type="manager", registration_code="codigo-certo")
            )
            self.assertEqual(ok.status_code, 201, ok.text)
            self.assertEqual(ok.json()["type"], "manager")
            # Sem código configurado no servidor, ninguém se cadastra como gestor.
            settings.gestor_registration_code = ""
            disabled = await self.client.post(
                "/auth/register",
                json=self.body(email=f"z{self.suffix}@example.com", type="manager", registration_code="x"),
            )
            self.assertEqual(disabled.status_code, 400)
        finally:
            settings.gestor_registration_code = original

    async def test_login_is_throttled_after_repeated_failures(self):
        await self.client.post("/auth/register", json=self.body())
        email = self.body()["email"]
        for _ in range(MAX_FAILURES):
            self.assertEqual(
                (await self.client.post("/auth/login", json={"email": email, "password": "errada1"})).status_code, 401
            )
        blocked = await self.client.post("/auth/login", json={"email": email, "password": "segredo1"})
        self.assertEqual(blocked.status_code, 429)
        self.assertIn("Retry-After", blocked.headers)
        login_throttle.reset()
        self.assertEqual(
            (await self.client.post("/auth/login", json={"email": email, "password": "segredo1"})).status_code, 200
        )

    async def test_successful_login_clears_failures(self):
        await self.client.post("/auth/register", json=self.body())
        email = self.body()["email"]
        for _ in range(MAX_FAILURES - 1):
            await self.client.post("/auth/login", json={"email": email, "password": "errada1"})
        self.assertEqual(
            (await self.client.post("/auth/login", json={"email": email, "password": "segredo1"})).status_code, 200
        )
        self.assertEqual(
            (await self.client.post("/auth/login", json={"email": email, "password": "errada1"})).status_code, 401
        )

    async def test_registration_is_rate_limited_per_ip(self):
        for i in range(registration_limit.limit):
            ok = await self.client.post("/auth/register", json=self.body(email=f"r{i}{self.suffix}@example.com"))
            self.assertEqual(ok.status_code, 201, ok.text)
        # Tentativas recusadas não contam; a próxima conta nova é bloqueada.
        blocked = await self.client.post("/auth/register", json=self.body(email=f"extra{self.suffix}@example.com"))
        self.assertEqual(blocked.status_code, 429)

    async def test_failed_registration_does_not_count(self):
        await self.client.post("/auth/register", json=self.body())
        for _ in range(registration_limit.limit + 1):
            dup = await self.client.post("/auth/register", json=self.body())
            self.assertEqual(dup.status_code, 400)

    async def test_unknown_email_still_checks_a_password_hash(self):
        from unittest import mock

        from app.services import auth_service

        with mock.patch.object(auth_service, "verify_password", wraps=auth_service.verify_password) as spy:
            response = await self.client.post(
                "/auth/login", json={"email": "ninguem@example.com", "password": "x12345"}
            )
        self.assertEqual(response.status_code, 401)
        spy.assert_called_once()
