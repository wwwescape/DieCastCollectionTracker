"""Backup/restore for the full DieCastCollectionTracker dataset.

Backup format uses explicit database IDs so cross-table relationships (car→manufacturer,
car→series, car_tags→car/tag) are preserved intact on restore. IDs are preserved in the
restored database, which is safe for SQLite (next autoincrement derives from MAX(rowid)).

Photo files are NOT bundled — they live in the uploads/ volume and are expected to still
be present after a restore. Every photo URL per car (with its primary flag and order) is
included so the whole gallery can be re-linked on restore. A safety snapshot of whatever is
about to be wiped is written to backend/db/backups/ before each restore so the operation is
always recoverable.
"""

import json
from datetime import UTC, datetime
from pathlib import Path

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

BACKUPS_DIR = BACKEND_DIR / "db" / "backups"


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


def _write_safety_snapshot(db: Session) -> Path:
    BACKUPS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = BACKUPS_DIR / f"pre-restore-{timestamp}.json"
    path.write_text(export_backup_json(db), encoding="utf-8")
    return path


def restore_backup(db: Session, payload: BackupPayload) -> BackupRestoreResult:
    safety_snapshot_path = _write_safety_snapshot(db)

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
        safety_snapshot_path=str(safety_snapshot_path),
    )
