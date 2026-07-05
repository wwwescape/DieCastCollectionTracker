from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_ROOT = BACKEND_DIR.parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "db" / "diecastcollectiontracker.db"
UPLOADS_DIR = BACKEND_DIR / "uploads"


class Settings(BaseSettings):
    # Secrets live in one .env at the repo root (not backend/), so the same file works for
    # both local dev and the Docker Compose setup, which reads it from there too.
    model_config = SettingsConfigDict(env_file=str(REPO_ROOT / ".env"), extra="ignore")

    app_name: str = "DieCastCollectionTracker API"
    environment: str = "development"
    log_level: str = "INFO"
    # str | None (not a bare str default) so that an empty DATABASE_URL= line in .env -
    # which pydantic-settings treats as "set to ''", not "unset" - doesn't silently
    # override the SQLite default with an unparseable empty string; see database_url below.
    database_url_: str | None = Field(default=None, alias="database_url")

    @property
    def database_url(self) -> str:
        return self.database_url_ or f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"

    # Auth. jwt_secret_key has no default on purpose — see app/core/security.py, which
    # fails loudly and only when auth is actually used, rather than baking in an insecure
    # default that would inevitably end up reused in production.
    jwt_secret_key: str | None = None
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # CORS allow-list. The Vite dev server's origin is included by default since that's the
    # only case where frontend and backend are genuinely cross-origin — in production,
    # FastAPI serves both from one origin.
    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
