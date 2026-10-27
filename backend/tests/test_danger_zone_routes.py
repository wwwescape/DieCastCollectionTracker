"""Settings → General → Danger Zone (app/services/danger_zone_service.py)."""

import io
import os
import time

from PIL import Image


def _car(client, **fields):
    return client.post("/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels", **fields}).json()


def _set(client, **fields):
    body = {"name": "Fire Station", "manufacturer": "Hot Wheels", "setType": "playset", **fields}
    return client.post("/api/sets", json=body).json()


def _run(client, action, confirmation=None):
    return client.post(f"/api/danger-zone/{action}", json={"confirmation": confirmation})


def test_danger_zone_requires_auth(client):
    assert _run(client, "clear_notes").status_code == 401


def test_unknown_action_is_rejected(auth_client):
    assert _run(auth_client, "drop_database").status_code == 422


def test_clear_notes(auth_client):
    car = _car(auth_client, notes="from the flea market")
    _set(auth_client, notes="box dented")

    response = _run(auth_client, "clear_notes")

    assert response.json()["removed"] == {"vehicles": 1, "sets": 1}
    assert auth_client.get(f"/api/cars/{car['id']}").json()["notes"] is None


def test_clear_tags_removes_them_everywhere(auth_client):
    car = _car(auth_client, tags=["JDM"])

    assert _run(auth_client, "clear_tags").json()["removed"] == {"tags": 1}
    assert auth_client.get("/api/tags").json() == []
    assert auth_client.get(f"/api/cars/{car['id']}").json()["tags"] == []


def test_clear_purchase_prices(auth_client):
    car = _car(auth_client, purchasePrice=4.99)

    assert _run(auth_client, "clear_purchase_prices").json()["removed"] == {"vehicles": 1, "sets": 0}
    assert auth_client.get(f"/api/cars/{car['id']}").json()["purchasePrice"] is None


def test_remove_unused_lookups_keeps_what_is_used(auth_client):
    _car(auth_client, manufacturer="Hot Wheels", series="Mainline", color="Red")
    auth_client.post("/api/series", json={"name": "Orphan Series", "manufacturer": "Orphan Brand"})
    auth_client.post("/api/colors", json={"name": "Unused Color"})
    auth_client.post("/api/vehicle-types", json={"name": "Unused Type"})

    removed = _run(auth_client, "remove_unused_lookups").json()["removed"]

    assert removed == {"series": 1, "manufacturers": 1, "vehicleTypes": 1, "colors": 1}
    assert [m["name"] for m in auth_client.get("/api/manufacturers").json()] == ["Hot Wheels"]
    assert [c["name"] for c in auth_client.get("/api/colors").json()] == ["Red"]


def test_remove_unused_photos_keeps_used_and_recent_files(auth_client, tmp_path, monkeypatch):
    from app.services import upload_service

    folder = tmp_path / "car-images"
    folder.mkdir()
    monkeypatch.setattr(upload_service, "CAR_IMAGES_DIR", folder)
    buffer = io.BytesIO()
    Image.new("RGB", (4, 4)).save(buffer, format="JPEG")
    old = time.time() - 2 * 60 * 60
    for name in ("used.jpg", "unused.jpg", "just-uploaded.jpg"):
        (folder / name).write_bytes(buffer.getvalue())
    os.utime(folder / "used.jpg", (old, old))
    os.utime(folder / "unused.jpg", (old, old))
    _car(auth_client, photo="/uploads/car-images/used.jpg")

    assert _run(auth_client, "remove_unused_photos").json()["removed"] == {"photos": 1}
    assert sorted(path.name for path in folder.iterdir()) == ["just-uploaded.jpg", "used.jpg"]


def test_resets_need_reset_typed(auth_client):
    _car(auth_client)

    for confirmation in (None, "reset", "yes"):
        assert _run(auth_client, "reset_vehicles", confirmation).status_code == 409
    assert len(auth_client.get("/api/cars").json()) == 1


def test_reset_vehicles_takes_a_snapshot_and_keeps_sets(auth_client):
    car = _car(auth_client, tags=["JDM"])
    _set(auth_client, vehicleIds=[car["id"]])

    response = _run(auth_client, "reset_vehicles", "RESET").json()

    assert response["removed"] == {"vehicles": 1}
    assert response["safetySnapshotPath"].startswith("reset-reset_vehicles-")
    assert auth_client.get("/api/cars").json() == []
    sets = auth_client.get("/api/sets").json()
    assert len(sets) == 1 and sets[0]["vehicles"] == []
    # Tags and lookups stay; only Reset everything clears those.
    assert [tag["name"] for tag in auth_client.get("/api/tags").json()] == ["JDM"]


def test_reset_sets_keeps_vehicles(auth_client):
    _car(auth_client)
    _set(auth_client)

    assert _run(auth_client, "reset_sets", "RESET").json()["removed"] == {"sets": 1}
    assert len(auth_client.get("/api/cars").json()) == 1
    assert auth_client.get("/api/sets").json() == []


def test_reset_everything_keeps_the_account_and_share_link(auth_client):
    token = auth_client.get("/api/share-link").json()["token"]
    _car(auth_client, series="Mainline", color="Red", tags=["JDM"])
    _set(auth_client)

    removed = _run(auth_client, "reset_everything", "RESET").json()["removed"]

    assert removed["vehicles"] == 1 and removed["sets"] == 1 and removed["tags"] == 1
    assert auth_client.get("/api/manufacturers").json() == []
    assert auth_client.get("/api/auth/me").status_code == 200
    assert auth_client.get("/api/share-link").json()["token"] == token


def test_a_reset_snapshot_restores_the_collection(auth_client):
    from app.services import backup_service

    _car(auth_client, name="Bone Shaker")
    snapshot = _run(auth_client, "reset_vehicles", "RESET").json()["safetySnapshotPath"]
    backup = (backup_service.BACKUPS_DIR / snapshot).read_bytes()

    auth_client.post("/api/import/backup", files={"file": ("snapshot.json", backup, "application/json")})

    assert [car["name"] for car in auth_client.get("/api/cars").json()] == ["Bone Shaker"]
