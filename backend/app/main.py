import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    auth,
    cars,
    catalog,
    danger_zone,
    dashboard,
    export,
    health,
    lookups,
    public,
    sets,
    share,
    tags,
    uploads,
    version,
)
from app.core.config import REPO_ROOT, UPLOADS_DIR, get_settings
from app.core.logging import configure_logging
from app.core.security import weak_secret_warning
from app.services import upload_service
from app.services.exceptions import ConflictError, NotFoundError
from app.services.wiki_catalog import CatalogUnavailableError

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
if _secret_warning := weak_secret_warning():
    logging.getLogger(__name__).warning(_secret_warning)

# The interactive API docs (/docs, /redoc, /openapi.json) map out every endpoint; handy when
# developing, needless to publish. The Docker image sets ENVIRONMENT=production.
_docs = settings.environment == "development"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Photos saved before thumbnails existed, or restored from a backup, get theirs in the
    # background rather than when a page first asks for them.
    upload_service.start_thumbnail_backfill()
    yield


app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan,
    docs_url="/docs" if _docs else None,
    redoc_url="/redoc" if _docs else None,
    openapi_url="/openapi.json" if _docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Sent on every response. The CSP fits the built frontend: scripts and styles from this
# origin only (MUI injects <style> tags, hence 'unsafe-inline' for styles; no scripts are
# inline), images also from https: for wiki thumbnails, and no framing by other sites.
CONTENT_SECURITY_POLICY = "; ".join(
    [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ]
)
SECURITY_HEADERS = {
    "Content-Security-Policy": CONTENT_SECURITY_POLICY,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(self), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}


# How long browsers (and Cloudflare, in front of a tunnel) may keep a response. Built assets
# and photos have content-unique names, so they never change and can be kept for a year;
# index.html, the service worker and the other unhashed files are checked on every load so
# a new release shows up straight away.
IMMUTABLE_CACHE = "public, max-age=31536000, immutable"
CACHED_FOREVER_PREFIXES = ("/assets/", "/uploads/")


def cache_control_for(path: str) -> str | None:
    if path.startswith(CACHED_FOREVER_PREFIXES):
        return IMMUTABLE_CACHE
    if path.startswith("/api/") or path == "/healthz":
        return None
    return "no-cache"


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for name, value in SECURITY_HEADERS.items():
        response.headers.setdefault(name, value)
    cache_control = cache_control_for(request.url.path)
    if cache_control and response.status_code == 200:
        response.headers.setdefault("Cache-Control", cache_control)
    return response


# Compresses JSON, JS, CSS and HTML (JPEGs and zips are left as they are). Cloudflare
# compresses for visitors through a tunnel; this covers everyone else, such as the LAN.
# Level 5, not Starlette's 9: nearly as small, at a fraction of the CPU on a Raspberry Pi.
app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=5)


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError) -> JSONResponse:
    return JSONResponse(status_code=409, content={"detail": str(exc)})


@app.exception_handler(CatalogUnavailableError)
async def catalog_unavailable_handler(request: Request, exc: CatalogUnavailableError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": str(exc)})


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(cars.router)
app.include_router(sets.router)
app.include_router(catalog.router)
app.include_router(lookups.router)
app.include_router(tags.router)
app.include_router(uploads.router)
app.include_router(uploads.thumbnail_router)
app.include_router(dashboard.router)
app.include_router(danger_zone.router)
app.include_router(export.router)
app.include_router(export.download_router)
app.include_router(share.router)
app.include_router(public.router)
app.include_router(version.router)

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
