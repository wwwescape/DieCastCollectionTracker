import io

from PIL import Image

from app.core.config import UPLOADS_DIR
from app.services import upload_service


def _image_bytes(size: tuple[int, int] = (100, 140), image_format: str = "PNG") -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, color="red").save(buf, format=image_format)
    return buf.getvalue()


def test_upload_car_image_requires_auth(client):
    response = client.post(
        "/api/uploads/car-images", files={"file": ("car.png", io.BytesIO(_image_bytes()), "image/png")}
    )

    assert response.status_code == 401


def test_upload_car_image_saves_and_returns_url(auth_client):
    response = auth_client.post(
        "/api/uploads/car-images", files={"file": ("car.png", io.BytesIO(_image_bytes()), "image/png")}
    )

    assert response.status_code == 201
    url = response.json()["url"]
    assert url.startswith("/uploads/car-images/")
    assert url.endswith(".jpg")

    saved_path = UPLOADS_DIR / "car-images" / url.removeprefix("/uploads/car-images/")
    assert saved_path.is_file()
    with Image.open(saved_path) as saved:
        assert saved.format == "JPEG"
    saved_path.unlink()


def test_upload_car_image_resizes_oversized_image(auth_client):
    response = auth_client.post(
        "/api/uploads/car-images",
        files={"file": ("car.png", io.BytesIO(_image_bytes(size=(3000, 4000))), "image/png")},
    )

    assert response.status_code == 201
    url = response.json()["url"]
    saved_path = UPLOADS_DIR / "car-images" / url.removeprefix("/uploads/car-images/")
    with Image.open(saved_path) as saved:
        assert saved.width <= 1280
        assert saved.height <= 1280
    saved_path.unlink()


def test_upload_car_image_rejects_non_image_file(auth_client):
    response = auth_client.post(
        "/api/uploads/car-images", files={"file": ("notes.txt", io.BytesIO(b"not an image"), "text/plain")}
    )

    assert response.status_code == 400


def test_delete_car_with_uploaded_photo_removes_the_file(auth_client):
    upload = auth_client.post(
        "/api/uploads/car-images", files={"file": ("car.png", io.BytesIO(_image_bytes()), "image/png")}
    )
    url = upload.json()["url"]
    saved_path = UPLOADS_DIR / "car-images" / url.removeprefix("/uploads/car-images/")
    assert saved_path.is_file()

    car = auth_client.post("/api/cars", json={"name": "Car", "manufacturer": "Hot Wheels", "photo": url}).json()
    auth_client.delete(f"/api/cars/{car['id']}")

    assert not saved_path.is_file()


def test_upload_car_image_applies_exif_orientation(auth_client):
    # 200x100 landscape pixels tagged "rotate 90° CW" (Orientation 6) — how a phone stores a
    # portrait shot. The saved JPEG must be upright (portrait) since re-encoding drops the tag.
    exif = Image.Exif()
    exif[0x0112] = 6
    buf = io.BytesIO()
    Image.new("RGB", (200, 100), color="red").save(buf, format="JPEG", exif=exif)

    response = auth_client.post("/api/uploads/car-images", files={"file": ("car.jpg", buf.getvalue(), "image/jpeg")})

    assert response.status_code == 201
    saved_path = UPLOADS_DIR / "car-images" / response.json()["url"].removeprefix("/uploads/car-images/")
    with Image.open(saved_path) as saved:
        assert saved.size == (100, 200)
    saved_path.unlink()


def test_upload_car_image_rejects_oversized_file(auth_client, monkeypatch):
    monkeypatch.setattr(upload_service, "MAX_UPLOAD_BYTES", 1024)

    response = auth_client.post(
        "/api/uploads/car-images", files={"file": ("car.png", io.BytesIO(b"x" * 2048), "image/png")}
    )

    assert response.status_code == 413


def _upload_to(auth_client, tmp_path, monkeypatch, size=(1280, 960)) -> str:
    monkeypatch.setattr(upload_service, "CAR_IMAGES_DIR", tmp_path / "car-images")
    response = auth_client.post(
        "/api/uploads/car-images", files={"file": ("car.png", io.BytesIO(_image_bytes(size=size)), "image/png")}
    )
    return response.json()["url"].removeprefix("/uploads/car-images/")


def test_thumbnail_is_made_on_first_request_and_kept(client, auth_client, tmp_path, monkeypatch):
    name = _upload_to(auth_client, tmp_path, monkeypatch)

    response = client.get(f"/uploads/car-images/thumbs/{name}")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "public, max-age=31536000, immutable"
    with Image.open(io.BytesIO(response.content)) as thumbnail:
        assert thumbnail.size == (480, 360)
    assert (tmp_path / "car-images" / "thumbs" / name).is_file()


def test_thumbnail_of_unknown_or_odd_names_is_404(client, tmp_path, monkeypatch):
    monkeypatch.setattr(upload_service, "CAR_IMAGES_DIR", tmp_path / "car-images")

    assert client.get("/uploads/car-images/thumbs/00000000-0000-0000-0000-000000000000.jpg").status_code == 404
    assert client.get("/uploads/car-images/thumbs/..%2F..%2F.env").status_code == 404
    assert client.get("/uploads/car-images/thumbs/notes.txt").status_code == 404


def test_deleting_a_photo_deletes_its_thumbnail(client, auth_client, tmp_path, monkeypatch):
    name = _upload_to(auth_client, tmp_path, monkeypatch)
    client.get(f"/uploads/car-images/thumbs/{name}")

    upload_service.delete_if_local_car_image(f"/uploads/car-images/{name}")

    assert not (tmp_path / "car-images" / "thumbs" / name).exists()
