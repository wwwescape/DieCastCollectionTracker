import json

import httpx
import pytest

from app.core.config import get_app_version
from app.services import version_service
from app.services.version_service import LatestRelease


@pytest.fixture(autouse=True)
def _fresh_cache():
    version_service.clear_cache()
    yield
    version_service.clear_cache()


def test_app_version_comes_from_package_json():
    assert version_service._parse_version(get_app_version()) is not None
    assert get_app_version() != "0.0.0"


def test_get_version_requires_auth(client):
    assert client.get("/api/version").status_code == 401


def test_get_version_reports_update_available(auth_client, monkeypatch):
    monkeypatch.setattr(
        version_service,
        "get_latest_release",
        lambda force=False: LatestRelease("v999.0.0", "https://example.com/releases/v999.0.0"),
    )

    body = auth_client.get("/api/version").json()

    assert body == {
        "currentVersion": get_app_version(),
        "latestVersion": "v999.0.0",
        "updateAvailable": True,
        "releaseUrl": "https://example.com/releases/v999.0.0",
    }


def test_get_version_reports_no_update_when_already_current(auth_client, monkeypatch):
    monkeypatch.setattr(
        version_service,
        "get_latest_release",
        lambda force=False: LatestRelease(f"v{get_app_version()}", "https://example.com"),
    )

    assert auth_client.get("/api/version").json()["updateAvailable"] is False


def test_get_version_force_query_param_reaches_the_service(auth_client, monkeypatch):
    seen = []

    def fake(force=False):
        seen.append(force)
        return None

    monkeypatch.setattr(version_service, "get_latest_release", fake)

    auth_client.get("/api/version")
    auth_client.get("/api/version", params={"force": "true"})

    assert seen == [False, True]


def test_get_version_degrades_gracefully_when_github_is_unreachable(auth_client, monkeypatch):
    def unreachable():
        raise httpx.ConnectError("no network")

    monkeypatch.setattr(version_service, "_fetch_latest_release_payload", unreachable)

    body = auth_client.get("/api/version").json()

    assert body["currentVersion"] == get_app_version()
    assert body["latestVersion"] is None
    assert body["updateAvailable"] is False


def test_latest_release_is_cached_unless_forced(monkeypatch):
    calls = []

    def fake_fetch():
        calls.append(1)
        return json.dumps({"tag_name": f"v1.{len(calls)}.0", "html_url": "https://example.com"})

    monkeypatch.setattr(version_service, "_fetch_latest_release_payload", fake_fetch)

    assert version_service.get_latest_release().tag_name == "v1.1.0"
    assert version_service.get_latest_release().tag_name == "v1.1.0"
    assert version_service.get_latest_release(force=True).tag_name == "v1.2.0"
    # The forced answer is written back for everyone else.
    assert version_service.get_latest_release().tag_name == "v1.2.0"
    assert len(calls) == 2


def test_malformed_release_payload_is_ignored(monkeypatch):
    monkeypatch.setattr(version_service, "_fetch_latest_release_payload", lambda: "not json")

    assert version_service.get_latest_release() is None


@pytest.mark.parametrize(
    ("latest", "current", "expected"),
    [
        ("v1.4.0", "1.3.0", True),
        ("v1.10.0", "1.9.9", True),
        ("v1.3.0", "1.3.0", False),
        ("1.2.9", "1.3.0", False),
        ("nightly", "1.3.0", False),
    ],
)
def test_is_newer(latest, current, expected):
    assert version_service.is_newer(latest, current) is expected
