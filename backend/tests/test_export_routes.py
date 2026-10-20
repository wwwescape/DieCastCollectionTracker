import io
import json

from PIL import Image

from app.core.config import UPLOADS_DIR


def test_export_csv_requires_auth(client):
    response = client.get("/api/export/csv")

    assert response.status_code == 401


def test_export_backup_requires_auth(client):
    response = client.get("/api/export/backup")

    assert response.status_code == 401


def test_import_backup_requires_auth(client):
    response = client.post("/api/import/backup", files={"file": ("backup.json", b"{}", "application/json")})

    assert response.status_code == 401


def test_export_csv_empty(auth_client):
    response = auth_client.get("/api/export/csv")

    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    lines = response.text.strip().splitlines()
    assert lines[0].startswith("name,manufacturer")
    assert len(lines) == 1  # header only


def test_export_csv_includes_condition(auth_client):
    auth_client.post(
        "/api/cars", json={"name": "Bone Shaker", "manufacturer": "Hot Wheels", "condition": "near_mint"}
    )

    response = auth_client.get("/api/export/csv")

    header, row = response.text.strip().splitlines()
    columns = header.split(",")
    assert "condition" in columns
    assert row.split(",")[columns.index("condition")] == "near_mint"


def test_export_csv_with_cars(auth_client):
    auth_client.post(
        "/api/cars",
        json={
            "name": "Custom '67 Camaro",
            "manufacturer": "Hot Wheels",
            "vehicleType": "Car",
            "status": "owned",
            "quantity": 2,
            "tags": ["Favorite"],
        },
    )

    response = auth_client.get("/api/export/csv")

    assert response.status_code == 200
    lines = response.text.strip().splitlines()
    assert len(lines) == 2
    row = lines[1]
    assert "Custom '67 Camaro" in row
    assert "Hot Wheels" in row
    assert "Car" in row
    assert "owned" in row
    assert "Favorite" in row


def test_export_backup_json_structure(auth_client):
    auth_client.post("/api/cars", json={"name": "Skyline GT-R", "manufacturer": "Matchbox", "tags": ["JDM"]})

    response = auth_client.get("/api/export/backup")

    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    payload = response.json()
    assert payload["version"] == 3
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
