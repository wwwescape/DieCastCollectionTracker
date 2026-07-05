from typing import Any

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.car import Car, CarPhoto, CarStatus, CarTag

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
    manufacturer_id: int | None = None,
    series_id: int | None = None,
    vehicle_type_id: int | None = None,
    color_id: int | None = None,
    status: CarStatus | None = None,
    tag_id: int | None = None,
    sort: str = "name",
    order: str = "asc",
) -> list[Car]:
    stmt = select(Car).options(*_options())

    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            or_(
                Car.name.ilike(like),
                Car.cast_number.ilike(like),
                Car.collection_number.ilike(like),
            )
        )
    if manufacturer_id is not None:
        stmt = stmt.where(Car.manufacturer_id == manufacturer_id)
    if series_id is not None:
        stmt = stmt.where(Car.series_id == series_id)
    if vehicle_type_id is not None:
        stmt = stmt.where(Car.vehicle_type_id == vehicle_type_id)
    if color_id is not None:
        stmt = stmt.where(Car.color_id == color_id)
    if status is not None:
        stmt = stmt.where(Car.status == status)
    if tag_id is not None:
        stmt = stmt.join(CarTag, CarTag.car_id == Car.id).where(CarTag.tag_id == tag_id)

    sort_column = {
        "name": Car.name,
        "year": Car.year,
        "quantity": Car.quantity,
        "createdAt": Car.created_at,
    }.get(sort, Car.name)
    stmt = stmt.order_by(sort_column.desc() if order == "desc" else sort_column.asc())

    return list(db.scalars(stmt).unique())


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
