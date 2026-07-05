from app.models.lookups import Color, Manufacturer, Series, VehicleType


def test_list_cars_requires_auth(client):
    response = client.get("/api/cars")

    assert response.status_code == 401


def test_create_car_resolves_lookups_by_name_creating_new_rows(auth_client, db_session):
    response = auth_client.post(
        "/api/cars",
        json={
            "name": "Custom '67 Camaro",
            "manufacturer": "Hot Wheels",
            "series": "Treasure Hunt",
            "vehicleType": "Car",
            "color": "Spectraflame Green",
            "castNumber": "HW Exotics 3/5",
            "year": 2024,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Custom '67 Camaro"
    assert body["manufacturerName"] == "Hot Wheels"
    assert body["seriesName"] == "Treasure Hunt"
    assert body["vehicleTypeName"] == "Car"
    assert body["colorName"] == "Spectraflame Green"
    assert body["status"] == "owned"
    assert body["quantity"] == 1
    assert body["tags"] == []

    # Re-posting the same manufacturer name reuses the row rather than duplicating it.
    auth_client.post(
        "/api/cars", json={"name": "Another Car", "manufacturer": "Hot Wheels", "vehicleType": "Car"}
    )
    assert db_session.query(Manufacturer).filter_by(name="Hot Wheels").count() == 1


def test_create_car_with_tags(auth_client):
    response = auth_client.post(
        "/api/cars",
        json={"name": "Skyline GT-R", "manufacturer": "Matchbox", "tags": ["JDM", "Favorite"]},
    )

    assert response.status_code == 201
    tag_names = {tag["name"] for tag in response.json()["tags"]}
    assert tag_names == {"JDM", "Favorite"}


def test_series_scoped_to_manufacturer(auth_client, db_session):
    auth_client.post(
        "/api/cars", json={"name": "Car A", "manufacturer": "Hot Wheels", "series": "Premium"}
    )

    series = db_session.query(Series).filter_by(name="Premium").one()
    manufacturer = db_session.query(Manufacturer).filter_by(name="Hot Wheels").one()
    assert series.manufacturer_id == manufacturer.id


def test_get_car_not_found(auth_client):
    response = auth_client.get("/api/cars/999")

    assert response.status_code == 404


def test_list_cars_filters_by_status_and_manufacturer(auth_client):
    auth_client.post(
        "/api/cars", json={"name": "Owned Car", "manufacturer": "Hot Wheels", "status": "owned"}
    )
    auth_client.post(
        "/api/cars", json={"name": "Wishlist Car", "manufacturer": "Hot Wheels", "status": "wishlist"}
    )
    auth_client.post(
        "/api/cars", json={"name": "Other Brand Car", "manufacturer": "Matchbox", "status": "owned"}
    )

    response = auth_client.get("/api/cars", params={"status": "owned"})
    names = {car["name"] for car in response.json()}
    assert names == {"Owned Car", "Other Brand Car"}

    response = auth_client.get(
        "/api/cars",
        params={
            "manufacturerId": next(
                c["manufacturerId"] for c in auth_client.get("/api/cars").json() if c["manufacturerName"] == "Matchbox"
            )
        },
    )
    assert {c["name"] for c in response.json()} == {"Other Brand Car"}


def test_list_cars_search_matches_name_and_cast_number(auth_client):
    auth_client.post(
        "/api/cars", json={"name": "Custom Camaro", "manufacturer": "Hot Wheels", "castNumber": "HWX 1/5"}
    )
    auth_client.post(
        "/api/cars", json={"name": "Mustang", "manufacturer": "Hot Wheels", "castNumber": "HWX 2/5"}
    )

    response = auth_client.get("/api/cars", params={"search": "camaro"})
    assert [car["name"] for car in response.json()] == ["Custom Camaro"]

    response = auth_client.get("/api/cars", params={"search": "2/5"})
    assert [car["name"] for car in response.json()] == ["Mustang"]


def test_update_car_partial_update_preserves_untouched_fields(auth_client):
    create = auth_client.post(
        "/api/cars", json={"name": "Original Name", "manufacturer": "Hot Wheels", "year": 2020}
    )
    car_id = create.json()["id"]

    response = auth_client.patch(f"/api/cars/{car_id}", json={"year": 2021})

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Original Name"
    assert body["year"] == 2021


def test_update_car_can_clear_nullable_lookup_field(auth_client):
    create = auth_client.post(
        "/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels", "color": "Red"}
    )
    car_id = create.json()["id"]

    response = auth_client.patch(f"/api/cars/{car_id}", json={"color": None})

    assert response.status_code == 200
    body = response.json()
    assert body["colorId"] is None
    assert body["colorName"] is None


def test_update_car_replaces_full_tag_set(auth_client):
    create = auth_client.post("/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels", "tags": ["A", "B"]})
    car_id = create.json()["id"]

    response = auth_client.patch(f"/api/cars/{car_id}", json={"tags": ["B", "C"]})

    assert response.status_code == 200
    assert {tag["name"] for tag in response.json()["tags"]} == {"B", "C"}


def test_delete_car(auth_client, db_session):
    create = auth_client.post("/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels"})
    car_id = create.json()["id"]

    response = auth_client.delete(f"/api/cars/{car_id}")
    assert response.status_code == 204

    assert auth_client.get(f"/api/cars/{car_id}").status_code == 404


def test_create_car_unknown_vehicle_type_color_left_unset(auth_client):
    response = auth_client.post("/api/cars", json={"name": "Plain Car", "manufacturer": "Hot Wheels"})

    assert response.status_code == 201
    body = response.json()
    assert body["vehicleTypeId"] is None
    assert body["colorId"] is None


def test_create_car_does_not_create_vehicle_type_or_color_rows_when_omitted(auth_client, db_session):
    auth_client.post("/api/cars", json={"name": "Plain Car", "manufacturer": "Hot Wheels"})

    assert db_session.query(VehicleType).count() == 0
    assert db_session.query(Color).count() == 0
