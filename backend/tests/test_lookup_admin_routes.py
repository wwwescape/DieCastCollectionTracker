"""Settings → Lookups: usage counts, rename and merge (app/services/lookup_service.py)."""


def _car(client, **fields):
    body = {"name": "Car", "manufacturer": "Hot Wheels", **fields}
    return client.post("/api/cars", json=body).json()


def _usage(client, kind):
    return {row["id"]: row for row in client.get("/api/lookups/usage").json()[kind]}


def _id(client, path, name):
    return next(entry["id"] for entry in client.get(path).json() if entry["name"] == name)


def test_usage_requires_auth(client):
    assert client.get("/api/lookups/usage").status_code == 401


def test_usage_counts_items_and_flags_wiki_backed_entries(auth_client):
    _car(auth_client, color="Red", catalogSource="hotwheels", catalogTitle="Bone Shaker")
    _car(auth_client, color="Blue", vehicleType="Truck", tags=["JDM"])
    _car(auth_client, color="Blue")
    auth_client.post("/api/colors", json={"name": "Unused"})

    colors = _usage(auth_client, "colors")
    red, blue, unused = (_id(auth_client, "/api/colors", name) for name in ("Red", "Blue", "Unused"))
    assert colors[red] == {"id": red, "carCount": 1, "setCount": 0, "wikiBacked": True}
    assert colors[blue]["carCount"] == 2 and not colors[blue]["wikiBacked"]
    assert colors[unused]["carCount"] == 0

    # The wiki never fills vehicle types or tags.
    assert not any(row["wikiBacked"] for row in _usage(auth_client, "vehicleTypes").values())
    tags = _usage(auth_client, "tags")
    assert tags[_id(auth_client, "/api/tags", "JDM")]["carCount"] == 1


def test_rename_changes_the_name_everywhere(auth_client):
    car = _car(auth_client, color="Dark blue")
    color_id = car["colorId"]

    response = auth_client.patch(f"/api/lookups/colors/{color_id}", json={"name": "Navy"})

    assert response.status_code == 200
    assert response.json()["name"] == "Navy"
    assert auth_client.get(f"/api/cars/{car['id']}").json()["colorName"] == "Navy"


def test_rename_is_refused_for_wiki_backed_entries(auth_client):
    car = _car(auth_client, color="Red", catalogSource="hotwheels", catalogTitle="Bone Shaker")

    response = auth_client.patch(f"/api/lookups/colors/{car['colorId']}", json={"name": "Crimson"})

    assert response.status_code == 409
    assert auth_client.get(f"/api/cars/{car['id']}").json()["colorName"] == "Red"


def test_rename_to_an_existing_name_is_refused(auth_client):
    car = _car(auth_client, color="Dark blue")
    auth_client.post("/api/colors", json={"name": "Dark Blue"})

    response = auth_client.patch(f"/api/lookups/colors/{car['colorId']}", json={"name": "Dark Blue"})

    assert response.status_code == 409
    assert "Merge" in response.json()["detail"]


def test_rename_can_change_only_the_case(auth_client):
    car = _car(auth_client, color="dark blue")

    response = auth_client.patch(f"/api/lookups/colors/{car['colorId']}", json={"name": "Dark Blue"})

    assert response.status_code == 200


def test_rename_tag_can_set_and_keep_its_color(auth_client):
    tag = auth_client.post("/api/tags", json={"name": "Fav", "color": "#ff0000"}).json()

    renamed = auth_client.patch(f"/api/lookups/tags/{tag['id']}", json={"name": "Favorite"}).json()
    assert renamed == {"id": tag["id"], "name": "Favorite", "color": "#ff0000"}

    recolored = auth_client.patch(f"/api/lookups/tags/{tag['id']}", json={"name": "Favorite", "color": None}).json()
    assert recolored["color"] is None


def test_rename_validates_name_and_kind(auth_client):
    car = _car(auth_client, color="Red")

    assert auth_client.patch(f"/api/lookups/colors/{car['colorId']}", json={"name": "  "}).status_code == 422
    assert auth_client.patch(f"/api/lookups/colors/{car['colorId']}", json={"name": "x" * 101}).status_code == 422
    assert auth_client.patch("/api/lookups/colors/999", json={"name": "Blue"}).status_code == 404
    assert auth_client.patch("/api/lookups/nope/1", json={"name": "Blue"}).status_code == 404


def test_merge_moves_items_and_deletes_the_duplicate(auth_client):
    first = _car(auth_client, color="Dark blue")
    second = _car(auth_client, color="Dark Blue")

    response = auth_client.post(
        f"/api/lookups/colors/{first['colorId']}/merge", json={"intoId": second["colorId"]}
    )

    assert response.status_code == 200
    assert auth_client.get(f"/api/cars/{first['id']}").json()["colorName"] == "Dark Blue"
    assert [c["name"] for c in auth_client.get("/api/colors").json()] == ["Dark Blue"]


def test_merge_into_a_wiki_backed_entry_is_allowed_but_not_out_of_one(auth_client):
    wiki = _car(auth_client, color="Red", catalogSource="hotwheels", catalogTitle="Bone Shaker")
    custom = _car(auth_client, color="red")

    out_of_wiki = auth_client.post(f"/api/lookups/colors/{wiki['colorId']}/merge", json={"intoId": custom["colorId"]})
    into_wiki = auth_client.post(f"/api/lookups/colors/{custom['colorId']}/merge", json={"intoId": wiki["colorId"]})

    assert out_of_wiki.status_code == 409
    assert into_wiki.status_code == 200
    assert auth_client.get(f"/api/cars/{custom['id']}").json()["colorName"] == "Red"


def test_merge_into_itself_is_refused(auth_client):
    car = _car(auth_client, color="Red")

    response = auth_client.post(f"/api/lookups/colors/{car['colorId']}/merge", json={"intoId": car["colorId"]})

    assert response.status_code == 409


def test_merge_series_only_within_a_manufacturer(auth_client):
    hot_wheels = _car(auth_client, series="Exotics")
    hot_wheels_twin = _car(auth_client, series="HW Exotics")
    matchbox = _car(auth_client, manufacturer="Matchbox", series="Exotic")

    across = auth_client.post(
        f"/api/lookups/series/{matchbox['seriesId']}/merge", json={"intoId": hot_wheels['seriesId']}
    )
    within = auth_client.post(
        f"/api/lookups/series/{hot_wheels['seriesId']}/merge", json={"intoId": hot_wheels_twin['seriesId']}
    )

    assert across.status_code == 409
    assert within.status_code == 200
    assert auth_client.get(f"/api/cars/{hot_wheels['id']}").json()["seriesName"] == "HW Exotics"


def test_merge_tags_keeps_one_link_per_item(auth_client):
    both = _car(auth_client, tags=["Fav", "Favorite"])
    only_old = _car(auth_client, tags=["Fav"])
    fav, favorite = _id(auth_client, "/api/tags", "Fav"), _id(auth_client, "/api/tags", "Favorite")

    response = auth_client.post(f"/api/lookups/tags/{fav}/merge", json={"intoId": favorite})

    assert response.status_code == 200
    assert [t["name"] for t in auth_client.get(f"/api/cars/{both['id']}").json()["tags"]] == ["Favorite"]
    assert [t["name"] for t in auth_client.get(f"/api/cars/{only_old['id']}").json()["tags"]] == ["Favorite"]


def test_merge_manufacturers_moves_their_series_too(auth_client):
    typo = _car(auth_client, manufacturer="Hotwheels", series="Mainline")
    _car(auth_client, manufacturer="Hot Wheels", series="Mainline")
    other = _car(auth_client, manufacturer="Hotwheels", series="Treasure Hunt")
    target = _id(auth_client, "/api/manufacturers", "Hot Wheels")

    response = auth_client.post(f"/api/lookups/manufacturers/{typo['manufacturerId']}/merge", json={"intoId": target})

    assert response.status_code == 200
    moved = auth_client.get(f"/api/cars/{typo['id']}").json()
    assert moved["manufacturerName"] == "Hot Wheels" and moved["seriesName"] == "Mainline"
    assert auth_client.get(f"/api/cars/{other['id']}").json()["seriesName"] == "Treasure Hunt"
    hot_wheels_series = [s["name"] for s in auth_client.get(f"/api/series?manufacturerId={target}").json()]
    assert hot_wheels_series.count("Mainline") == 1 and "Treasure Hunt" in hot_wheels_series
