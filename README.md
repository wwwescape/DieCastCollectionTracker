<p align="center">
  <img src="frontend/public/DieCastCollectionTracker.png" alt="DieCastCollectionTracker logo" width="256" />
</p>

<h1 align="center">DieCastCollectionTracker</h1>

A self-hosted web app for tracking your die-cast car collection. Add cars with photos, filter
by manufacturer, series, or status, export your data as CSV or JSON, and browse your
collection offline. Single-container deployment with SQLite — no separate database service
needed.

## Features

- **Library tracking** — add, edit, delete, and filter cars by manufacturer, series, vehicle
  type, color, or status (owned / wishlist), with a photo per car served from the same origin
  as the API.
- **Dashboard** — collection stats: counts by manufacturer, vehicle type, and recently added.
- **Data portability** — export your collection as CSV or a full JSON backup, and restore
  from backup.
- **PWA** — installable, works offline for previously-viewed data (TanStack Query's cache
  persists to IndexedDB; car photos are cached via Workbox).
- **Undo toast for deletes** — a 5-second grace window before the delete actually commits.
- **Material 3 design**, light/dark mode, responsive navigation (bottom bar on mobile, icon
  rail on tablet, full nav drawer on desktop).
- Single-admin, self-hosted — no public registration, no multi-tenancy. JWT auth (access +
  refresh tokens).

## Prerequisites

- Git: https://git-scm.com/downloads
- Node.js 22+: https://nodejs.org/en/download/current
- Python 3.12+: https://www.python.org/downloads/

## Install

```
git clone https://github.com/wwwescape/DieCastCollectionTracker.git
cd DieCastCollectionTracker
npm install
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements-dev.txt
cd ..
```

## Configure

Create a `.env` file in the project root (see `.env.example`):

```
JWT_SECRET_KEY=            # generate with: python -c "import secrets; print(secrets.token_hex(32))"
```

See `.env.example` for the rest (database URL, CORS, app port — all optional with sane
defaults).

## Set up the database

```
cd backend
alembic upgrade head
python -m scripts.create_admin --username admin   # there's no public registration; this is the only way in
```

## Run (development)

Two processes, two terminals, from the project root:

```
cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000
```

```
npm start
```

The frontend runs on `http://localhost:3000` (Vite) and talks to the backend on
`http://localhost:8000` (FastAPI) directly. Log in with the admin account you created above.

## Test

```
npm run lint && npm run typecheck && npm test && npm run build
cd backend && ruff check . && pytest
```

## Deploy with Docker

A single container builds the frontend and serves it from the same FastAPI process as the
API (one origin, no separate frontend container/proxy split needed):

```
cp .env.example .env   # set JWT_SECRET_KEY
docker compose up -d --build
docker compose exec app python -m scripts.create_admin --username admin
```

Open [http://localhost:8000](http://localhost:8000) (override the host port with `APP_PORT`
in `.env`) and log in at [http://localhost:8000/login](http://localhost:8000/login).
Migrations run automatically on container start. Both the SQLite database and uploaded car
photos live in named volumes (`db-data` → `/app/backend/db`, `uploads-data` →
`/app/backend/uploads`), so they survive `docker compose down`/recreates and upgrades — only
`docker compose down -v` removes them.

To use a pre-built image instead of building from source, swap the `build:` block in
`docker-compose.yml` for:

```yaml
image: docker.io/wwwescape/diecastcollectiontracker:latest
```

Tagged releases are published to both Docker Hub (`wwwescape/diecastcollectiontracker`) and
GHCR (`ghcr.io/wwwescape/diecastcollectiontracker`).

## Upgrading

Schema changes ship as Alembic migrations, applied automatically — there's no separate
upgrade step beyond getting the new code running:

- **Docker**: `git pull && docker compose up -d --build` (or `docker compose pull && docker
  compose up -d` if you're running a published image tag instead of building from source).
  The entrypoint runs `alembic upgrade head` before the app starts, every time the container
  starts. Your data (database + uploads) is untouched — it lives in the named volumes
  described above, not in the container itself.
- **Bare metal**: `git pull`, reinstall dependencies if `requirements.txt`/`package.json`
  changed (`pip install -r requirements-dev.txt`, `npm install`), then run `cd backend &&
  alembic upgrade head` before starting the app again.

## Release a new version

```
git tag v1.0.0
git push origin v1.0.0
```

That tag push builds and publishes a Docker image to both GHCR
(`ghcr.io/wwwescape/diecastcollectiontracker`) and Docker Hub
(`docker.io/wwwescape/diecastcollectiontracker`) — tagged with that version and `latest` —
and creates a GitHub Release with auto-generated notes. See
`.github/workflows/release.yml`; publishing to Docker Hub needs the
`DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` repository secrets set.

## Project layout

```
frontend/   TypeScript, Vite, MUI v6 (Material 3), TanStack Query v5, React Router v6 — own package.json
backend/    FastAPI, SQLAlchemy (SQLite), Alembic, Pydantic v2, bcrypt, PyJWT — own requirements.txt
docs/       developer guide
```

See `docs/developer-guide.md` for conventions and where to add things, `frontend/README.md`
and `backend/README.md` for the details of each half, and `CONTRIBUTING.md` if you're
sending a PR.

## License

MIT

## Support

If you find DieCastCollectionTracker useful, consider buying me a coffee:

[<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="40" />](https://buymeacoffee.com/wwwescape)
