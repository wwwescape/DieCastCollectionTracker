from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.car import Car, CarPhoto, CarStatus
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


def _resolve_car_fields(db: Session, fields: dict[str, Any]) -> dict[str, Any]:
    """Resolves name-based lookup fields to FK ids via get-or-create. series is resolved
    after manufacturer since a series can be scoped to the car's manufacturer."""
    resolved: dict[str, Any] = {}

    if "manufacturer" in fields:
        resolved["manufacturer_id"] = manufacturer_repository.get_or_create_by_name(db, fields["manufacturer"]).id

    manufacturer_id = resolved.get("manufacturer_id")

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
    )
    for key in passthrough_keys:
        if key in fields:
            resolved[key] = fields[key]

    return resolved


def list_cars(
    db: Session,
    search: str | None = None,
    manufacturer_id: int | None = None,
    series_id: int | None = None,
    vehicle_type_id: int | None = None,
    color_id: int | None = None,
    status: CarStatus | None = None,
    tag_id: int | None = None,
    sort: str = "name",
    order: str = "asc",
) -> list[Car]:
    return car_repository.list_cars(
        db,
        search=search,
        manufacturer_id=manufacturer_id,
        series_id=series_id,
        vehicle_type_id=vehicle_type_id,
        color_id=color_id,
        status=status,
        tag_id=tag_id,
        sort=sort,
        order=order,
    )


def get_car(db: Session, car_id: int) -> Car:
    car = car_repository.get_car(db, car_id)
    if car is None:
        raise NotFoundError(f"Car {car_id} not found")
    return car


def get_car_tags(db: Session, car_id: int) -> list:
    return tag_repository.list_tags_for_car(db, car_id)


def create_car(db: Session, tags: list[str] | None = None, **fields: Any) -> Car:
    photo = fields.pop("photo", None)
    resolved = _resolve_car_fields(db, fields)
    car = car_repository.create_car(db, **resolved)
    if photo:
        car_repository.create_car_photo(db, car.id, photo, is_primary=True, sort_order=0)
    if tags is not None:
        tag_ids = [tag_repository.get_or_create_by_name(db, name).id for name in tags]
        tag_repository.set_tags_for_car(db, car.id, tag_ids)
    db.commit()
    return get_car(db, car.id)


def update_car(db: Session, car_id: int, tags: list[str] | None = _UNSET, **fields: Any) -> Car:
    car = get_car(db, car_id)

    resolved = _resolve_car_fields(db, fields)
    car_repository.update_car(db, car, **resolved)

    if tags is not _UNSET and tags is not None:
        tag_ids = [tag_repository.get_or_create_by_name(db, name).id for name in tags]
        tag_repository.set_tags_for_car(db, car.id, tag_ids)
    db.commit()
    return get_car(db, car_id)


def delete_car(db: Session, car_id: int) -> None:
    car = get_car(db, car_id)
    photo_urls = [p.url for p in car.photos]
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
