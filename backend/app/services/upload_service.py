import logging
import os
import re
import threading
import uuid
from io import BytesIO
from pathlib import Path
from typing import BinaryIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import UPLOADS_DIR
from app.services import wiki_catalog

logger = logging.getLogger(__name__)

CAR_IMAGES_DIR = UPLOADS_DIR / "car-images"
CAR_IMAGES_URL_PREFIX = "/uploads/car-images/"
MAX_IMAGE_DIMENSIONS = (1280, 1280)
JPEG_QUALITY = 85
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
# The name save_car_image gives a photo.
PHOTO_NAME = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$")
# Cards, strips and list rows show a photo a few hundred pixels wide, so they load a small
# copy instead of the full 1280px photo. It's made when the photo is saved; photos from
# before that (or restored from a backup) get theirs from one background thread, so making
# them never holds up a request. Until then the thumbnail URL serves the full photo.
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
    _save_thumbnail(image, filename)
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


def _save_thumbnail(image: Image.Image, name: str) -> None:
    thumbnail = image.copy()
    thumbnail.thumbnail(THUMBNAIL_DIMENSIONS)
    target = thumbnails_dir() / name
    target.parent.mkdir(parents=True, exist_ok=True)
    # Written aside then moved into place, so a request never gets half a file.
    partial = target.with_name(f"{name}.{uuid.uuid4().hex}.part")
    thumbnail.save(partial, format="JPEG", quality=THUMBNAIL_JPEG_QUALITY)
    os.replace(partial, target)


def car_image_thumbnail(name: str) -> tuple[Path, bool] | None:
    """What to serve for the thumbnail of photo `name`: (path, True) once the thumbnail
    exists, or (the full photo, False) while it doesn't yet, which also starts making the
    missing ones. None if the name isn't one save_car_image gives, or the photo is gone."""
    if not PHOTO_NAME.match(name):
        return None
    thumbnail = thumbnails_dir() / name
    if thumbnail.is_file():
        return thumbnail, True
    original = CAR_IMAGES_DIR / name
    if not original.is_file():
        return None
    start_thumbnail_backfill()
    return original, False


def make_missing_thumbnails() -> int:
    """Makes the thumbnail of every photo that lacks one, one at a time. Returns how many."""
    made = 0
    if not CAR_IMAGES_DIR.is_dir():
        return made
    for original in sorted(CAR_IMAGES_DIR.iterdir()):
        if not PHOTO_NAME.match(original.name) or (thumbnails_dir() / original.name).is_file():
            continue
        try:
            with Image.open(original) as image:
                _save_thumbnail(image.convert("RGB"), original.name)
            made += 1
        except (OSError, UnidentifiedImageError, Image.DecompressionBombError):
            logger.warning("Couldn't make a thumbnail for %s", original.name)
    return made


_backfill_lock = threading.Lock()
_backfill_thread: threading.Thread | None = None


def start_thumbnail_backfill() -> None:
    """Runs make_missing_thumbnails on a background thread, unless it's already running."""
    global _backfill_thread
    with _backfill_lock:
        if _backfill_thread is not None and _backfill_thread.is_alive():
            return
        _backfill_thread = threading.Thread(target=make_missing_thumbnails, name="thumbnails", daemon=True)
        _backfill_thread.start()


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
