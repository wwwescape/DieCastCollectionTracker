# backend/

FastAPI + SQLAlchemy (SQLite) + Alembic. Routes → services → repositories layering.
Pydantic v2 schemas with `CamelModel` base (camelCase JSON in/out). JWT auth (bcrypt
password, access + refresh tokens).

## Running

```bash
python -m venv .venv && source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements-dev.txt
cp ../.env.example ../.env   # set JWT_SECRET_KEY
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Auth

First-run setup — creates the single admin account (run from `backend/` with the venv active):

```bash
python -m scripts.create_admin --username admin
# prompts for a password (not echoed)

# or non-interactively:
python -m scripts.create_admin --username admin --password "your-password"
```

Running the script again on an existing username resets the password. There is no public
register endpoint — this script is the only way to provision or reset the login.

## Testing

```bash
pytest              # runs with coverage (90% floor enforced)
pytest --no-cov     # skip coverage during fast iteration
```

## Linting

```bash
ruff check .
ruff check . --fix
```

## Migrations

```bash
alembic revision --autogenerate -m "what changed"
alembic upgrade head
```

## Layout

- `app/api/routes/` — one file per resource (`cars.py`, `auth.py`, `dashboard.py`, ...)
- `app/core/` — config, logging, security, database session
- `app/models/` — SQLAlchemy ORM models
- `app/schemas/` — Pydantic schemas; all extend `CamelModel` (camelCase aliases,
  `populate_by_name=True`, `from_attributes=True`)
- `app/services/` — business logic; routes call these, never the DB directly
- `app/repositories/` — the only layer that touches SQLAlchemy sessions
- `alembic/` — migration history; `alembic/env.py` imports all models so autogenerate works
- `db/` — SQLite database file (created on first `alembic upgrade head`, git-ignored)
- `uploads/` — car photo files (git-ignored; `.gitkeep` tracks the directory)
- `tests/` — pytest suite with `httpx` test client; fixtures in `conftest.py`
