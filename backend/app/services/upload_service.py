import uuid
from io import BytesIO

from PIL import Image, UnidentifiedImageError

from app.core.config import UPLOADS_DIR

CAR_IMAGES_DIR = UPLOADS_DIR / "car-images"
CAR_IMAGES_URL_PREFIX = "/uploads/car-images/"
MAX_IMAGE_DIMENSIONS = (1280, 1280)
JPEG_QUALITY = 85


def save_car_image(raw: bytes) -> str:
    """Downscales an uploaded photo to fit MAX_IMAGE_DIMENSIONS and re-encodes it as JPEG,
    saving it under CAR_IMAGES_DIR and returning the URL it's served at."""
    try:
        image = Image.open(BytesIO(raw))
        image.load()
    except UnidentifiedImageError as exc:
        raise ValueError("Not a valid image file") from exc

    image = image.convert("RGB")
    image.thumbnail(MAX_IMAGE_DIMENSIONS)

    CAR_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.jpg"
    image.save(CAR_IMAGES_DIR / filename, format="JPEG", quality=JPEG_QUALITY)
    return f"{CAR_IMAGES_URL_PREFIX}{filename}"


def delete_if_local_car_image(url: str | None) -> None:
    """Best-effort cleanup for a photo that's about to be replaced or whose car was
    deleted. url ultimately comes from a request body (CarCreateRequest.photo is free
    text, not restricted to URLs save_car_image actually generated), so resolving and
    confirming the result is still inside CAR_IMAGES_DIR — rather than trusting the joined
    path directly — guards against a crafted value like "/uploads/car-images/../../.env"."""
    if url is None or not url.startswith(CAR_IMAGES_URL_PREFIX):
        return
    filename = url.removeprefix(CAR_IMAGES_URL_PREFIX)
    candidate = (CAR_IMAGES_DIR / filename).resolve()
    if candidate.is_relative_to(CAR_IMAGES_DIR.resolve()):
        candidate.unlink(missing_ok=True)
