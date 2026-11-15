"""Manufacturer logos uploaded in Settings → Lookups (routes/lookups.py, upload_service)."""

import io
import os
import time

import pytest
from PIL import Image

from app.services import upload_service


@pytest.fixture(autouse=True)
def _isolate_uploads(tmp_path, monkeypatch):
    monkeypatch.setattr(upload_service, "UPLOADS_DIR", tmp_path)
    monkeypatch.setattr(upload_service, "CAR_IMAGES_DIR", tmp_path / "car-images")


def _png(size=(1600, 400), margin=100) -> bytes:
    """A logo on a transparent canvas with a transparent margin round it."""
    image = Image.new("RGBA", (size[0] + 2 * margin, size[1] + 2 * margin), (0, 0, 0, 0))
    image.paste(Image.new("RGBA", size, (220, 30, 40, 255)), (margin, margin))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _manufacturer(client, name="Detsky") -> dict:
    return client.post("/api/manufacturers", json={"name": name}).json()


def _upload(client, manufacturer_id, data=None):
    return client.post(
        f"/api/manufacturers/{manufacturer_id}/logo",
        files={"file": ("logo.png", io.BytesIO(data or _png()), "image/png")},
    )


def _logo_path(url: str):
    return upload_service.logos_dir() / url.removeprefix(upload_service.LOGOS_URL_PREFIX)


def test_logo_upload_needs_auth(client):
    assert _upload(client, 1).status_code == 401


def test_logo_is_trimmed_kept_transparent_and_scaled_to_800_wide(auth_client):
    manufacturer = _manufacturer(auth_client)

    response = _upload(auth_client, manufacturer["id"])

    assert response.status_code == 200
    url = response.json()["logoUrl"]
    assert url.startswith("/uploads/logos/") and url.endswith(".png")
    with Image.open(_logo_path(url)) as logo:
        assert logo.mode == "RGBA"
        # 1600×400 trimmed of its margin, then halved to 800 wide.
        assert logo.size == (800, 200)
    listed = auth_client.get("/api/manufacturers").json()
    assert listed[0]["logoUrl"] == url
    assert auth_client.get("/api/manufacturers/overview").json()[0]["logoUrl"] == url


def test_small_logos_are_not_upscaled(auth_client):
    manufacturer = _manufacturer(auth_client)

    url = _upload(auth_client, manufacturer["id"], _png(size=(300, 100), margin=0)).json()["logoUrl"]

    with Image.open(_logo_path(url)) as logo:
        assert logo.size == (300, 100)


def test_replacing_or_removing_a_logo_deletes_the_old_file(auth_client):
    manufacturer = _manufacturer(auth_client)
    first = _upload(auth_client, manufacturer["id"]).json()["logoUrl"]

    second = _upload(auth_client, manufacturer["id"]).json()["logoUrl"]
    assert not _logo_path(first).exists() and _logo_path(second).exists()

    response = auth_client.delete(f"/api/manufacturers/{manufacturer['id']}/logo")
    assert response.json()["logoUrl"] is None
    assert not _logo_path(second).exists()


def test_bad_logo_uploads_are_refused(auth_client):
    manufacturer = _manufacturer(auth_client)

    assert _upload(auth_client, manufacturer["id"], b"not an image").status_code == 400
    assert _upload(auth_client, manufacturer["id"], _blank_png()).status_code == 400
    assert _upload(auth_client, 999).status_code == 404


def _blank_png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGBA", (50, 50), (0, 0, 0, 0)).save(buffer, format="PNG")
    return buffer.getvalue()


def test_deleting_a_manufacturer_deletes_its_logo(auth_client):
    manufacturer = _manufacturer(auth_client)
    url = _upload(auth_client, manufacturer["id"]).json()["logoUrl"]

    assert auth_client.delete(f"/api/manufacturers/{manufacturer['id']}").status_code == 204

    assert not _logo_path(url).exists()


def test_merging_passes_the_logo_on_only_if_the_target_has_none(auth_client):
    source = _manufacturer(auth_client, "Detsky Toys")
    target = _manufacturer(auth_client, "Detsky")
    url = _upload(auth_client, source["id"]).json()["logoUrl"]

    auth_client.post(f"/api/lookups/manufacturers/{source['id']}/merge", json={"intoId": target["id"]})
    assert auth_client.get("/api/manufacturers").json()[0]["logoUrl"] == url

    other = _manufacturer(auth_client, "Detsky Ltd")
    other_url = _upload(auth_client, other["id"]).json()["logoUrl"]
    auth_client.post(f"/api/lookups/manufacturers/{other['id']}/merge", json={"intoId": target["id"]})

    assert auth_client.get("/api/manufacturers").json()[0]["logoUrl"] == url
    assert not _logo_path(other_url).exists()


def test_zip_backup_round_trip_restores_logos(auth_client):
    manufacturer = _manufacturer(auth_client)
    url = _upload(auth_client, manufacturer["id"]).json()["logoUrl"]
    link = auth_client.post("/api/export/backup/full-link").json()["url"]
    backup = auth_client.get(link, headers={"Authorization": ""}).content
    _logo_path(url).unlink()

    auth_client.post("/api/import/backup", files={"file": ("diecast-backup.zip", backup, "application/zip")})

    assert auth_client.get("/api/manufacturers").json()[0]["logoUrl"] == url
    with Image.open(_logo_path(url)) as logo:
        assert logo.mode == "RGBA"


def test_remove_unused_photos_also_clears_orphaned_logos(auth_client):
    manufacturer = _manufacturer(auth_client)
    used = _logo_path(_upload(auth_client, manufacturer["id"]).json()["logoUrl"])
    orphan = upload_service.logos_dir() / "11111111-2222-3333-4444-555555555555.png"
    orphan.write_bytes(_png())
    old = time.time() - 2 * 60 * 60
    for path in (used, orphan):
        os.utime(path, (old, old))

    removed = auth_client.post("/api/danger-zone/remove_unused_photos", json={}).json()["removed"]

    assert removed == {"photos": 1}
    assert used.exists() and not orphan.exists()
