from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app.models.car import Car, CarPhoto
from app.models.car_set import CarSet, SetVehicle
from app.repositories import (
    car_repository,
    color_repository,
    manufacturer_repository,
    series_repository,
    tag_repository,
    vehicle_type_repository,
)
from app.services.exceptions import NotFoundError
from app.services.upload_service import delete_if_local_car_image

_UNSET = object()


def _resolve_car_fields(db: Session, fields: dict[str, Any], car: Car | None = None) -> dict[str, Any]:
    """Resolves name-based lookup fields to FK ids via get-or-create. series is resolved
    after manufacturer since a series is scoped to the car's manufacturer — on an update
    that's the existing car's manufacturer unless this same request changes it."""
    resolved: dict[str, Any] = {}

    if "manufacturer" in fields:
        resolved["manufacturer_id"] = manufacturer_repository.get_or_create_by_name(db, fields["manufacturer"]).id

    manufacturer_id = resolved.get("manufacturer_id", car.manufacturer_id if car else None)

    # Moving a car to another manufacturer without touching its series: carry the series
    # name across so the car doesn't stay linked to a series scoped to the old manufacturer.
    if (
        car is not None
        and "series" not in fields
        and car.series is not None
        and car.series.manufacturer_id is not None
        and car.series.manufacturer_id != manufacturer_id
    ):
        fields = {**fields, "series": car.series.name}

    if "series" in fields:
        series_name = fields["series"]
        resolved["series_id"] = (
            series_repository.get_or_create_by_name(db, series_name, manufacturer_id).id if series_name else None
        )
    if "vehicle_type" in fields:
        vehicle_type_name = fields["vehicle_type"]
        resolved["vehicle_type_id"] = (
            vehicle_type_repository.get_or_create_by_name(db, vehicle_type_name).id if vehicle_type_name else None
        )
    if "color" in fields:
        color_name = fields["color"]
        resolved["color_id"] = color_repository.get_or_create_by_name(db, color_name).id if color_name else None

    passthrough_keys = (
        "name",
        "cast_number",
        "collection_number",
        "year",
        "status",
        "condition",
        "quantity",
        "purchase_price",
        "notes",
        "catalog_source",
        "catalog_title",
    )
    for key in passthrough_keys:
        if key in fields:
            resolved[key] = fields[key]

    return resolved


def list_cars(db: Session, **filters: Any) -> list[Car]:
    """See car_repository.list_cars for the filters (VehicleFilterParams' fields)."""
    return car_repository.list_cars(db, **filters)


def get_car(db: Session, car_id: int) -> Car:
    car = car_repository.get_car(db, car_id)
    if car is None:
        raise NotFoundError(f"Car {car_id} not found")
    return car


def get_car_tags(db: Session, car_id: int) -> list:
    return tag_repository.list_tags_for_car(db, car_id)


def get_car_sets(db: Session, car_id: int) -> list[CarSet]:
    stmt = (
        select(CarSet)
        .join(SetVehicle, SetVehicle.set_id == CarSet.id)
        .where(SetVehicle.car_id == car_id)
        .options(joinedload(CarSet.manufacturer), joinedload(CarSet.photos))
        .order_by(CarSet.name)
    )
    return list(db.scalars(stmt).unique())


def set_car_set_links(db: Session, car_id: int, set_ids: list[int]) -> None:
    """Replaces the sets this vehicle is linked to (the other side of set_service's
    set_vehicle_links — both write the same set_vehicles rows). Unknown ids are ignored."""
    db.execute(delete(SetVehicle).where(SetVehicle.car_id == car_id))
    known = set(db.scalars(select(CarSet.id).where(CarSet.id.in_(set_ids)))) if set_ids else set()
    for set_id in dict.fromkeys(set_ids):
        if set_id in known:
            db.add(SetVehicle(set_id=set_id, car_id=car_id))
    db.flush()


def create_car(db: Session, tags: list[str] | None = None, set_ids: list[int] | None = None, **fields: Any) -> Car:
    car = _add_car(db, tags=tags, set_ids=set_ids, **fields)
    db.commit()
    return get_car(db, car.id)


def create_cars(db: Session, items: list[dict[str, Any]]) -> list[Car]:
    """Adds several cars in one transaction (e.g. every car picked from a multi-pack), so a
    failure part-way leaves none of them behind."""
    try:
        car_ids = [_add_car(db, **dict(item)).id for item in items]
        db.commit()
    except Exception:
        db.rollback()
        raise
    return [get_car(db, car_id) for car_id in car_ids]


def _add_car(db: Session, tags: list[str] | None = None, set_ids: list[int] | None = None, **fields: Any) -> Car:
    photo = fields.pop("photo", None)
    resolved = _resolve_car_fields(db, fields)
    car = car_repository.create_car(db, **resolved)
    if photo:
        car_repository.create_car_photo(db, car.id, photo, is_primary=True, sort_order=0)
    if tags is not None:
        tag_ids = [tag_repository.get_or_create_by_name(db, name).id for name in tags]
        tag_repository.set_tags_for_car(db, car.id, tag_ids)
    if set_ids:
        set_car_set_links(db, car.id, set_ids)
    return car


def update_car(
    db: Session, car_id: int, tags: list[str] | None = _UNSET, set_ids: list[int] | None = _UNSET, **fields: Any
) -> Car:
    car = get_car(db, car_id)

    resolved = _resolve_car_fields(db, fields, car)
    car_repository.update_car(db, car, **resolved)

    if tags is not _UNSET and tags is not None:
        tag_ids = [tag_repository.get_or_create_by_name(db, name).id for name in tags]
        tag_repository.set_tags_for_car(db, car.id, tag_ids)
    if set_ids is not _UNSET and set_ids is not None:
        set_car_set_links(db, car.id, set_ids)
    db.commit()
    return get_car(db, car_id)


def delete_car(db: Session, car_id: int) -> None:
    car = get_car(db, car_id)
    photo_urls = [p.url for p in car.photos]
    db.execute(delete(SetVehicle).where(SetVehicle.car_id == car.id))
    car_repository.delete_car(db, car)
    db.commit()
    for url in photo_urls:
        delete_if_local_car_image(url)


# --- Photo management ---

def add_car_photo(db: Session, car_id: int, url: str) -> CarPhoto:
    """Adds a new (non-primary) photo to the car's gallery."""
    get_car(db, car_id)  # 404 guard
    next_order = car_repository.get_max_sort_order(db, car_id) + 1
    has_any = car_repository.get_primary_photo(db, car_id) is not None
    photo = car_repository.create_car_photo(db, car_id, url, is_primary=not has_any, sort_order=next_order)
    db.commit()
    return photo


def delete_car_photo(db: Session, car_id: int, photo_id: int) -> None:
    photo = car_repository.get_car_photo(db, car_id, photo_id)
    if photo is None:
        raise NotFoundError(f"Photo {photo_id} not found on car {car_id}")
    url = photo.url
    was_primary = photo.is_primary
    car_repository.delete_car_photo_record(db, photo)
    # Promote the oldest remaining photo to primary if we just deleted the primary
    if was_primary:
        next_photo = db.scalars(
            select(CarPhoto)
            .where(CarPhoto.car_id == car_id)
            .order_by(CarPhoto.sort_order.asc())
            .limit(1)
        ).first()
        if next_photo:
            next_photo.is_primary = True
            db.flush()
    db.commit()
    delete_if_local_car_image(url)


def set_primary_car_photo(db: Session, car_id: int, photo_id: int) -> CarPhoto:
    photo = car_repository.get_car_photo(db, car_id, photo_id)
    if photo is None:
        raise NotFoundError(f"Photo {photo_id} not found on car {car_id}")
    result = car_repository.set_primary_photo(db, car_id, photo_id)
    db.commit()
    return result


# --- Bulk actions (the Vehicles list's selection mode) ---

_BULK_FIELDS = ("status", "condition", "series")


def bulk_edit_cars(
    db: Session,
    car_ids: list[int],
    changes: dict[str, Any],
    add_tags: list[str] | None = None,
    remove_tag_ids: list[int] | None = None,
) -> int:
    """Applies the same change to several vehicles in one transaction. `changes` holds only the
    fields the user picked: status, condition (None clears it) and series by name (None or ""
    clears it). A series is looked up or created under each vehicle's own manufacturer, like
    the edit form does. Tags are added by name (created if new) and removed by id. Unknown ids
    are skipped; returns how many vehicles were updated."""
    cars = car_repository.get_cars(db, car_ids)
    series_by_manufacturer: dict[int, int | None] = {}
    for car in cars:
        if "status" in changes and changes["status"] is not None:
            car.status = changes["status"]
        if "condition" in changes:
            car.condition = changes["condition"]
        if "series" in changes:
            name = (changes["series"] or "").strip()
            if car.manufacturer_id not in series_by_manufacturer:
                series_by_manufacturer[car.manufacturer_id] = (
                    series_repository.get_or_create_by_name(db, name, car.manufacturer_id).id if name else None
                )
            car.series_id = series_by_manufacturer[car.manufacturer_id]
    found_ids = [car.id for car in cars]
    tag_repository.add_tags_to_cars(
        db,
        found_ids,
        [tag_repository.get_or_create_by_name(db, name.strip()).id for name in add_tags or [] if name.strip()],
    )
    tag_repository.remove_tags_from_cars(db, found_ids, remove_tag_ids or [])
    db.commit()
    db.expire_all()
    return len(cars)


def bulk_delete_cars(db: Session, car_ids: list[int]) -> int:
    """Deletes several vehicles (and their photos); unknown ids are skipped."""
    found = [car.id for car in car_repository.get_cars(db, car_ids)]
    for car_id in found:
        delete_car(db, car_id)
    return len(found)

