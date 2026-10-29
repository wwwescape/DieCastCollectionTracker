"""Backup/restore for the full DieCastCollectionTracker dataset.

Backup format uses explicit database IDs so cross-table relationships (car→manufacturer,
car→series, car_tags→car/tag) are preserved intact on restore. IDs are preserved in the
restored database, which is safe for SQLite (next autoincrement derives from MAX(rowid)).

Two forms: the plain .json (rows only — photo files are expected to still be in the uploads/
volume), and the full .zip, which is that same JSON as backup.json plus every uploaded photo
it references under photos/, so a collection moves to a new server whole. Every photo URL
per item (with its primary flag and order) is included either way, so galleries re-link on
restore. A safety snapshot of whatever is about to be wiped is written to backend/db/backups/
before each restore so the operation is always recoverable.
"""

import json
import tempfile
import zipfile
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.core.config import BACKEND_DIR
from app.models.car import Car, CarCondition, CarPhoto, CarStatus, CarTag
from app.models.car_set import CarSet, SetPhoto, SetTag, SetType, SetVehicle
from app.models.lookups import Color, Manufacturer, Series, Tag, VehicleType
from app.schemas.backup import (
    BACKUP_FORMAT_VERSION,
    BackupCar,
    BackupColor,
    BackupManufacturer,
    BackupPayload,
    BackupPhoto,
    BackupRestoreResult,
    BackupSeries,
    BackupSet,
    BackupTag,
    BackupVehicleType,
)
from app.services import upload_service

BACKUPS_DIR = BACKEND_DIR / "db" / "backups"

FULL_BACKUP_JSON_NAME = "backup.json"
FULL_BACKUP_PHOTOS_DIR = "photos/"
# Only names DCT itself gives uploads (a UUID .jpg) are ever extracted from a backup.
_PHOTO_NAME = upload_service.PHOTO_NAME
MAX_BACKUP_JSON_BYTES = 50 * 1024 * 1024
MAX_PHOTO_BYTES = 20 * 1024 * 1024
MAX_PHOTOS_TOTAL_BYTES = 8 * 1024 * 1024 * 1024
MAX_ZIP_MEMBERS = 200_000


def _local_photo_names(payload: BackupPayload) -> set[str]:
    """File names of every uploaded photo the backup references (wiki-hosted photos have no
    file of their own)."""
    names: set[str] = set()
    for item in [*payload.cars, *payload.sets]:
        urls = [photo.url for photo in item.photos] + ([item.photo] if item.photo else [])
        for url in urls:
            if url and url.startswith(upload_service.CAR_IMAGES_URL_PREFIX):
                name = url.removeprefix(upload_service.CAR_IMAGES_URL_PREFIX)
                if _PHOTO_NAME.match(name):
                    names.add(name)
    return names


def export_full_backup_zip(db: Session) -> Path:
    """The backup as a .zip: backup.json plus the uploaded photos it references, written to a
    temp file the caller deletes once sent. Photos are stored as they are (JPEGs don't
    compress further); a referenced photo missing from disk is simply left out."""
    payload = build_backup_payload(db)
    handle, name = tempfile.mkstemp(prefix="dct-backup-", suffix=".zip")
    path = Path(name)
    try:
        with open(handle, "wb") as raw, zipfile.ZipFile(raw, "w", compression=zipfile.ZIP_STORED) as archive:
            archive.writestr(
                FULL_BACKUP_JSON_NAME,
                payload.model_dump_json(indent=2, by_alias=True),
                compress_type=zipfile.ZIP_DEFLATED,
            )
            for photo_name in sorted(_local_photo_names(payload)):
                source = upload_service.CAR_IMAGES_DIR / photo_name
                if source.is_file():
                    archive.write(source, FULL_BACKUP_PHOTOS_DIR + photo_name)
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return path


def read_full_backup_zip(path: Path) -> BackupPayload:
    """Opens a full-backup .zip and validates its backup.json, without extracting anything.
    Raises ValueError for anything that isn't a DCT backup or is suspiciously large."""
    try:
        with zipfile.ZipFile(path) as archive:
            members = archive.infolist()
            if len(members) > MAX_ZIP_MEMBERS:
                raise ValueError("the .zip has too many files")
            try:
                info = archive.getinfo(FULL_BACKUP_JSON_NAME)
            except KeyError as exc:
                raise ValueError(f"no {FULL_BACKUP_JSON_NAME} in the .zip") from exc
            if info.file_size > MAX_BACKUP_JSON_BYTES:
                raise ValueError(f"{FULL_BACKUP_JSON_NAME} is too large")
            total = sum(m.file_size for m in members if m.filename.startswith(FULL_BACKUP_PHOTOS_DIR))
            if total > MAX_PHOTOS_TOTAL_BYTES:
                raise ValueError("the photos in the .zip are too large")
            return parse_backup_payload(archive.read(info).decode("utf-8"))
    except zipfile.BadZipFile as exc:
        raise ValueError("not a .zip file") from exc


def extract_backup_photos(path: Path, payload: BackupPayload) -> int:
    """Copies the backup's photos into uploads/, keeping their names so the restored rows'
    photo URLs work as they are. Only photos the backup references and named like a DCT
    upload are taken; each must be a real image under MAX_PHOTO_BYTES and is re-encoded as a
    JPEG like any upload. A photo already on disk is left alone. Returns how many were
    written."""
    wanted = _local_photo_names(payload)
    upload_service.CAR_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    written = 0
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            if not info.filename.startswith(FULL_BACKUP_PHOTOS_DIR) or info.is_dir():
                continue
            name = info.filename.removeprefix(FULL_BACKUP_PHOTOS_DIR)
            if name not in wanted or not _PHOTO_NAME.match(name) or info.file_size > MAX_PHOTO_BYTES:
                continue
            target = upload_service.CAR_IMAGES_DIR / name
            if target.exists():
                continue
            try:
                image = Image.open(BytesIO(archive.read(info)))
                image.load()
                image.convert("RGB").save(target, format="JPEG", quality=upload_service.JPEG_QUALITY)
            except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
                target.unlink(missing_ok=True)
                continue
            written += 1
    return written


def build_backup_payload(db: Session) -> BackupPayload:
    manufacturers = [BackupManufacturer(id=m.id, name=m.name) for m in db.scalars(select(Manufacturer))]
    series = [BackupSeries(id=s.id, name=s.name, manufacturer_id=s.manufacturer_id) for s in db.scalars(select(Series))]
    vehicle_types = [BackupVehicleType(id=v.id, name=v.name) for v in db.scalars(select(VehicleType))]
    colors = [BackupColor(id=c.id, name=c.name) for c in db.scalars(select(Color))]
    tags = [BackupTag(id=t.id, name=t.name, color=t.color) for t in db.scalars(select(Tag))]

    car_tag_rows = db.execute(select(CarTag.car_id, CarTag.tag_id)).all()
    tag_ids_by_car: dict[int, list[int]] = {}
    for car_id, tag_id in car_tag_rows:
        tag_ids_by_car.setdefault(car_id, []).append(tag_id)

    all_cars = list(db.scalars(select(Car).options(joinedload(Car.photos))).unique())
    cars = [
        BackupCar(
            id=car.id,
            name=car.name,
            manufacturer_id=car.manufacturer_id,
            series_id=car.series_id,
            vehicle_type_id=car.vehicle_type_id,
            color_id=car.color_id,
            cast_number=car.cast_number,
            collection_number=car.collection_number,
            year=car.year,
            status=car.status.value,
            condition=car.condition.value if car.condition else None,
            quantity=car.quantity,
            purchase_price=car.purchase_price,
            notes=car.notes,
            catalog_source=car.catalog_source,
            catalog_title=car.catalog_title,
            photo=next((p.url for p in car.photos if p.is_primary), None),
            photos=[
                BackupPhoto(url=p.url, is_primary=p.is_primary, sort_order=p.sort_order)
                for p in sorted(car.photos, key=lambda p: p.sort_order)
            ],
            tag_ids=tag_ids_by_car.get(car.id, []),
        )
        for car in all_cars
    ]

    sets = [
        BackupSet(
            id=car_set.id,
            name=car_set.name,
            manufacturer_id=car_set.manufacturer_id,
            set_type=car_set.set_type.value,
            toy_number=car_set.toy_number,
            year=car_set.year,
            status=car_set.status.value,
            sealed=car_set.sealed,
            quantity=car_set.quantity,
            purchase_price=car_set.purchase_price,
            notes=car_set.notes,
            photo=next((p.url for p in car_set.photos if p.is_primary), None),
            photos=[
                BackupPhoto(url=p.url, is_primary=p.is_primary, sort_order=p.sort_order)
                for p in sorted(car_set.photos, key=lambda p: p.sort_order)
            ],
            contents=list(car_set.contents or []),
            catalog_source=car_set.catalog_source,
            catalog_title=car_set.catalog_title,
            series_id=car_set.series_id,
            condition=car_set.condition.value if car_set.condition else None,
            tag_ids=sorted(link.tag_id for link in car_set.tag_links),
            vehicle_ids=sorted(link.car_id for link in car_set.vehicle_links),
        )
        for car_set in db.scalars(
            select(CarSet).options(
                joinedload(CarSet.photos), joinedload(CarSet.tag_links), joinedload(CarSet.vehicle_links)
            )
        ).unique()
    ]

    return BackupPayload(
        version=BACKUP_FORMAT_VERSION,
        exported_at=datetime.now(UTC).isoformat(),
        manufacturers=manufacturers,
        series=series,
        vehicle_types=vehicle_types,
        colors=colors,
        tags=tags,
        cars=cars,
        sets=sets,
    )


def export_backup_json(db: Session) -> str:
    return build_backup_payload(db).model_dump_json(indent=2, by_alias=True)


def parse_backup_payload(raw_json: str) -> BackupPayload:
    return BackupPayload.model_validate(json.loads(raw_json))


def write_safety_snapshot(db: Session, label: str = "pre-restore") -> Path:
    """Saves the collection as it is now to backend/db/backups/<label>-<time>.json, before a
    restore or a Danger Zone reset replaces it; restorable like any .json backup."""
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = BACKUPS_DIR / f"{label}-{timestamp}.json"
    path.write_text(export_backup_json(db), encoding="utf-8")
    return path


def restore_backup(db: Session, payload: BackupPayload) -> BackupRestoreResult:
    safety_snapshot_path = write_safety_snapshot(db)

    # Wipe in FK-safe order (children before parents)
    db.execute(delete(SetVehicle))
    db.execute(delete(SetTag))
    db.execute(delete(SetPhoto))
    db.execute(delete(CarSet))
    db.execute(delete(CarPhoto))
    db.execute(delete(CarTag))
    db.execute(delete(Car))
    db.execute(delete(Tag))
    db.execute(delete(Series))
    db.execute(delete(Color))
    db.execute(delete(VehicleType))
    db.execute(delete(Manufacturer))
    db.flush()

    for m in payload.manufacturers:
        db.add(Manufacturer(id=m.id, name=m.name))
    for v in payload.vehicle_types:
        db.add(VehicleType(id=v.id, name=v.name))
    for c in payload.colors:
        db.add(Color(id=c.id, name=c.name))
    for t in payload.tags:
        db.add(Tag(id=t.id, name=t.name, color=t.color))
    db.flush()

    for s in payload.series:
        db.add(Series(id=s.id, name=s.name, manufacturer_id=s.manufacturer_id))
    db.flush()

    for car in payload.cars:
        db.add(Car(
            id=car.id,
            name=car.name,
            manufacturer_id=car.manufacturer_id,
            series_id=car.series_id,
            vehicle_type_id=car.vehicle_type_id,
            color_id=car.color_id,
            cast_number=car.cast_number,
            collection_number=car.collection_number,
            year=car.year,
            status=CarStatus(car.status),
            condition=CarCondition(car.condition) if car.condition else None,
            quantity=car.quantity,
            purchase_price=car.purchase_price,
            notes=car.notes,
            catalog_source=car.catalog_source,
            catalog_title=car.catalog_title,
        ))
    db.flush()

    for car in payload.cars:
        if car.photos:
            for photo in car.photos:
                db.add(CarPhoto(car_id=car.id, url=photo.url, is_primary=photo.is_primary, sort_order=photo.sort_order))
        elif car.photo:
            db.add(CarPhoto(car_id=car.id, url=car.photo, is_primary=True, sort_order=0))
        for tag_id in car.tag_ids:
            db.add(CarTag(car_id=car.id, tag_id=tag_id))

    for car_set in payload.sets:
        db.add(CarSet(
            id=car_set.id,
            name=car_set.name,
            manufacturer_id=car_set.manufacturer_id,
            set_type=SetType(car_set.set_type),
            toy_number=car_set.toy_number,
            year=car_set.year,
            status=CarStatus(car_set.status),
            sealed=car_set.sealed,
            quantity=car_set.quantity,
            purchase_price=car_set.purchase_price,
            notes=car_set.notes,
            contents=car_set.contents,
            catalog_source=car_set.catalog_source,
            catalog_title=car_set.catalog_title,
            series_id=car_set.series_id,
            condition=CarCondition(car_set.condition) if car_set.condition else None,
        ))
    db.flush()

    restored_car_ids = {car.id for car in payload.cars}
    for car_set in payload.sets:
        if car_set.photos:
            for photo in car_set.photos:
                db.add(
                    SetPhoto(
                        set_id=car_set.id, url=photo.url, is_primary=photo.is_primary, sort_order=photo.sort_order
                    )
                )
        elif car_set.photo:
            db.add(SetPhoto(set_id=car_set.id, url=car_set.photo, is_primary=True, sort_order=0))
        for tag_id in car_set.tag_ids:
            db.add(SetTag(set_id=car_set.id, tag_id=tag_id))
        for car_id in car_set.vehicle_ids:
            if car_id in restored_car_ids:
                db.add(SetVehicle(set_id=car_set.id, car_id=car_id))

    db.commit()

    return BackupRestoreResult(
        restored_cars=len(payload.cars),
        restored_sets=len(payload.sets),
        # Just the file name: the server's own directory layout is none of the client's business.
        safety_snapshot_path=safety_snapshot_path.name,
    )
