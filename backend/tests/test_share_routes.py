def test_share_link_requires_auth(client):
    assert client.get("/api/share-link").status_code == 401
    assert client.post("/api/share-link/regenerate").status_code == 401


def test_share_link_is_stable_until_regenerated(auth_client):
    first = auth_client.get("/api/share-link").json()["token"]
    assert auth_client.get("/api/share-link").json()["token"] == first

    regenerated = auth_client.post("/api/share-link/regenerate").json()["token"]

    assert regenerated != first
    assert auth_client.get(f"/api/public/{first}/cars").status_code == 404
    assert auth_client.get(f"/api/public/{regenerated}/cars").status_code == 200


def test_public_lists_hide_owner_data(auth_client, client):
    auth_client.post(
        "/api/cars",
        json={
            "name": "Backdrafter",
            "manufacturer": "Hot Wheels",
            "purchasePrice": 1.25,
            "notes": "Private note",
            "tags": ["Secret"],
        },
    )
    auth_client.post(
        "/api/sets",
        json={"name": "Fire Station", "manufacturer": "Hot Wheels", "purchasePrice": 30, "notes": "Gift"},
    )
    token = auth_client.get("/api/share-link").json()["token"]
    client.headers.pop("Authorization", None)

    cars = client.get(f"/api/public/{token}/cars").json()
    sets = client.get(f"/api/public/{token}/sets", params={"search": "fire"}).json()

    assert [car["name"] for car in cars] == ["Backdrafter"]
    assert cars[0]["manufacturerName"] == "Hot Wheels"
    for hidden in ("purchasePrice", "notes", "tags"):
        assert hidden not in cars[0]
        assert hidden not in sets[0]
    assert [s["name"] for s in sets] == ["Fire Station"]


def test_unknown_share_token_is_404(client):
    assert client.get("/api/public/not-a-token/cars").status_code == 404
    assert client.get("/api/public/not-a-token/sets").status_code == 404
