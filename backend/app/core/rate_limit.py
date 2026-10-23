"""A small in-process throttle for password checks (login, setup, change password).

DCT is a single self-hosted process, so failures are counted in memory — no Redis or extra
dependency — and the counts reset on restart, which is fine for slowing down guessing.
After MAX_FAILURES failed attempts within WINDOW_SECONDS for the same key, further attempts
are refused (429 with Retry-After) until the oldest failure ages out of the window. A
successful attempt clears the key's failures.
"""

import threading
import time
from collections import deque

MAX_FAILURES = 5
WINDOW_SECONDS = 15 * 60


class Throttled(Exception):
    def __init__(self, retry_after: int):
        super().__init__(f"Too many attempts. Try again in {max(1, retry_after // 60)} minute(s).")
        self.retry_after = retry_after


class PasswordThrottle:
    def __init__(self, max_failures: int = MAX_FAILURES, window_seconds: int = WINDOW_SECONDS):
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._failures: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _recent(self, key: str, now: float) -> deque[float]:
        failures = self._failures.setdefault(key, deque())
        while failures and now - failures[0] >= self.window_seconds:
            failures.popleft()
        return failures

    def check(self, key: str) -> None:
        """Raises Throttled if `key` has used up its attempts."""
        now = time.monotonic()
        with self._lock:
            failures = self._recent(key, now)
            if len(failures) >= self.max_failures:
                raise Throttled(int(self.window_seconds - (now - failures[0])) + 1)

    def fail(self, key: str) -> None:
        with self._lock:
            self._recent(key, time.monotonic()).append(time.monotonic())

    def succeed(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)

    def reset(self) -> None:
        with self._lock:
            self._failures.clear()


password_throttle = PasswordThrottle()
