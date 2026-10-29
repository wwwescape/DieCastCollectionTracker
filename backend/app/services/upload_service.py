import os
import re
import uuid
from io import BytesIO
from typing import BinaryIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import UPLOADS_DIR
from app.services import wiki_catalog

CAR_IMAGES_DIR = UPLOADS_DIR / "car-images"
CAR_IMAGES_URL_PREFIX = "/uploads/car-images/"
MAX_IMAGE_DIMENSIONS = (1280, 1280)
JPEG_QUALITY = 85
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
# The name save_car_image gives a photo.
PHOTO_NAME = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$")
# Cards, strips and list rows show a photo a few hundred pixels wide, so they load a small
# copy (made the first time it's asked for) instead of the full 1280px photo.
THUMBNAIL_DIMENSIONS = (480, 480)
THUMBNAIL_JPEG_QUALITY = 80
THUMBNAILS_DIRNAME = "thumbs"


class ImageTooLargeError(ValueError):
    """The upload exceeds MAX_UPLOAD_BYTES — 413."""


def save_car_image(source: BinaryIO) -> str:
    """Downscales an uploaded photo to fit MAX_IMAGE_DIMENSIONS and re-encodes it as JPEG,
    saving it under CAR_IMAGES_DIR and returning the URL it's served at. Reads at most one
    byte past MAX_UPLOAD_BYTES so an oversized upload is rejected without buffering it whole."""
    raw = source.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ImageTooLargeError(f"Image is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB")

    try:
        image = Image.open(BytesIO(raw))
        image.load()
    except (UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise ValueError("Not a valid image file") from exc

    # Phone cameras store sensor-oriented pixels plus an EXIF Orientation tag; re-encoding
    # drops the tag, so bake the rotation into the pixels first or portrait shots come out
    # sideways.
    image = ImageOps.exif_transpose(image)
    image = image.convert("RGB")
    image.thumbnail(MAX_IMAGE_DIMENSIONS)

    CAR_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.jpg"
    image.save(CAR_IMAGES_DIR / filename, format="JPEG", quality=JPEG_QUALITY)
    return f"{CAR_IMAGES_URL_PREFIX}{filename}"


def import_car_image_from_wiki(url: str) -> str:
    """Downloads a photo from the wiki image CDN (see wiki_catalog.download_image, which
    refuses any other host) and stores it like an upload, so the car keeps its photo even if
    the wiki later renames or deletes the file."""
    raw = wiki_catalog.download_image(url, MAX_UPLOAD_BYTES)
    return save_car_image(BytesIO(raw))


def thumbnails_dir():
    # Looked up on each call, so tests that point CAR_IMAGES_DIR elsewhere move this too.
    return CAR_IMAGES_DIR / THUMBNAILS_DIRNAME


def car_image_thumbnail(name: str):
    """The path of a small copy of the photo `name`, made and saved the first time it's
    asked for. None if the name isn't one save_car_image gives, or the photo is gone."""
    if not PHOTO_NAME.match(name):
        return None
    thumbnail = thumbnails_dir() / name
    if thumbnail.is_file():
        return thumbnail
    original = CAR_IMAGES_DIR / name
    if not original.is_file():
        return None
    try:
        with Image.open(original) as image:
            image = image.convert("RGB")
            image.thumbnail(THUMBNAIL_DIMENSIONS)
            thumbnail.parent.mkdir(parents=True, exist_ok=True)
            # Written aside then moved into place, so two requests at once never serve half a file.
            partial = thumbnail.with_name(f"{name}.{uuid.uuid4().hex}.part")
            image.save(partial, format="JPEG", quality=THUMBNAIL_JPEG_QUALITY)
            os.replace(partial, thumbnail)
    except (OSError, UnidentifiedImageError, Image.DecompressionBombError):
        return None
    return thumbnail


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
        if PHOTO_NAME.match(filename):
            (thumbnails_dir() / filename).unlink(missing_ok=True)
