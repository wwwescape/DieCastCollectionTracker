from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.car import Car
from app.models.lookups import VehicleType


def list_vehicle_types(db: Session) -> list[VehicleType]:
    return list(db.scalars(select(VehicleType).order_by(VehicleType.name)))


def get_by_id(db: Session, vehicle_type_id: int) -> VehicleType | None:
    return db.get(VehicleType, vehicle_type_id)


def get_by_name(db: Session, name: str) -> VehicleType | None:
    return db.scalars(select(VehicleType).where(VehicleType.name == name)).first()


def get_or_create_by_name(db: Session, name: str) -> VehicleType:
    vehicle_type = get_by_name(db, name)
    if vehicle_type is not None:
        return vehicle_type

    vehicle_type = VehicleType(name=name)
    db.add(vehicle_type)
    db.flush()
    return vehicle_type


def is_in_use(db: Session, vehicle_type_id: int) -> bool:
    return db.scalars(select(Car.id).where(Car.vehicle_type_id == vehicle_type_id).limit(1)).first() is not None


def delete_vehicle_type(db: Session, vehicle_type: VehicleType) -> None:
    db.execute(delete(VehicleType).where(VehicleType.id == vehicle_type.id))
    db.flush()
