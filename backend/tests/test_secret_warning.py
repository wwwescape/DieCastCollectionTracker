from app.core import security
from app.core.config import Settings


def test_weak_secret_warning_flags_a_short_secret(monkeypatch):
    # `_env_file=None` so the repo-root .env (real secrets) isn't read off disk.
    monkeypatch.setenv("JWT_SECRET_KEY", "too-short")
    monkeypatch.setattr(security, "get_settings", lambda: Settings(_env_file=None))

    assert "only 9 characters" in security.weak_secret_warning()


def test_weak_secret_warning_is_quiet_for_a_long_secret(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "x" * 64)
    monkeypatch.setattr(security, "get_settings", lambda: Settings(_env_file=None))

    assert security.weak_secret_warning() is None
