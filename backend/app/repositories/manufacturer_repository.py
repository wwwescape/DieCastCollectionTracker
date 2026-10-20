from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.car import Car
from app.models.car_set import CarSet
from app.models.lookups import Manufacturer


def list_manufacturers(db: Session) -> list[Manufacturer]:
    return list(db.scalars(select(Manufacturer).order_by(Manufacturer.name)))


def list_with_counts(db: Session) -> list[tuple[Manufacturer, int, int]]:
    """Every manufacturer with how many cars and sets it has, most items first."""
    car_counts = (
        select(Car.manufacturer_id, func.count(Car.id).label("n")).group_by(Car.manufacturer_id).subquery()
    )
    set_counts = (
        select(CarSet.manufacturer_id, func.count(CarSet.id).label("n")).group_by(CarSet.manufacturer_id).subquery()
    )
    cars = func.coalesce(car_counts.c.n, 0)
    sets = func.coalesce(set_counts.c.n, 0)
    rows = db.execute(
        select(Manufacturer, cars, sets)
        .outerjoin(car_counts, car_counts.c.manufacturer_id == Manufacturer.id)
        .outerjoin(set_counts, set_counts.c.manufacturer_id == Manufacturer.id)
        .order_by((cars + sets).desc(), Manufacturer.name)
    ).all()
    return [(row[0], row[1], row[2]) for row in rows]


def get_by_id(db: Session, manufacturer_id: int) -> Manufacturer | None:
    return db.get(Manufacturer, manufacturer_id)


def get_by_name(db: Session, name: str) -> Manufacturer | None:
    return db.scalars(select(Manufacturer).where(Manufacturer.name == name)).first()


def get_or_create_by_name(db: Session, name: str) -> Manufacturer:
    manufacturer = get_by_name(db, name)
    if manufacturer is not None:
        return manufacturer

    manufacturer = Manufacturer(name=name)
    db.add(manufacturer)
    db.flush()
    return manufacturer


def is_in_use(db: Session, manufacturer_id: int) -> bool:
    for model in (Car, CarSet):
        if db.scalars(select(model.id).where(model.manufacturer_id == manufacturer_id).limit(1)).first() is not None:
            return True
    return False


def delete_manufacturer(db: Session, manufacturer: Manufacturer) -> None:
    db.execute(delete(Manufacturer).where(Manufacturer.id == manufacturer.id))
    db.flush()
