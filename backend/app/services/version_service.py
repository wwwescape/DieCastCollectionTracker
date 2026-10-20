"""Ported from VideoGameTrackarr: is a newer DieCastCollectionTracker release out on GitHub?

DCT has no shared cache backend, so the latest-release lookup keeps its own small in-memory
cache, the same way app/services/wiki_catalog.py caches wiki responses.
"""

import json
import logging
import threading
import time
from dataclasses import dataclass

import httpx

logger = logging.getLogger(__name__)

GITHUB_REPO = "wwwescape/DieCastCollectionTracker"
RELEASES_LATEST_URL = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
CACHE_TTL_SECONDS = 6 * 60 * 60
REQUEST_TIMEOUT_SECONDS = 5.0


@dataclass
class LatestRelease:
    tag_name: str
    html_url: str


_cache: tuple[float, str] | None = None
_cache_lock = threading.Lock()


def clear_cache() -> None:
    global _cache
    with _cache_lock:
        _cache = None


def _fetch_latest_release_payload() -> str:
    """Single choke point for the GitHub call, so tests can swap it out."""
    response = httpx.get(
        RELEASES_LATEST_URL,
        headers={"Accept": "application/vnd.github+json"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.text


def get_latest_release(force: bool = False) -> LatestRelease | None:
    """The repo's latest published GitHub release, cached for CACHE_TTL_SECONDS so every
    browser polling GET /api/version shares one GitHub call per window instead of each hitting
    the unauthenticated rate limit.

    `force` skips the cache *read* (the About page's "Check for updates" button, via
    GET /api/version?force=true); the fresh answer is still written back to the cache.

    Returns None on any failure (network error, non-2xx, malformed body) — an update check
    must never break a page over GitHub being unreachable."""
    global _cache
    now = time.monotonic()
    if not force:
        with _cache_lock:
            if _cache is not None and _cache[0] > now:
                return _parse_release_payload(_cache[1])

    try:
        payload = _fetch_latest_release_payload()
    except httpx.HTTPError as exc:
        logger.warning("Could not fetch latest GitHub release: %s", exc)
        return None

    with _cache_lock:
        _cache = (now + CACHE_TTL_SECONDS, payload)
    return _parse_release_payload(payload)


def _parse_release_payload(payload: str) -> LatestRelease | None:
    try:
        data = json.loads(payload)
        return LatestRelease(tag_name=data["tag_name"], html_url=data["html_url"])
    except (ValueError, KeyError, TypeError):
        return None


def _parse_version(version: str) -> tuple[int, ...] | None:
    """"v1.4.0" / "1.4.0" -> (1, 4, 0). None for anything non-numeric, so a malformed tag
    never crashes the comparison — it just never claims an update is available."""
    try:
        return tuple(int(part) for part in version.removeprefix("v").split("."))
    except ValueError:
        return None


def is_newer(latest_tag: str, current_version: str) -> bool:
    latest = _parse_version(latest_tag)
    current = _parse_version(current_version)
    if latest is None or current is None:
        return False
    return latest > current
