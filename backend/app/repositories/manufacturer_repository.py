from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.car import Car
from app.models.lookups import Manufacturer


def list_manufacturers(db: Session) -> list[Manufacturer]:
    return list(db.scalars(select(Manufacturer).order_by(Manufacturer.name)))


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
    return db.scalars(select(Car.id).where(Car.manufacturer_id == manufacturer_id).limit(1)).first() is not None


def delete_manufacturer(db: Session, manufacturer: Manufacturer) -> None:
    db.execute(delete(Manufacturer).where(Manufacturer.id == manufacturer.id))
    db.flush()
