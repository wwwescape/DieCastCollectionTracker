import io

from PIL import Image

from app.core.config import UPLOADS_DIR

FIRE_STATION = {
    "name": "Downtown Fire Station Spinout",
    "manufacturer": "Hot Wheels",
    "setType": "playset",
    "toyNumber": "GJL14",
    "year": 2020,
    "contents": ["Fire Truck (Red)", "  ", "Rescue Duty (Yellow)"],
    "catalogSource": "hotwheels",
    "catalogTitle": "Downtown Fire Station Spinout",
}


def test_sets_require_auth(client):
    assert client.get("/api/sets").status_code == 401


def test_create_set_resolves_manufacturer_and_drops_blank_contents(auth_client):
    response = auth_client.post("/api/sets", json=FIRE_STATION)

    assert response.status_code == 201
    body = response.json()
    assert body["manufacturerName"] == "Hot Wheels"
    assert body["setType"] == "playset"
    assert body["status"] == "owned"
    assert body["sealed"] is True
    assert body["quantity"] == 1
    assert body["contents"] == ["Fire Truck (Red)", "Rescue Duty (Yellow)"]
    assert body["catalogUrl"] == "https://hotwheels.fandom.com/wiki/Downtown_Fire_Station_Spinout"


def test_list_sets_filters_and_searches(auth_client):
    auth_client.post("/api/sets", json=FIRE_STATION)
    auth_client.post(
        "/api/sets",
        json={"name": "Swamp Beast", "manufacturer": "Hot Wheels", "setType": "track_set", "status": "wishlist"},
    )
    auth_client.post("/api/sets", json={"name": "Action Garage", "manufacturer": "Matchbox"})

    def names(**params):
        return [s["name"] for s in auth_client.get("/api/sets", params=params).json()]

    assert names() == ["Action Garage", "Downtown Fire Station Spinout", "Swamp Beast"]
    assert names(setType="track_set") == ["Swamp Beast"]
    assert names(status="wishlist") == ["Swamp Beast"]
    assert names(search="gjl14") == ["Downtown Fire Station Spinout"]
    matchbox_id = next(m["id"] for m in auth_client.get("/api/manufacturers").json() if m["name"] == "Matchbox")
    assert names(manufacturerId=matchbox_id) == ["Action Garage"]


def test_update_set_is_partial_and_ignores_null_required_fields(auth_client):
    set_id = auth_client.post("/api/sets", json=FIRE_STATION).json()["id"]

    response = auth_client.patch(f"/api/sets/{set_id}", json={"sealed": False, "name": None, "notes": "Opened"})

    assert response.status_code == 200
    body = response.json()
    assert body["sealed"] is False
    assert body["name"] == "Downtown Fire Station Spinout"
    assert body["notes"] == "Opened"
    assert body["toyNumber"] == "GJL14"


def test_get_and_delete_set(auth_client):
    set_id = auth_client.post("/api/sets", json=FIRE_STATION).json()["id"]

    assert auth_client.get(f"/api/sets/{set_id}").status_code == 200
    assert auth_client.delete(f"/api/sets/{set_id}").status_code == 204
    assert auth_client.get(f"/api/sets/{set_id}").status_code == 404


def _upload_photo(auth_client) -> str:
    buf = io.BytesIO()
    Image.new("RGB", (40, 30), color="red").save(buf, format="PNG")
    response = auth_client.post("/api/uploads/car-images", files={"file": ("set.png", buf.getvalue(), "image/png")})
    return response.json()["url"]


def test_replacing_or_deleting_a_set_photo_removes_the_old_file(auth_client):
    first = _upload_photo(auth_client)
    second = _upload_photo(auth_client)
    set_id = auth_client.post("/api/sets", json={**FIRE_STATION, "photo": first}).json()["id"]

    auth_client.patch(f"/api/sets/{set_id}", json={"photo": second})
    assert not (UPLOADS_DIR / first.removeprefix("/uploads/")).exists()
    assert (UPLOADS_DIR / second.removeprefix("/uploads/")).exists()

    auth_client.delete(f"/api/sets/{set_id}")
    assert not (UPLOADS_DIR / second.removeprefix("/uploads/")).exists()


def test_manufacturer_used_by_a_set_cannot_be_deleted(auth_client):
    auth_client.post("/api/sets", json={"name": "Action Garage", "manufacturer": "Matchbox"})
    manufacturer_id = auth_client.get("/api/manufacturers").json()[0]["id"]

    response = auth_client.delete(f"/api/manufacturers/{manufacturer_id}")

    assert response.status_code == 409
    assert "set" in response.json()["detail"]


def test_dashboard_counts_sets(auth_client):
    auth_client.post("/api/sets", json=FIRE_STATION)
    auth_client.post("/api/sets", json={"name": "Swamp Beast", "manufacturer": "Hot Wheels", "status": "wishlist"})

    body = auth_client.get("/api/dashboard").json()

    assert body["totalSets"] == 2
    assert body["setsOwned"] == 1


def test_backup_round_trip_includes_sets(auth_client):
    auth_client.post("/api/sets", json=FIRE_STATION)
    backup = auth_client.get("/api/export/backup")
    assert backup.json()["sets"][0]["toyNumber"] == "GJL14"

    auth_client.post("/api/sets", json={"name": "Extra", "manufacturer": "Matchbox"})
    restore = auth_client.post(
        "/api/import/backup", files={"file": ("backup.json", io.BytesIO(backup.content), "application/json")}
    )

    assert restore.status_code == 200
    assert restore.json()["restoredSets"] == 1
    sets = auth_client.get("/api/sets").json()
    assert [s["name"] for s in sets] == ["Downtown Fire Station Spinout"]
    assert sets[0]["contents"] == ["Fire Truck (Red)", "Rescue Duty (Yellow)"]
    assert sets[0]["catalogTitle"] == "Downtown Fire Station Spinout"


def test_dashboard_collection_value_counts_owned_cars_and_sets_with_quantity(auth_client):
    hot_wheels = {"manufacturer": "Hot Wheels"}
    auth_client.post("/api/cars", json={**hot_wheels, "name": "A", "purchasePrice": 1.5, "quantity": 2})
    auth_client.post("/api/cars", json={**hot_wheels, "name": "B", "purchasePrice": 9, "status": "wishlist"})
    auth_client.post("/api/cars", json={**hot_wheels, "name": "C"})
    auth_client.post("/api/sets", json={**FIRE_STATION, "purchasePrice": 30})

    assert auth_client.get("/api/dashboard").json()["collectionValue"] == 33.0
