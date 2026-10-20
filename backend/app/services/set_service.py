from typing import Any

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.car import Car, CarStatus
from app.models.car_set import CarSet, SetPhoto, SetTag, SetType, SetVehicle
from app.repositories import manufacturer_repository, series_repository, tag_repository
from app.services.exceptions import NotFoundError
from app.services.upload_service import delete_if_local_car_image

_NON_NULLABLE = ("name", "set_type", "status", "sealed", "quantity", "contents")
_UNSET = object()


def _options() -> tuple[Any, ...]:
    return (
        joinedload(CarSet.manufacturer),
        joinedload(CarSet.series),
        joinedload(CarSet.photos),
        joinedload(CarSet.tag_links).joinedload(SetTag.tag),
        joinedload(CarSet.vehicle_links).joinedload(SetVehicle.car).joinedload(Car.photos),
    )


def _resolve_fields(db: Session, fields: dict[str, Any], car_set: CarSet | None = None) -> dict[str, Any]:
    resolved = dict(fields)
    if "manufacturer" in resolved:
        resolved["manufacturer_id"] = manufacturer_repository.get_or_create_by_name(db, resolved.pop("manufacturer")).id
    manufacturer_id = resolved.get("manufacturer_id", car_set.manufacturer_id if car_set else None)
    if "series" in resolved:
        series_name = resolved.pop("series")
        resolved["series_id"] = (
            series_repository.get_or_create_by_name(db, series_name, manufacturer_id).id if series_name else None
        )
    if "contents" in resolved and resolved["contents"] is not None:
        resolved["contents"] = [line.strip() for line in resolved["contents"] if line and line.strip()]
    # A PATCH sending null for a required column means "leave it", not "clear it".
    for key in _NON_NULLABLE:
        if key in resolved and resolved[key] is None:
            del resolved[key]
    return resolved


def _set_tags(db: Session, set_id: int, names: list[str]) -> None:
    db.execute(delete(SetTag).where(SetTag.set_id == set_id))
    for name in names:
        db.add(SetTag(set_id=set_id, tag_id=tag_repository.get_or_create_by_name(db, name).id))
    db.flush()


def set_vehicle_links(db: Session, set_id: int, car_ids: list[int]) -> None:
    """Replaces a set's linked vehicles with exactly these (unknown ids are ignored)."""
    db.execute(delete(SetVehicle).where(SetVehicle.set_id == set_id))
    known = set(db.scalars(select(Car.id).where(Car.id.in_(car_ids)))) if car_ids else set()
    for car_id in dict.fromkeys(car_ids):
        if car_id in known:
            db.add(SetVehicle(set_id=set_id, car_id=car_id))
    db.flush()


def list_sets(
    db: Session,
    search: str | None = None,
    manufacturer_id: int | None = None,
    series_id: int | None = None,
    set_type: SetType | None = None,
    status: CarStatus | None = None,
    sort: str = "name",
    order: str = "asc",
) -> list[CarSet]:
    stmt = select(CarSet).options(*_options())
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(CarSet.name.ilike(like), CarSet.toy_number.ilike(like)))
    if manufacturer_id is not None:
        stmt = stmt.where(CarSet.manufacturer_id == manufacturer_id)
    if series_id is not None:
        stmt = stmt.where(CarSet.series_id == series_id)
    if set_type is not None:
        stmt = stmt.where(CarSet.set_type == set_type)
    if status is not None:
        stmt = stmt.where(CarSet.status == status)

    sort_column = {"name": CarSet.name, "year": CarSet.year, "createdAt": CarSet.created_at}.get(sort, CarSet.name)
    stmt = stmt.order_by(sort_column.desc() if order == "desc" else sort_column.asc())
    return list(db.scalars(stmt).unique())


def get_set(db: Session, set_id: int) -> CarSet:
    car_set = db.scalars(select(CarSet).options(*_options()).where(CarSet.id == set_id)).first()
    if car_set is None:
        raise NotFoundError(f"Set {set_id} not found")
    return car_set


def create_set(
    db: Session, tags: list[str] | None = None, vehicle_ids: list[int] | None = None, **fields: Any
) -> CarSet:
    photo = fields.pop("photo", None)
    car_set = CarSet(**_resolve_fields(db, fields))
    db.add(car_set)
    db.flush()
    if photo:
        db.add(SetPhoto(set_id=car_set.id, url=photo, is_primary=True, sort_order=0))
    _set_tags(db, car_set.id, tags or [])
    set_vehicle_links(db, car_set.id, vehicle_ids or [])
    db.commit()
    return get_set(db, car_set.id)


def update_set(db: Session, set_id: int, tags: Any = _UNSET, vehicle_ids: Any = _UNSET, **fields: Any) -> CarSet:
    car_set = get_set(db, set_id)
    fields.pop("photo", None)  # the gallery is managed through the photo endpoints
    for key, value in _resolve_fields(db, fields, car_set).items():
        setattr(car_set, key, value)
    if tags is not _UNSET and tags is not None:
        _set_tags(db, set_id, tags)
    if vehicle_ids is not _UNSET and vehicle_ids is not None:
        set_vehicle_links(db, set_id, vehicle_ids)
    db.commit()
    db.expire_all()
    return get_set(db, set_id)


def delete_set(db: Session, set_id: int) -> None:
    car_set = get_set(db, set_id)
    photo_urls = [photo.url for photo in car_set.photos]
    db.execute(delete(SetVehicle).where(SetVehicle.set_id == set_id))
    db.execute(delete(SetTag).where(SetTag.set_id == set_id))
    db.execute(delete(SetPhoto).where(SetPhoto.set_id == set_id))
    # A bulk delete too: the ORM still holds the links loaded above and would try to clear them.
    db.execute(delete(CarSet).where(CarSet.id == set_id))
    db.commit()
    db.expire_all()
    for url in photo_urls:
        delete_if_local_car_image(url)


# --- Photo gallery (mirrors car_service) ---


def add_set_photo(db: Session, set_id: int, url: str) -> SetPhoto:
    get_set(db, set_id)
    photos = list(db.scalars(select(SetPhoto).where(SetPhoto.set_id == set_id)))
    photo = SetPhoto(
        set_id=set_id,
        url=url,
        is_primary=not any(p.is_primary for p in photos),
        sort_order=max((p.sort_order for p in photos), default=-1) + 1,
    )
    db.add(photo)
    db.commit()
    return photo


def _get_photo(db: Session, set_id: int, photo_id: int) -> SetPhoto:
    photo = db.scalars(select(SetPhoto).where(SetPhoto.id == photo_id, SetPhoto.set_id == set_id)).first()
    if photo is None:
        raise NotFoundError(f"Photo {photo_id} not found on set {set_id}")
    return photo


def delete_set_photo(db: Session, set_id: int, photo_id: int) -> None:
    photo = _get_photo(db, set_id, photo_id)
    url, was_primary = photo.url, photo.is_primary
    db.delete(photo)
    db.flush()
    if was_primary:
        next_photo = db.scalars(
            select(SetPhoto).where(SetPhoto.set_id == set_id).order_by(SetPhoto.sort_order.asc()).limit(1)
        ).first()
        if next_photo:
            next_photo.is_primary = True
    db.commit()
    delete_if_local_car_image(url)


def set_primary_set_photo(db: Session, set_id: int, photo_id: int) -> SetPhoto:
    target = _get_photo(db, set_id, photo_id)
    for photo in db.scalars(select(SetPhoto).where(SetPhoto.set_id == set_id)):
        photo.is_primary = photo.id == target.id
    db.commit()
    return target
