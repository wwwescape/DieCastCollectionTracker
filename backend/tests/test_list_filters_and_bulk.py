import pytest


def _car(auth_client, name: str, **fields) -> int:
    response = auth_client.post("/api/cars", json={"name": name, "manufacturer": "Hot Wheels", **fields})
    assert response.status_code == 201
    return response.json()["id"]


def _set(auth_client, name: str, **fields) -> int:
    response = auth_client.post("/api/sets", json={"name": name, "manufacturer": "Hot Wheels", **fields})
    assert response.status_code == 201
    return response.json()["id"]


def _names(response) -> list[str]:
    assert response.status_code == 200
    return [item["name"] for item in response.json()]


@pytest.fixture()
def garage(auth_client):
    """Five vehicles covering every filter dimension."""
    ids = {
        "Skyline": _car(
            auth_client,
            "Skyline",
            series="HW J-Imports",
            color="Red",
            condition="mint_in_box",
            tags=["JDM", "Favorite"],
            year=2024,
            catalogSource="hotwheels",
            catalogTitle="Nissan Skyline",
        ),
        "Supra": _car(auth_client, "Supra", series="HW J-Imports", tags=["JDM"], year=2020),
        "Camaro": _car(auth_client, "Camaro", color="Blue", condition="good", tags=["Favorite"], year=2022),
        "Fire Truck": _car(auth_client, "Fire Truck", manufacturer="Matchbox", status="wishlist"),
        "Bus": _car(auth_client, "Bus", manufacturer="Matchbox", series="MBX Metro", notes="Bought at the fair"),
    }
    return ids


def _manufacturer_id(auth_client, name: str) -> int:
    return next(m["id"] for m in auth_client.get("/api/manufacturers").json() if m["name"] == name)


def _tag_id(auth_client, name: str) -> int:
    return next(t["id"] for t in auth_client.get("/api/tags").json() if t["name"] == name)


def test_several_values_match_any_and_exclude(auth_client, garage):
    hot_wheels = _manufacturer_id(auth_client, "Hot Wheels")
    matchbox = _manufacturer_id(auth_client, "Matchbox")

    both = auth_client.get("/api/cars", params={"manufacturerId": [hot_wheels, matchbox]})
    not_hot_wheels = auth_client.get("/api/cars", params={"manufacturerId": hot_wheels, "manufacturerExclude": True})

    assert len(_names(both)) == 5
    assert _names(not_hot_wheels) == ["Bus", "Fire Truck"]


def test_excluding_a_nullable_field_keeps_empty_rows(auth_client, garage):
    j_imports = next(s["id"] for s in auth_client.get("/api/series").json() if s["name"] == "HW J-Imports")

    response = auth_client.get("/api/cars", params={"seriesId": j_imports, "seriesExclude": True})

    # No series at all counts as "not HW J-Imports".
    assert _names(response) == ["Bus", "Camaro", "Fire Truck"]


def test_tag_match_any_all_and_exclude(auth_client, garage):
    jdm, favorite = _tag_id(auth_client, "JDM"), _tag_id(auth_client, "Favorite")

    any_ = auth_client.get("/api/cars", params={"tagId": [jdm, favorite]})
    all_ = auth_client.get("/api/cars", params={"tagId": [jdm, favorite], "tagMatchAll": True})
    none_ = auth_client.get("/api/cars", params={"tagId": [jdm, favorite], "tagExclude": True})

    assert _names(any_) == ["Camaro", "Skyline", "Supra"]
    assert _names(all_) == ["Skyline"]
    assert _names(none_) == ["Bus", "Fire Truck"]


def test_status_condition_and_source(auth_client, garage):
    assert _names(auth_client.get("/api/cars", params={"status": "wishlist"})) == ["Fire Truck"]
    assert _names(auth_client.get("/api/cars", params={"status": ["owned", "wishlist"]})) == [
        "Bus",
        "Camaro",
        "Fire Truck",
        "Skyline",
        "Supra",
    ]
    assert _names(auth_client.get("/api/cars", params={"condition": ["mint_in_box", "good"]})) == ["Camaro", "Skyline"]
    assert _names(auth_client.get("/api/cars", params={"source": "wiki"})) == ["Skyline"]
    assert "Skyline" not in _names(auth_client.get("/api/cars", params={"source": "custom"}))
    assert _names(auth_client.get("/api/cars", params={"source": "wiki", "sourceExclude": True})) == [
        "Bus",
        "Camaro",
        "Fire Truck",
        "Supra",
    ]


def test_search_covers_series_manufacturer_color_and_notes(auth_client, garage):
    assert _names(auth_client.get("/api/cars", params={"search": "j-imports"})) == ["Skyline", "Supra"]
    assert _names(auth_client.get("/api/cars", params={"search": "matchbox"})) == ["Bus", "Fire Truck"]
    assert _names(auth_client.get("/api/cars", params={"search": "blue"})) == ["Camaro"]
    assert _names(auth_client.get("/api/cars", params={"search": "fair"})) == ["Bus"]


def test_sort_puts_empty_values_last_both_ways(auth_client, garage):
    newest = _names(auth_client.get("/api/cars", params={"sort": "year", "order": "desc"}))
    oldest = _names(auth_client.get("/api/cars", params={"sort": "year", "order": "asc"}))

    assert newest == ["Skyline", "Camaro", "Supra", "Bus", "Fire Truck"]
    assert oldest == ["Supra", "Camaro", "Skyline", "Bus", "Fire Truck"]


def test_set_filters(auth_client):
    _set(auth_client, "Fire Station", set_type="playset", tags=["City"], sealed=True)
    _set(auth_client, "Loop Track", setType="track_set", sealed=False, tags=["City", "Track"])
    _set(auth_client, "Garage", status="wishlist", catalogSource="hotwheels", catalogTitle="Garage")
    city = _tag_id(auth_client, "City")

    assert _names(auth_client.get("/api/sets", params={"setType": "track_set"})) == ["Loop Track"]
    assert _names(auth_client.get("/api/sets", params={"setType": "track_set", "setTypeExclude": True})) == [
        "Fire Station",
        "Garage",
    ]
    assert _names(auth_client.get("/api/sets", params={"sealed": "opened"})) == ["Loop Track"]
    assert _names(auth_client.get("/api/sets", params={"tagId": city, "tagExclude": True})) == ["Garage"]
    assert _names(auth_client.get("/api/sets", params={"source": "wiki"})) == ["Garage"]
    assert _names(auth_client.get("/api/sets", params={"status": "wishlist", "statusExclude": True})) == [
        "Fire Station",
        "Loop Track",
    ]


def test_bulk_edit_changes_only_the_fields_sent(auth_client, garage):
    ids = [garage["Skyline"], garage["Camaro"]]

    response = auth_client.post("/api/cars/bulk-edit", json={"ids": ids, "status": "wishlist"})

    assert response.status_code == 200
    assert response.json() == {"count": 2}
    skyline = auth_client.get(f"/api/cars/{garage['Skyline']}").json()
    assert skyline["status"] == "wishlist"
    assert skyline["condition"] == "mint_in_box"  # untouched
    assert skyline["seriesName"] == "HW J-Imports"  # untouched


def test_bulk_edit_clears_condition_and_series(auth_client, garage):
    ids = [garage["Skyline"], garage["Camaro"]]

    auth_client.post("/api/cars/bulk-edit", json={"ids": ids, "condition": None, "series": None})

    for car_id in ids:
        car = auth_client.get(f"/api/cars/{car_id}").json()
        assert car["condition"] is None
        assert car["seriesName"] is None


def test_bulk_edit_series_is_scoped_to_each_manufacturer(auth_client, garage):
    ids = [garage["Camaro"], garage["Bus"]]

    auth_client.post("/api/cars/bulk-edit", json={"ids": ids, "series": "Holiday Racers"})

    series = [s for s in auth_client.get("/api/series").json() if s["name"] == "Holiday Racers"]
    assert sorted(s["manufacturerName"] for s in series) == ["Hot Wheels", "Matchbox"]
    camaro = auth_client.get(f"/api/cars/{garage['Camaro']}").json()
    bus = auth_client.get(f"/api/cars/{garage['Bus']}").json()
    assert camaro["seriesName"] == bus["seriesName"] == "Holiday Racers"
    assert camaro["seriesId"] != bus["seriesId"]


def test_bulk_edit_adds_and_removes_tags_and_reports_coverage(auth_client, garage):
    ids = [garage["Skyline"], garage["Supra"], garage["Bus"]]
    jdm = _tag_id(auth_client, "JDM")

    auth_client.post("/api/cars/bulk-edit", json={"ids": ids, "addTags": ["Keepers", " "], "removeTagIds": [jdm]})

    for car_id in ids:
        tags = {t["name"] for t in auth_client.get(f"/api/cars/{car_id}").json()["tags"]}
        assert "Keepers" in tags and "JDM" not in tags
    coverage = auth_client.post("/api/tags/coverage", json={"vehicleIds": ids}).json()
    counts = {tag["name"]: tag["count"] for tag in coverage}
    assert counts == {"Favorite": 1, "JDM": 0, "Keepers": 3}


def test_tag_coverage_counts_sets_too(auth_client, garage):
    set_id = _set(auth_client, "Fire Station", tags=["Favorite"])

    coverage = auth_client.post(
        "/api/tags/coverage", json={"vehicleIds": [garage["Camaro"]], "setIds": [set_id]}
    ).json()

    assert {tag["name"]: tag["count"] for tag in coverage}["Favorite"] == 2


def test_bulk_edit_and_delete_sets(auth_client):
    ids = [_set(auth_client, "Fire Station"), _set(auth_client, "Loop Track")]

    edited = auth_client.post("/api/sets/bulk-edit", json={"ids": ids, "condition": "good", "addTags": ["City"]})
    assert edited.json() == {"count": 2}
    assert all(s["condition"] == "good" for s in auth_client.get("/api/sets").json())

    deleted = auth_client.post("/api/sets/bulk-delete", json={"ids": [*ids, 999]})
    assert deleted.json() == {"count": 2}
    assert auth_client.get("/api/sets").json() == []


def test_bulk_delete_skips_unknown_ids(auth_client, garage):
    response = auth_client.post("/api/cars/bulk-delete", json={"ids": [garage["Bus"], 9999]})

    assert response.json() == {"count": 1}
    assert "Bus" not in _names(auth_client.get("/api/cars"))


def test_bulk_requests_validate(auth_client):
    assert auth_client.post("/api/cars/bulk-edit", json={"ids": []}).status_code == 422
    assert auth_client.post("/api/cars/bulk-edit", json={"ids": [1], "status": "lost"}).status_code == 422
    assert auth_client.post("/api/sets/bulk-delete", json={"ids": []}).status_code == 422


def test_bulk_endpoints_require_auth(client):
    assert client.post("/api/cars/bulk-edit", json={"ids": [1]}).status_code == 401
    assert client.post("/api/sets/bulk-delete", json={"ids": [1]}).status_code == 401
    assert client.post("/api/tags/coverage", json={}).status_code == 401
