def test_dashboard_requires_auth(client):
    response = client.get("/api/dashboard")

    assert response.status_code == 401


def test_dashboard_empty_db(auth_client):
    response = auth_client.get("/api/dashboard")

    assert response.status_code == 200
    body = response.json()
    assert body["totalCars"] == 0
    assert body["totalQuantity"] == 0
    assert body["ownedCount"] == 0
    assert body["wishlistCount"] == 0
    assert body["byManufacturer"] == []
    assert body["byVehicleType"] == []
    assert body["recentlyAdded"] == []


def test_dashboard_counts(auth_client):
    auth_client.post(
        "/api/cars",
        json={"name": "Car A", "manufacturer": "Hot Wheels", "status": "owned", "quantity": 2},
    )
    auth_client.post("/api/cars", json={"name": "Car B", "manufacturer": "Matchbox", "status": "wishlist"})
    auth_client.post("/api/cars", json={"name": "Car C", "manufacturer": "Hot Wheels", "status": "owned"})

    response = auth_client.get("/api/dashboard")

    assert response.status_code == 200
    body = response.json()
    assert body["totalCars"] == 3
    assert body["totalQuantity"] == 4  # 2 + 1 + 1
    assert body["ownedCount"] == 2
    assert body["wishlistCount"] == 1


def test_dashboard_by_manufacturer(auth_client):
    auth_client.post("/api/cars", json={"name": "Car A", "manufacturer": "Hot Wheels"})
    auth_client.post("/api/cars", json={"name": "Car B", "manufacturer": "Hot Wheels"})
    auth_client.post("/api/cars", json={"name": "Car C", "manufacturer": "Matchbox"})

    response = auth_client.get("/api/dashboard")

    body = response.json()
    mfr_data = {row["manufacturerName"]: row["carCount"] for row in body["byManufacturer"]}
    assert mfr_data["Hot Wheels"] == 2
    assert mfr_data["Matchbox"] == 1
    # Hot Wheels should appear first (higher count)
    assert body["byManufacturer"][0]["manufacturerName"] == "Hot Wheels"


def test_dashboard_by_vehicle_type(auth_client):
    auth_client.post("/api/cars", json={"name": "Car A", "manufacturer": "HW", "vehicleType": "Car"})
    auth_client.post("/api/cars", json={"name": "Car B", "manufacturer": "HW", "vehicleType": "Car"})
    auth_client.post("/api/cars", json={"name": "Truck C", "manufacturer": "HW", "vehicleType": "Truck"})

    response = auth_client.get("/api/dashboard")

    body = response.json()
    vt_data = {row["vehicleTypeName"]: row["carCount"] for row in body["byVehicleType"]}
    assert vt_data["Car"] == 2
    assert vt_data["Truck"] == 1


def test_dashboard_recently_added(auth_client):
    for i in range(7):
        auth_client.post("/api/cars", json={"name": f"Car {i}", "manufacturer": "HW"})

    response = auth_client.get("/api/dashboard")

    body = response.json()
    # Only the 5 most-recently-added cars are returned
    assert len(body["recentlyAdded"]) == 5
    names = {c["name"] for c in body["recentlyAdded"]}
    assert len(names) == 5
