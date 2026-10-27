import io
import json
import zipfile

from PIL import Image

from app.core.config import UPLOADS_DIR


def test_export_backup_requires_auth(client):
    response = client.get("/api/export/backup")

    assert response.status_code == 401


def test_import_backup_requires_auth(client):
    response = client.post("/api/import/backup", files={"file": ("backup.json", b"{}", "application/json")})

    assert response.status_code == 401


def test_export_backup_json_structure(auth_client):
    auth_client.post("/api/cars", json={"name": "Skyline GT-R", "manufacturer": "Matchbox", "tags": ["JDM"]})

    response = auth_client.get("/api/export/backup")

    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    payload = response.json()
    assert payload["version"] == 5
    assert "exportedAt" in payload
    assert len(payload["manufacturers"]) == 1
    assert payload["manufacturers"][0]["name"] == "Matchbox"
    assert len(payload["cars"]) == 1
    car = payload["cars"][0]
    assert car["name"] == "Skyline GT-R"
    assert len(car["tagIds"]) == 1
    assert len(payload["tags"]) == 1
    assert payload["tags"][0]["name"] == "JDM"


def test_restore_backup_round_trip(auth_client):
    auth_client.post(
        "/api/cars",
        json={"name": "Party Wagon", "manufacturer": "Hot Wheels", "year": 1990, "status": "owned", "tags": ["Retro"]},
    )
    backup_response = auth_client.get("/api/export/backup")
    backup_bytes = backup_response.content

    # Add a second car, then restore to wipe it
    auth_client.post("/api/cars", json={"name": "Extra Car", "manufacturer": "Matchbox"})
    assert len(auth_client.get("/api/cars").json()) == 2

    restore_response = auth_client.post(
        "/api/import/backup",
        files={"file": ("backup.json", io.BytesIO(backup_bytes), "application/json")},
    )

    assert restore_response.status_code == 200
    result = restore_response.json()
    assert result["restoredCars"] == 1
    assert "pre-restore-" in result["safetySnapshotPath"]

    cars = auth_client.get("/api/cars").json()
    assert len(cars) == 1
    assert cars[0]["name"] == "Party Wagon"
    assert cars[0]["manufacturerName"] == "Hot Wheels"
    tag_names = {t["name"] for t in cars[0]["tags"]}
    assert tag_names == {"Retro"}


def _add_photo(auth_client, car_id: int) -> dict:
    buf = io.BytesIO()
    Image.new("RGB", (40, 30), color="blue").save(buf, format="PNG")
    response = auth_client.post(f"/api/cars/{car_id}/photos", files={"file": ("car.png", buf.getvalue(), "image/png")})
    return response.json()


def test_restore_backup_keeps_full_photo_gallery(auth_client):
    car_id = auth_client.post("/api/cars", json={"name": "Twin Mill", "manufacturer": "Hot Wheels"}).json()["id"]
    first = _add_photo(auth_client, car_id)
    second = _add_photo(auth_client, car_id)
    third = _add_photo(auth_client, car_id)
    auth_client.patch(f"/api/cars/{car_id}/photos/{second['id']}/primary")
    backup_bytes = auth_client.get("/api/export/backup").content

    restore_response = auth_client.post(
        "/api/import/backup", files={"file": ("backup.json", io.BytesIO(backup_bytes), "application/json")}
    )

    assert restore_response.status_code == 200
    car = auth_client.get(f"/api/cars/{car_id}").json()
    assert {p["url"] for p in car["photos"]} == {first["url"], second["url"], third["url"]}
    assert car["photo"] == second["url"]
    assert [p["url"] for p in car["photos"] if p["isPrimary"]] == [second["url"]]
    for photo in (first, second, third):
        (UPLOADS_DIR / "car-images" / photo["url"].removeprefix("/uploads/car-images/")).unlink()


def test_restore_v1_backup_uses_primary_photo_field(auth_client):
    v1_payload = {
        "version": 1,
        "exportedAt": "2026-01-01T00:00:00+00:00",
        "manufacturers": [{"id": 1, "name": "Hot Wheels"}],
        "series": [],
        "vehicleTypes": [],
        "colors": [],
        "tags": [],
        "cars": [
            {
                "id": 1,
                "name": "Deora",
                "manufacturerId": 1,
                "seriesId": None,
                "vehicleTypeId": None,
                "colorId": None,
                "castNumber": None,
                "collectionNumber": None,
                "year": None,
                "status": "owned",
                "condition": None,
                "quantity": 1,
                "purchasePrice": None,
                "notes": None,
                "photo": "/uploads/car-images/deora.jpg",
                "tagIds": [],
            }
        ],
    }

    response = auth_client.post(
        "/api/import/backup",
        files={"file": ("backup.json", json.dumps(v1_payload).encode(), "application/json")},
    )

    assert response.status_code == 200
    car = auth_client.get("/api/cars/1").json()
    assert [(p["url"], p["isPrimary"]) for p in car["photos"]] == [("/uploads/car-images/deora.jpg", True)]


def test_restore_backup_invalid_file(auth_client):
    response = auth_client.post(
        "/api/import/backup",
        files={"file": ("bad.json", b"not valid json at all", "application/json")},
    )

    assert response.status_code == 400
    assert "valid backup" in response.json()["detail"]


def test_restore_backup_wrong_structure(auth_client):
    bad_payload = json.dumps({"foo": "bar"}).encode()
    response = auth_client.post(
        "/api/import/backup",
        files={"file": ("bad.json", io.BytesIO(bad_payload), "application/json")},
    )

    assert response.status_code == 400


def test_restore_reports_only_the_snapshot_file_name(auth_client):
    backup = auth_client.get("/api/export/backup").content
    result = auth_client.post("/api/import/backup", files={"file": ("b.json", backup, "application/json")}).json()

    assert result["safetySnapshotPath"].startswith("pre-restore-")
    assert "/" not in result["safetySnapshotPath"] and "\\" not in result["safetySnapshotPath"]


def test_restore_rejects_an_oversized_file(auth_client, monkeypatch):
    from app.api.routes import export

    monkeypatch.setattr(export, "MAX_BACKUP_BYTES", 10)
    oversized = b"{" + b" " * 20 + b"}"
    response = auth_client.post("/api/import/backup", files={"file": ("b.json", oversized, "application/json")})

    assert response.status_code == 413


# --- Full backup (.zip with photos) ---


def _jpeg_bytes(color="red") -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), color=color).save(buffer, format="JPEG")
    return buffer.getvalue()


def _isolate_photos(tmp_path, monkeypatch):
    from app.services import upload_service

    photos = tmp_path / "car-images"
    photos.mkdir()
    monkeypatch.setattr(upload_service, "CAR_IMAGES_DIR", photos)
    return photos


def _download_zip(auth_client) -> bytes:
    link = auth_client.post("/api/export/backup/full-link")
    assert link.status_code == 200
    response = auth_client.get(link.json()["url"], headers={"Authorization": ""})
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    return response.content


def test_full_backup_link_requires_auth(client):
    assert client.post("/api/export/backup/full-link").status_code == 401


def test_full_backup_download_rejects_a_bad_link(client):
    response = client.get("/api/export/backup/full/not-a-token/diecast-backup.zip")

    assert response.status_code == 401


def test_full_backup_zip_holds_the_data_and_the_referenced_photos(auth_client, tmp_path, monkeypatch):
    photos = _isolate_photos(tmp_path, monkeypatch)
    name = "0b5f7a1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b.jpg"
    (photos / name).write_bytes(_jpeg_bytes())
    (photos / "11111111-2222-3333-4444-555555555555.jpg").write_bytes(_jpeg_bytes("blue"))  # unused
    auth_client.post(
        "/api/cars",
        json={"name": "Bone Shaker", "manufacturer": "Hot Wheels", "photo": f"/uploads/car-images/{name}"},
    )

    with zipfile.ZipFile(io.BytesIO(_download_zip(auth_client))) as archive:
        names = set(archive.namelist())
        data = json.loads(archive.read("backup.json"))

    assert names == {"backup.json", f"photos/{name}"}
    assert data["cars"][0]["name"] == "Bone Shaker"


def test_full_backup_zip_round_trip_restores_rows_and_photos(auth_client, tmp_path, monkeypatch):
    photos = _isolate_photos(tmp_path, monkeypatch)
    name = "0b5f7a1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b.jpg"
    (photos / name).write_bytes(_jpeg_bytes())
    auth_client.post(
        "/api/cars",
        json={"name": "Bone Shaker", "manufacturer": "Hot Wheels", "photo": f"/uploads/car-images/{name}"},
    )
    backup = _download_zip(auth_client)

    # A new server: no photo on disk, a different collection.
    (photos / name).unlink()
    auth_client.post("/api/cars", json={"name": "Extra Car", "manufacturer": "Matchbox"})

    result = auth_client.post(
        "/api/import/backup", files={"file": ("diecast-backup.zip", backup, "application/zip")}
    ).json()

    assert result["restoredCars"] == 1 and result["restoredPhotos"] == 1
    assert (photos / name).is_file()
    cars = auth_client.get("/api/cars").json()
    assert [car["name"] for car in cars] == ["Bone Shaker"]
    assert cars[0]["photo"] == f"/uploads/car-images/{name}"


def test_zip_restore_takes_only_safe_referenced_photos(auth_client, tmp_path, monkeypatch):
    photos = _isolate_photos(tmp_path, monkeypatch)
    good = "0b5f7a1e-3c2d-4e5f-8a9b-0c1d2e3f4a5b.jpg"
    not_an_image = "22222222-3333-4444-5555-666666666666.jpg"
    payload = json.dumps(
        {
            "version": 5,
            "exportedAt": "2026-10-27T00:00:00Z",
            "manufacturers": [{"id": 1, "name": "Hot Wheels"}],
            "series": [],
            "vehicleTypes": [],
            "colors": [],
            "tags": [],
            "cars": [
                {
                    "id": 1,
                    "name": "Bone Shaker",
                    "manufacturerId": 1,
                    "seriesId": None,
                    "vehicleTypeId": None,
                    "colorId": None,
                    "castNumber": None,
                    "collectionNumber": None,
                    "year": None,
                    "status": "owned",
                    "condition": None,
                    "quantity": 1,
                    "purchasePrice": None,
                    "notes": None,
                    "photo": f"/uploads/car-images/{good}",
                    "tagIds": [],
                    "photos": [
                        {"url": f"/uploads/car-images/{good}", "isPrimary": True, "sortOrder": 0},
                        {"url": f"/uploads/car-images/{not_an_image}", "isPrimary": False, "sortOrder": 1},
                    ],
                }
            ],
        }
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("backup.json", payload)
        archive.writestr(f"photos/{good}", _jpeg_bytes())
        archive.writestr(f"photos/{not_an_image}", b"not an image")
        archive.writestr("photos/../../evil.jpg", _jpeg_bytes())  # path traversal
        archive.writestr("photos/33333333-4444-5555-6666-777777777777.jpg", _jpeg_bytes())  # unreferenced

    result = auth_client.post(
        "/api/import/backup", files={"file": ("b.zip", buffer.getvalue(), "application/zip")}
    ).json()

    assert result["restoredPhotos"] == 1
    assert sorted(path.name for path in photos.iterdir()) == [good]
    assert not (tmp_path / "evil.jpg").exists()


def test_zip_restore_rejects_a_zip_without_backup_json(auth_client):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("readme.txt", "hello")

    response = auth_client.post("/api/import/backup", files={"file": ("b.zip", buffer.getvalue(), "application/zip")})

    assert response.status_code == 400
    assert "backup.json" in response.json()["detail"]
