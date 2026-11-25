"""Limite de tentativas de login falhas por e-mail e IP.

Guardado em memória do processo: com vários workers cada um conta à parte, o que
ainda limita força bruta a poucas tentativas por minuto. Para mais réplicas,
trocar por um armazenamento compartilhado (ex.: Redis).
"""
import time
from collections import defaultdict, deque

MAX_FAILURES = 5
WINDOW_SECONDS = 15 * 60


class LoginThrottle:
    def __init__(self, max_failures: int = MAX_FAILURES, window: float = WINDOW_SECONDS):
        self.max_failures = max_failures
        self.window = window
        self._failures: dict[tuple[str, str], deque[float]] = defaultdict(deque)

    def _recent(self, key: tuple[str, str], now: float) -> deque[float]:
        attempts = self._failures[key]
        while attempts and now - attempts[0] > self.window:
            attempts.popleft()
        return attempts

    def retry_after(self, email: str, ip: str) -> int:
        """Segundos até liberar novas tentativas; 0 se liberado."""
        now = time.monotonic()
        attempts = self._recent((email.lower(), ip), now)
        if len(attempts) < self.max_failures:
            return 0
        return max(1, int(self.window - (now - attempts[0])))

    def failure(self, email: str, ip: str) -> None:
        self._failures[(email.lower(), ip)].append(time.monotonic())

    def success(self, email: str, ip: str) -> None:
        self._failures.pop((email.lower(), ip), None)

    def reset(self) -> None:
        self._failures.clear()


login_throttle = LoginThrottle()
