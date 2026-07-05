def test_list_manufacturers_requires_auth(client):
    response = client.get("/api/manufacturers")

    assert response.status_code == 401


def test_create_manufacturer_is_idempotent_by_name(auth_client):
    first = auth_client.post("/api/manufacturers", json={"name": "Hot Wheels"})
    second = auth_client.post("/api/manufacturers", json={"name": "Hot Wheels"})

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["id"] == second.json()["id"]

    response = auth_client.get("/api/manufacturers")
    assert len(response.json()) == 1


def test_delete_manufacturer_not_found(auth_client):
    response = auth_client.delete("/api/manufacturers/999")

    assert response.status_code == 404


def test_delete_manufacturer_conflicts_when_in_use(auth_client):
    manufacturer = auth_client.post("/api/manufacturers", json={"name": "Hot Wheels"}).json()
    auth_client.post("/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels"})

    response = auth_client.delete(f"/api/manufacturers/{manufacturer['id']}")

    assert response.status_code == 409


def test_delete_manufacturer_succeeds_when_unused(auth_client):
    manufacturer = auth_client.post("/api/manufacturers", json={"name": "Hot Wheels"}).json()

    response = auth_client.delete(f"/api/manufacturers/{manufacturer['id']}")

    assert response.status_code == 204
    assert auth_client.get("/api/manufacturers").json() == []


def test_series_list_includes_manufacturer_scoped_and_unscoped(auth_client):
    hot_wheels = auth_client.post("/api/manufacturers", json={"name": "Hot Wheels"}).json()
    matchbox = auth_client.post("/api/manufacturers", json={"name": "Matchbox"}).json()
    auth_client.post("/api/series", json={"name": "Treasure Hunt", "manufacturer": "Hot Wheels"})
    auth_client.post("/api/series", json={"name": "Unscoped Series"})
    auth_client.post("/api/series", json={"name": "Matchbox Only", "manufacturer": "Matchbox"})

    response = auth_client.get("/api/series", params={"manufacturerId": hot_wheels["id"]})
    names = {s["name"] for s in response.json()}
    assert names == {"Treasure Hunt", "Unscoped Series"}

    response = auth_client.get("/api/series", params={"manufacturerId": matchbox["id"]})
    names = {s["name"] for s in response.json()}
    assert names == {"Matchbox Only", "Unscoped Series"}


def test_vehicle_type_and_color_crud(auth_client):
    vt = auth_client.post("/api/vehicle-types", json={"name": "Monster Truck"}).json()
    assert auth_client.get("/api/vehicle-types").json()[0]["name"] == "Monster Truck"

    color = auth_client.post("/api/colors", json={"name": "Spectraflame Green"}).json()
    assert auth_client.get("/api/colors").json()[0]["name"] == "Spectraflame Green"

    assert auth_client.delete(f"/api/vehicle-types/{vt['id']}").status_code == 204
    assert auth_client.delete(f"/api/colors/{color['id']}").status_code == 204
