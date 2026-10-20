from typing import Any

from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.car import CarStatus
from app.models.car_set import CarSet, SetType
from app.repositories import manufacturer_repository
from app.services.exceptions import NotFoundError
from app.services.upload_service import delete_if_local_car_image

_NON_NULLABLE = ("name", "set_type", "status", "sealed", "quantity", "contents")


def _resolve_fields(db: Session, fields: dict[str, Any]) -> dict[str, Any]:
    resolved = dict(fields)
    if "manufacturer" in resolved:
        resolved["manufacturer_id"] = manufacturer_repository.get_or_create_by_name(db, resolved.pop("manufacturer")).id
    if "contents" in resolved and resolved["contents"] is not None:
        resolved["contents"] = [line.strip() for line in resolved["contents"] if line and line.strip()]
    # A PATCH sending null for a required column means "leave it", not "clear it".
    for key in _NON_NULLABLE:
        if key in resolved and resolved[key] is None:
            del resolved[key]
    return resolved


def list_sets(
    db: Session,
    search: str | None = None,
    manufacturer_id: int | None = None,
    set_type: SetType | None = None,
    status: CarStatus | None = None,
    sort: str = "name",
    order: str = "asc",
) -> list[CarSet]:
    stmt = select(CarSet).options(joinedload(CarSet.manufacturer))
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(CarSet.name.ilike(like), CarSet.toy_number.ilike(like)))
    if manufacturer_id is not None:
        stmt = stmt.where(CarSet.manufacturer_id == manufacturer_id)
    if set_type is not None:
        stmt = stmt.where(CarSet.set_type == set_type)
    if status is not None:
        stmt = stmt.where(CarSet.status == status)

    sort_column = {"name": CarSet.name, "year": CarSet.year, "createdAt": CarSet.created_at}.get(sort, CarSet.name)
    stmt = stmt.order_by(sort_column.desc() if order == "desc" else sort_column.asc())
    return list(db.scalars(stmt).unique())


def get_set(db: Session, set_id: int) -> CarSet:
    car_set = db.scalars(select(CarSet).options(joinedload(CarSet.manufacturer)).where(CarSet.id == set_id)).first()
    if car_set is None:
        raise NotFoundError(f"Set {set_id} not found")
    return car_set


def create_set(db: Session, **fields: Any) -> CarSet:
    car_set = CarSet(**_resolve_fields(db, fields))
    db.add(car_set)
    db.commit()
    return get_set(db, car_set.id)


def update_set(db: Session, set_id: int, **fields: Any) -> CarSet:
    car_set = get_set(db, set_id)
    old_photo = car_set.photo
    for key, value in _resolve_fields(db, fields).items():
        setattr(car_set, key, value)
    db.commit()
    if old_photo and old_photo != car_set.photo:
        delete_if_local_car_image(old_photo)
    return get_set(db, set_id)


def delete_set(db: Session, set_id: int) -> None:
    car_set = get_set(db, set_id)
    photo = car_set.photo
    db.delete(car_set)
    db.commit()
    delete_if_local_car_image(photo)
