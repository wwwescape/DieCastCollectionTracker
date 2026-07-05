# Developer Guide

## Prerequisites

- Python 3.12+
- Node.js 22+
- Docker + Docker Compose (optional, for container testing)

## Repository layout

```
diecastcollectiontracker/
├── backend/            FastAPI app (Python)
│   ├── app/
│   │   ├── api/        routes → services → repositories
│   │   ├── core/       config, logging, security, database
│   │   ├── models/     SQLAlchemy ORM models
│   │   ├── schemas/    Pydantic schemas (CamelModel base)
│   │   └── services/   business logic
│   ├── alembic/        database migrations
│   ├── db/             SQLite file (git-ignored; created on first run)
│   ├── tests/          pytest suite
│   └── uploads/        car photos (git-ignored; .gitkeep keeps the dir)
├── frontend/           TypeScript + Vite + React app
│   ├── api/            typed fetch functions per resource
│   ├── components/     page-level and shared components
│   ├── hooks/          TanStack Query hooks wrapping api/*
│   ├── navigation/     bottom bar, nav rail, nav drawer
│   ├── offline/        IndexedDB query-cache persistence
│   ├── pages/          routed page components
│   └── public/         PWA icons and manifest
├── build/              Vite output (git-ignored; created by `npm run build`)
├── docs/               this file and deployment examples
├── .env.example        template for the one .env the whole project reads
├── Dockerfile          multi-stage build (Node → Python)
└── docker-compose.yml  single `app` service + named volumes
```

## Backend setup

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements-dev.txt
```

Copy the env template and set a secret key:

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET_KEY to the output of:
python -c "import secrets; print(secrets.token_hex(32))"
```

Run migrations and start the server:

```bash
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

The API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

### Auth setup

There is no public register endpoint. Create the admin account with the CLI script
(run from `backend/` with the venv active):

```bash
python -m scripts.create_admin --username admin
# prompts for a password (not echoed to the terminal)
```

Running the script again resets the password for an existing username. Then log in at
[http://localhost:3000/login](http://localhost:3000/login) (dev) or use
`POST /api/auth/login` directly.

### Running backend tests

```bash
cd backend
pytest                       # runs with coverage (see pyproject.toml)
pytest --no-cov              # skip coverage (faster during development)
pytest tests/test_cars.py    # single file
```

Coverage floor is 90% — CI will fail if it drops below that.

### Linting

```bash
cd backend
ruff check .
ruff check . --fix   # auto-fix safe rules
```

### Database migrations

```bash
# After changing a model:
alembic revision --autogenerate -m "describe what changed"
alembic upgrade head

# Inspect history
alembic history
alembic current
```

## Frontend setup

From the **repo root** (not `frontend/`):

```bash
npm install    # installs root devDeps + frontend workspace
npm start      # Vite dev server on :3000
```

The dev server proxies `/api/*` to `:8000`, so the backend must also be running.

### Running frontend tests

```bash
npm test               # Vitest, single run
npm run test:watch     # watch mode
npm run test:coverage  # with V8 coverage report
```

### Type checking and linting

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
```

### Building for production

```bash
npm run build   # outputs to build/ (repo root, served by FastAPI)
```

Then start the backend — it auto-detects and serves from `build/` when that directory exists.

## Architecture notes

### Backend layering

Routes call services, services call repositories. No raw SQL in routes or services — only in
repositories. The dependency injection chain is `get_db → Session` (SQLAlchemy), passed into
every repository.

### Schemas

All Pydantic schemas extend `CamelModel` (see `backend/app/schemas/base.py`):

```python
class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
```

This means:
- JSON responses use camelCase keys (`.model_dump(by_alias=True)` or `response_model=` on routes)
- JSON input accepts either camelCase or snake_case (`populate_by_name=True`)
- `from_attributes=True` lets Pydantic read directly from SQLAlchemy ORM instances

When serializing for backup/export use `model_dump_json(indent=2, by_alias=True)`, not just
`model_dump_json(indent=2)` — the latter outputs snake_case field names, not camelCase aliases.

### Auth flow

1. `POST /api/auth/login` → returns `accessToken` (15 min) + `refreshToken` (30 days)
2. Frontend stores both in `localStorage` (`frontend/api/tokenStorage.ts`)
3. Axios interceptor attaches `Authorization: Bearer <accessToken>` on every request
4. On 401, the interceptor tries `POST /api/auth/refresh` once, then redirects to `/login`
5. Concurrent requests during a refresh are queued and replayed after the new token arrives

### Offline / PWA

Two layers work together:
- **Workbox** (via `vite-plugin-pwa`): caches the app shell (JS/CSS/HTML) on install, and
  car photos (`/uploads/*`) with CacheFirst (500 entries, 30 days). Gives a loadable shell
  from a cold offline start.
- **TanStack Query persistence** (`frontend/offline/`): the entire query cache is serialized
  to IndexedDB (via `idb-keyval`) and rehydrated on startup. Previously-viewed collection
  data is browsable offline without a network round-trip.

Mutations made offline queue automatically and flush on reconnect.
`OfflineStatusIndicator` surfaces this with a toast + live pending-change count.

### Undo toast

`useUndoableAction` (in `frontend/hooks/`) is a generic deferred-commit hook:
- `schedule(items)` adds `items` to a `pendingIds` Set immediately (so the UI can hide
  them) and returns `{ undo }`.
- After `delayMs` (default 5 s), `onCommit` fires — the actual API delete call.
- `undo()` cancels the timer and removes from `pendingIds`; `onCommit` is never called.

`showUndoToast` renders the "Undo" button inside a `react-toastify` toast that lasts for the
same `delayMs`. `ToastContainer` must be present in the component tree (it is — `AppShell`
renders one).

## Docker

Build and run locally:

```bash
docker compose up --build
```

The Dockerfile is multi-stage:
1. **`frontend-builder`** (Node 22): `npm ci` + `npm run build` → outputs to `/app/build`
2. **Python 3.12**: copies `backend/` + `/app/build`, runs as non-root `appuser`

The container exposes port 8000. Uvicorn serves the API and the built frontend from one
process. Named volumes (`db-data`, `uploads-data`) persist data across restarts and rebuilds.

## CI/CD

| Workflow | Trigger | Steps |
|---|---|---|
| `ci.yml` | Push/PR to master or main | Frontend lint + typecheck + test + build; Backend lint + test; Docker build smoke test |
| `release.yml` | Push a `v*` tag | Build + push to Docker Hub (`wwwescape/diecastcollectiontracker`) + GHCR; create GitHub Release |

To cut a release:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The release workflow needs two repository secrets:
- `DOCKERHUB_USERNAME` — your Docker Hub username
- `DOCKERHUB_TOKEN` — a Docker Hub access token (not your password)

`GITHUB_TOKEN` (for GHCR and GitHub Releases) is provided automatically by GitHub Actions.
