from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import auth, cars, dashboard, export, health, lookups, tags, uploads
from app.core.config import REPO_ROOT, UPLOADS_DIR, get_settings
from app.core.logging import configure_logging
from app.services.exceptions import ConflictError, NotFoundError

FRONTEND_BUILD_DIR = REPO_ROOT / "build"


def resolve_static_file(base_dir: Path, requested_path: str) -> Path | None:
    """Returns the real file under base_dir to serve for requested_path, or None if it
    should fall back to index.html (SPA client-side route, or nothing matched).

    requested_path is attacker-controlled - resolving and confirming the result is still
    inside base_dir (rather than trusting the joined path directly) is what stops a request
    like "../../etc/passwd" from escaping base_dir to serve arbitrary filesystem contents.
    """
    if not requested_path:
        return None
    candidate = (base_dir / requested_path).resolve()
    if candidate.is_relative_to(base_dir) and candidate.is_file():
        return candidate
    return None


configure_logging()
settings = get_settings()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(cars.router)
app.include_router(lookups.router)
app.include_router(tags.router)
app.include_router(uploads.router)
app.include_router(dashboard.router)
app.include_router(export.router)

# Uploaded car photos — created on first use rather than committed to the repo, so it needs
# to exist before StaticFiles will mount it.
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Serves the built frontend (npm run build's output) from the same origin as the API.
# Guarded by existence so a backend-only dev run (frontend served separately by Vite on
# :3000, or the test suite, neither of which ever produce a build/ directory) is
# unaffected. Registered last so it never shadows the /api/* or /healthz routes above —
# Starlette matches routes in registration order.
if FRONTEND_BUILD_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_BUILD_DIR / "assets"), name="frontend-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_frontend(full_path: str) -> FileResponse:
        static_file = resolve_static_file(FRONTEND_BUILD_DIR, full_path)
        return FileResponse(static_file if static_file is not None else FRONTEND_BUILD_DIR / "index.html")
