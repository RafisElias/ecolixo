"""Limites de uso contra spam e abuso.

Pontos e serviços são contados no próprio banco (coluna created_at): o limite
vale igual para todos os workers. Cadastros não guardam IP, então o limite por
IP fica em memória de cada processo.
"""

import time
from collections import defaultdict, deque
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.disposal_point import DisposalPoint
from app.models.pickup_service import PickupService

HOUR = 60 * 60

# Cada foto pode ter até MAX_UPLOAD_MB; o limite evita lotar o disco com spam.
POINTS_PER_HOUR = 20
SERVICES_PER_HOUR = 10
# Por IP e só cadastros concluídos: uma turma inteira no mesmo Wi-Fi ainda cabe.
REGISTRATIONS_PER_HOUR = 30


def _too_many(message: str, retry_after: float) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=message,
        headers={"Retry-After": str(max(1, int(retry_after)))},
    )


async def enforce_hourly_limit(db: AsyncSession, model, user_id: int, limit: int, message: str) -> None:
    """Responde 429 se o usuário já criou `limit` registros de `model` na última hora."""
    # Serializa as criações do mesmo usuário até o commit; sem isso, pedidos
    # simultâneos contam antes de qualquer um gravar e passam do limite.
    lock_key = func.hashtextextended(f"{model.__tablename__}:{user_id}", 0)
    await db.execute(select(func.pg_advisory_xact_lock(lock_key)))
    since = datetime.now(UTC) - timedelta(seconds=HOUR)
    count, oldest = (
        await db.execute(
            select(func.count(), func.min(model.created_at)).where(model.user_id == user_id, model.created_at > since)
        )
    ).one()
    if count >= limit:
        raise _too_many(message, (oldest - since).total_seconds())


class RateLimiter:
    """Janela deslizante em memória do processo."""

    def __init__(self, limit: int, window_seconds: float, message: str):
        self.limit = limit
        self.window = window_seconds
        self.message = message
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> None:
        """Responde 429 se o limite da janela já foi atingido, sem registrar uso."""
        now = time.monotonic()
        hits = self._hits.get(key)
        if not hits:
            return
        while hits and now - hits[0] > self.window:
            hits.popleft()
        if not hits:
            # Não acumula chaves de clientes que já foram embora.
            del self._hits[key]
        elif len(hits) >= self.limit:
            raise _too_many(self.message, self.window - (now - hits[0]))

    def record(self, key: str) -> None:
        self._hits[key].append(time.monotonic())

    def reset(self) -> None:
        self._hits.clear()


registration_limit = RateLimiter(
    REGISTRATIONS_PER_HOUR, HOUR, "Muitos cadastros a partir desta rede. Tente novamente mais tarde."
)


async def enforce_point_limit(db: AsyncSession, user_id: int) -> None:
    await enforce_hourly_limit(
        db, DisposalPoint, user_id, POINTS_PER_HOUR, "Você enviou muitos registros. Tente novamente mais tarde."
    )


async def enforce_service_limit(db: AsyncSession, user_id: int) -> None:
    await enforce_hourly_limit(
        db, PickupService, user_id, SERVICES_PER_HOUR, "Você cadastrou muitos serviços. Tente novamente mais tarde."
    )
