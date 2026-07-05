import io

from PIL import Image


def _image_bytes(color: str = "red") -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (100, 140), color=color).save(buf, format="PNG")
    return buf.getvalue()


def _create_car(auth_client) -> int:
    response = auth_client.post("/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels"})
    return response.json()["id"]


def _add_photo(auth_client, car_id: int, color: str = "red"):
    return auth_client.post(
        f"/api/cars/{car_id}/photos", files={"file": ("car.png", io.BytesIO(_image_bytes(color)), "image/png")}
    )


def test_add_car_photo_first_photo_becomes_primary(auth_client):
    car_id = _create_car(auth_client)

    response = _add_photo(auth_client, car_id)

    assert response.status_code == 201
    body = response.json()
    assert body["isPrimary"] is True
    assert body["sortOrder"] == 0


def test_add_car_photo_second_photo_is_not_primary(auth_client):
    car_id = _create_car(auth_client)
    _add_photo(auth_client, car_id, color="red")

    response = _add_photo(auth_client, car_id, color="blue")

    assert response.status_code == 201
    body = response.json()
    assert body["isPrimary"] is False
    assert body["sortOrder"] == 1


def test_add_car_photo_not_found(auth_client):
    response = _add_photo(auth_client, 999)

    assert response.status_code == 404


def test_delete_car_photo_not_found(auth_client):
    car_id = _create_car(auth_client)

    response = auth_client.delete(f"/api/cars/{car_id}/photos/999")

    assert response.status_code == 404


def test_delete_primary_photo_promotes_next_photo(auth_client):
    car_id = _create_car(auth_client)
    primary = _add_photo(auth_client, car_id, color="red").json()
    secondary = _add_photo(auth_client, car_id, color="blue").json()

    response = auth_client.delete(f"/api/cars/{car_id}/photos/{primary['id']}")
    assert response.status_code == 204

    car = auth_client.get(f"/api/cars/{car_id}").json()
    assert len(car["photos"]) == 1
    assert car["photos"][0]["id"] == secondary["id"]
    assert car["photos"][0]["isPrimary"] is True


def test_set_primary_car_photo(auth_client):
    car_id = _create_car(auth_client)
    primary = _add_photo(auth_client, car_id, color="red").json()
    secondary = _add_photo(auth_client, car_id, color="blue").json()

    response = auth_client.patch(f"/api/cars/{car_id}/photos/{secondary['id']}/primary")

    assert response.status_code == 200
    assert response.json()["isPrimary"] is True

    car = auth_client.get(f"/api/cars/{car_id}").json()
    photos_by_id = {p["id"]: p["isPrimary"] for p in car["photos"]}
    assert photos_by_id[secondary["id"]] is True
    assert photos_by_id[primary["id"]] is False


def test_set_primary_car_photo_not_found(auth_client):
    car_id = _create_car(auth_client)

    response = auth_client.patch(f"/api/cars/{car_id}/photos/999/primary")

    assert response.status_code == 404


def test_update_car_ignores_photo_field(auth_client):
    """Photo changes only happen via the dedicated /photos endpoints; a photo key in the
    PATCH body is not a recognized field and is silently dropped."""
    car_id = _create_car(auth_client)
    old_photo = _add_photo(auth_client, car_id, color="red").json()

    response = auth_client.patch(f"/api/cars/{car_id}", json={"photo": "/uploads/car-images/new.jpg"})

    assert response.status_code == 200
    car = auth_client.get(f"/api/cars/{car_id}").json()
    assert [p["id"] for p in car["photos"]] == [old_photo["id"]]
