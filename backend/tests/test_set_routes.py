import io
import json

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


def _photo_file(url: str):
    return UPLOADS_DIR / url.removeprefix("/uploads/")


def _png(color: str = "blue") -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (40, 30), color=color).save(buf, format="PNG")
    return buf.getvalue()


def test_set_photo_gallery(auth_client):
    first = _upload_photo(auth_client)
    set_id = auth_client.post("/api/sets", json={**FIRE_STATION, "photo": first}).json()["id"]

    added = auth_client.post(f"/api/sets/{set_id}/photos", files={"file": ("b.png", _png(), "image/png")}).json()
    assert added["isPrimary"] is False

    primary = auth_client.patch(f"/api/sets/{set_id}/photos/{added['id']}/primary").json()
    body = auth_client.get(f"/api/sets/{set_id}").json()
    assert primary["isPrimary"] is True
    assert body["photo"] == added["url"]
    assert [p["url"] for p in body["photos"]] == [added["url"], first]

    # Deleting the primary promotes the next one and removes the file.
    auth_client.delete(f"/api/sets/{set_id}/photos/{added['id']}")
    body = auth_client.get(f"/api/sets/{set_id}").json()
    assert body["photo"] == first
    assert not _photo_file(added["url"]).exists()

    auth_client.delete(f"/api/sets/{set_id}")
    assert not _photo_file(first).exists()


def test_set_photo_routes_404_for_unknown_set(auth_client):
    response = auth_client.post("/api/sets/999/photos", files={"file": ("b.png", _png(), "image/png")})
    assert response.status_code == 404


def test_sets_have_series_condition_and_tags(auth_client):
    body = auth_client.post(
        "/api/sets",
        json={**FIRE_STATION, "series": "Hot Wheels City", "condition": "near_mint", "tags": ["Kids", "Loop"]},
    ).json()

    assert body["seriesName"] == "Hot Wheels City"
    assert body["condition"] == "near_mint"
    assert [t["name"] for t in body["tags"]] == ["Kids", "Loop"]

    updated = auth_client.patch(f"/api/sets/{body['id']}", json={"tags": ["Kids"], "series": None}).json()
    assert [t["name"] for t in updated["tags"]] == ["Kids"]
    assert updated["seriesName"] is None


def test_series_and_tags_used_by_sets(auth_client):
    set_id = auth_client.post("/api/sets", json={**FIRE_STATION, "series": "Hot Wheels City", "tags": ["Kids"]}).json()[
        "id"
    ]
    series_id = auth_client.get("/api/series").json()[0]["id"]
    assert auth_client.delete(f"/api/series/{series_id}").status_code == 409

    tag_id = auth_client.get("/api/tags").json()[0]["id"]
    assert auth_client.delete(f"/api/tags/{tag_id}").status_code == 204
    assert auth_client.get(f"/api/sets/{set_id}").json()["tags"] == []


def test_vehicles_and_sets_link_from_either_side(auth_client):
    backdrafter = auth_client.post("/api/cars", json={"name": "Backdrafter", "manufacturer": "Hot Wheels"}).json()
    pursuit = auth_client.post(
        "/api/cars", json={"name": "HW Pursuit", "manufacturer": "Hot Wheels", "status": "wishlist"}
    ).json()
    station = auth_client.post(
        "/api/sets", json={**FIRE_STATION, "vehicleIds": [pursuit["id"], backdrafter["id"], 999]}
    ).json()
    garage = auth_client.post("/api/sets", json={"name": "Action Garage", "manufacturer": "Matchbox"}).json()

    # From the set side: unknown ids are ignored, names come back sorted.
    assert [v["name"] for v in station["vehicles"]] == ["Backdrafter", "HW Pursuit"]
    assert [v["status"] for v in station["vehicles"]] == ["owned", "wishlist"]
    assert [s["name"] for s in auth_client.get(f"/api/cars/{backdrafter['id']}").json()["sets"]] == [
        "Downtown Fire Station Spinout"
    ]

    # From the vehicle side: replaces that vehicle's links only.
    auth_client.patch(f"/api/cars/{backdrafter['id']}", json={"setIds": [garage["id"]]})
    assert [v["name"] for v in auth_client.get(f"/api/sets/{station['id']}").json()["vehicles"]] == ["HW Pursuit"]
    assert [v["name"] for v in auth_client.get(f"/api/sets/{garage['id']}").json()["vehicles"]] == ["Backdrafter"]

    # A vehicle created with sets, and links cleaned up when either side is deleted.
    new_car = auth_client.post(
        "/api/cars", json={"name": "Fire Truck", "manufacturer": "Hot Wheels", "setIds": [station["id"]]}
    ).json()
    assert [s["name"] for s in new_car["sets"]] == ["Downtown Fire Station Spinout"]
    auth_client.delete(f"/api/cars/{pursuit['id']}")
    assert [v["name"] for v in auth_client.get(f"/api/sets/{station['id']}").json()["vehicles"]] == ["Fire Truck"]
    auth_client.delete(f"/api/sets/{station['id']}")
    assert auth_client.get(f"/api/cars/{new_car['id']}").json()["sets"] == []


def test_series_overview_counts_vehicles_and_sets_and_filters_sets(auth_client):
    auth_client.post(
        "/api/cars", json={"name": "Backdrafter", "manufacturer": "Hot Wheels", "series": "HW City", "year": 2020}
    )
    auth_client.post("/api/sets", json={**FIRE_STATION, "series": "HW City"})
    auth_client.post("/api/sets", json={"name": "Action Garage", "manufacturer": "Hot Wheels"})
    auth_client.post("/api/series", json={"name": "Empty", "manufacturer": "Hot Wheels"})

    overview = auth_client.get("/api/series/overview").json()
    assert [(s["name"], s["year"], s["carCount"], s["setCount"]) for s in overview] == [
        ("HW City", 2020, 1, 1),
        ("Empty", None, 0, 0),
    ]
    assert overview[0]["manufacturerName"] == "Hot Wheels"

    sets = auth_client.get("/api/sets", params={"seriesId": overview[0]["id"]}).json()
    assert [s["name"] for s in sets] == ["Downtown Fire Station Spinout"]


def test_series_overview_splits_a_series_by_year(auth_client):
    # Hot Wheels reuses "Batman 5-Pack" for a different pack every year.
    cars = [("Batcopter", 2024), ("Boom Box", 2024), ("Batman & Robin Batmobile", 2027), ("HI-Roller", None)]
    for name, year in cars:
        auth_client.post(
            "/api/cars", json={"name": name, "manufacturer": "Hot Wheels", "series": "Batman 5-Pack", "year": year}
        )

    overview = auth_client.get("/api/series/overview").json()

    assert [(s["name"], s["year"], s["carCount"]) for s in overview] == [
        ("Batman 5-Pack", 2024, 2),
        ("Batman 5-Pack", 2027, 1),
        ("Batman 5-Pack", None, 1),
    ]
    assert len({s["id"] for s in overview}) == 1


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


def test_backup_round_trip_keeps_set_gallery_tags_and_links(auth_client):
    car = auth_client.post("/api/cars", json={"name": "Backdrafter", "manufacturer": "Hot Wheels"}).json()
    photo = _upload_photo(auth_client)
    auth_client.post(
        "/api/sets",
        json={
            **FIRE_STATION,
            "photo": photo,
            "series": "Hot Wheels City",
            "condition": "good",
            "tags": ["Kids"],
            "vehicleIds": [car["id"]],
        },
    )
    backup = auth_client.get("/api/export/backup")
    assert backup.json()["sets"][0]["vehicleIds"] == [car["id"]]

    auth_client.post(
        "/api/import/backup", files={"file": ("backup.json", io.BytesIO(backup.content), "application/json")}
    )

    restored = auth_client.get("/api/sets").json()[0]
    assert restored["photo"] == photo
    assert restored["seriesName"] == "Hot Wheels City"
    assert restored["condition"] == "good"
    assert [t["name"] for t in restored["tags"]] == ["Kids"]
    assert [v["name"] for v in restored["vehicles"]] == ["Backdrafter"]


def test_v4_backup_set_photo_restores_as_primary(auth_client):
    payload = {
        "version": 4,
        "exportedAt": "2026-10-20T00:00:00+00:00",
        "manufacturers": [{"id": 1, "name": "Hot Wheels"}],
        "series": [],
        "vehicleTypes": [],
        "colors": [],
        "tags": [],
        "cars": [],
        "sets": [
            {
                "id": 1,
                "name": "Fire Station",
                "manufacturerId": 1,
                "setType": "playset",
                "toyNumber": None,
                "year": None,
                "status": "owned",
                "sealed": False,
                "quantity": 1,
                "purchasePrice": None,
                "notes": None,
                "photo": "/uploads/car-images/old.jpg",
            }
        ],
    }
    auth_client.post(
        "/api/import/backup",
        files={"file": ("backup.json", io.BytesIO(json.dumps(payload).encode()), "application/json")},
    )

    restored = auth_client.get("/api/sets").json()[0]
    assert restored["photo"] == "/uploads/car-images/old.jpg"
    assert restored["photos"][0]["isPrimary"] is True


def test_dashboard_collection_value_counts_owned_cars_and_sets_with_quantity(auth_client):
    hot_wheels = {"manufacturer": "Hot Wheels"}
    auth_client.post("/api/cars", json={**hot_wheels, "name": "A", "purchasePrice": 1.5, "quantity": 2})
    auth_client.post("/api/cars", json={**hot_wheels, "name": "B", "purchasePrice": 9, "status": "wishlist"})
    auth_client.post("/api/cars", json={**hot_wheels, "name": "C"})
    auth_client.post("/api/sets", json={**FIRE_STATION, "purchasePrice": 30})

    assert auth_client.get("/api/dashboard").json()["collectionValue"] == 33.0
