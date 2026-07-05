def test_list_tags_requires_auth(client):
    response = client.get("/api/tags")

    assert response.status_code == 401


def test_create_tag_is_idempotent_by_name(auth_client):
    first = auth_client.post("/api/tags", json={"name": "Favorite", "color": "#ff0000"})
    second = auth_client.post("/api/tags", json={"name": "Favorite"})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]


def test_delete_tag_not_found(auth_client):
    response = auth_client.delete("/api/tags/999")

    assert response.status_code == 404


def test_delete_tag_removes_it_from_cars(auth_client):
    tag = auth_client.post("/api/tags", json={"name": "Favorite"}).json()
    car = auth_client.post("/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels", "tags": ["Favorite"]}).json()
    assert car["tags"][0]["name"] == "Favorite"

    response = auth_client.delete(f"/api/tags/{tag['id']}")
    assert response.status_code == 204

    refreshed = auth_client.get(f"/api/cars/{car['id']}").json()
    assert refreshed["tags"] == []
