from collections.abc import Sequence
from typing import Any

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.car import Car, CarCondition, CarPhoto, CarStatus, CarTag
from app.models.lookups import Color, Manufacturer, Series
from app.services.list_filters import link_filter, source_filter, value_filter
from app.services.list_filters import order_by as list_order_by

# Repositories only add/flush/delete — they never commit. The service that calls them owns
# the transaction boundary.


def _options() -> tuple[Any, ...]:
    return (
        joinedload(Car.manufacturer),
        joinedload(Car.series),
        joinedload(Car.vehicle_type),
        joinedload(Car.color),
        joinedload(Car.photos),
    )


def list_cars(
    db: Session,
    search: str | None = None,
    statuses: Sequence[CarStatus] | None = None,
    status_exclude: bool = False,
    manufacturer_ids: Sequence[int] | None = None,
    manufacturer_exclude: bool = False,
    series_ids: Sequence[int] | None = None,
    series_exclude: bool = False,
    vehicle_type_ids: Sequence[int] | None = None,
    vehicle_type_exclude: bool = False,
    color_ids: Sequence[int] | None = None,
    color_exclude: bool = False,
    conditions: Sequence[CarCondition] | None = None,
    condition_exclude: bool = False,
    tag_ids: Sequence[int] | None = None,
    tag_exclude: bool = False,
    tag_match_all: bool = False,
    sources: Sequence[str] | None = None,
    source_exclude: bool = False,
    sort: str = "name",
    order: str = "asc",
) -> list[Car]:
    """The Vehicles list: search plus the filters described in app/services/list_filters.py."""
    stmt = select(Car).options(*_options())

    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Car.name.ilike(like),
                Car.cast_number.ilike(like),
                Car.collection_number.ilike(like),
                Car.notes.ilike(like),
                Car.manufacturer.has(Manufacturer.name.ilike(like)),
                Car.series.has(Series.name.ilike(like)),
                Car.color.has(Color.name.ilike(like)),
            )
        )
    stmt = stmt.where(
        value_filter(Car.status, statuses, status_exclude),
        value_filter(Car.manufacturer_id, manufacturer_ids, manufacturer_exclude),
        value_filter(Car.series_id, series_ids, series_exclude),
        value_filter(Car.vehicle_type_id, vehicle_type_ids, vehicle_type_exclude),
        value_filter(Car.color_id, color_ids, color_exclude),
        value_filter(Car.condition, conditions, condition_exclude),
        link_filter(CarTag, CarTag.car_id, Car.id, CarTag.tag_id, tag_ids, tag_exclude, tag_match_all),
        source_filter(Car.catalog_title, sources, source_exclude),
    )

    sort_column = {
        "name": Car.name,
        "year": Car.year,
        "quantity": Car.quantity,
        "purchasePrice": Car.purchase_price,
        "createdAt": Car.created_at,
    }.get(sort, Car.name)
    stmt = stmt.order_by(*list_order_by(sort_column, order == "desc"), Car.name.asc(), Car.id.asc())

    return list(db.scalars(stmt).unique())


def get_cars(db: Session, car_ids: Sequence[int]) -> list[Car]:
    if not car_ids:
        return []
    return list(db.scalars(select(Car).options(*_options()).where(Car.id.in_(list(car_ids)))).unique())


def get_car(db: Session, car_id: int) -> Car | None:
    stmt = select(Car).options(*_options()).where(Car.id == car_id)
    return db.scalars(stmt).first()


def create_car(db: Session, **fields: Any) -> Car:
    car = Car(**fields)
    db.add(car)
    db.flush()
    return car


def update_car(db: Session, car: Car, **fields: Any) -> Car:
    for key, value in fields.items():
        setattr(car, key, value)
    db.flush()
    return car


def delete_car(db: Session, car: Car) -> None:
    db.execute(delete(CarTag).where(CarTag.car_id == car.id))
    db.execute(delete(CarPhoto).where(CarPhoto.car_id == car.id))
    db.delete(car)
    db.flush()


# --- Photo management ---

def create_car_photo(db: Session, car_id: int, url: str, is_primary: bool = False, sort_order: int = 0) -> CarPhoto:
    photo = CarPhoto(car_id=car_id, url=url, is_primary=is_primary, sort_order=sort_order)
    db.add(photo)
    db.flush()
    return photo


def get_car_photo(db: Session, car_id: int, photo_id: int) -> CarPhoto | None:
    stmt = select(CarPhoto).where(CarPhoto.id == photo_id, CarPhoto.car_id == car_id)
    return db.scalars(stmt).first()


def get_primary_photo(db: Session, car_id: int) -> CarPhoto | None:
    stmt = select(CarPhoto).where(CarPhoto.car_id == car_id, CarPhoto.is_primary.is_(True))
    return db.scalars(stmt).first()


def get_max_sort_order(db: Session, car_id: int) -> int:
    stmt = select(CarPhoto.sort_order).where(CarPhoto.car_id == car_id).order_by(CarPhoto.sort_order.desc()).limit(1)
    result = db.scalars(stmt).first()
    return result if result is not None else -1


def set_primary_photo(db: Session, car_id: int, photo_id: int) -> CarPhoto | None:
    """Clears is_primary on all photos for this car, then sets it on the target."""
    db.execute(
        CarPhoto.__table__.update()
        .where(CarPhoto.car_id == car_id)
        .values(is_primary=False)
    )
    db.execute(
        CarPhoto.__table__.update()
        .where(CarPhoto.id == photo_id, CarPhoto.car_id == car_id)
        .values(is_primary=True)
    )
    db.flush()
    return get_car_photo(db, car_id, photo_id)


def delete_car_photo_record(db: Session, photo: CarPhoto) -> None:
    db.delete(photo)
    db.flush()
