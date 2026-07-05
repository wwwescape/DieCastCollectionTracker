from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.models.car import Car
from app.models.lookups import Series


def list_series(db: Session, manufacturer_id: int | None = None) -> list[Series]:
    stmt = select(Series).order_by(Series.name)
    if manufacturer_id is not None:
        # Manufacturer-scoped series for the selected manufacturer, plus unscoped
        # (manufacturer_id IS NULL) series available to any manufacturer.
        stmt = stmt.where(or_(Series.manufacturer_id == manufacturer_id, Series.manufacturer_id.is_(None)))
    return list(db.scalars(stmt))


def get_by_id(db: Session, series_id: int) -> Series | None:
    return db.get(Series, series_id)


def get_by_name(db: Session, name: str, manufacturer_id: int | None) -> Series | None:
    stmt = select(Series).where(Series.name == name, Series.manufacturer_id == manufacturer_id)
    return db.scalars(stmt).first()


def get_or_create_by_name(db: Session, name: str, manufacturer_id: int | None) -> Series:
    series = get_by_name(db, name, manufacturer_id)
    if series is not None:
        return series

    series = Series(name=name, manufacturer_id=manufacturer_id)
    db.add(series)
    db.flush()
    return series


def is_in_use(db: Session, series_id: int) -> bool:
    return db.scalars(select(Car.id).where(Car.series_id == series_id).limit(1)).first() is not None


def delete_series(db: Session, series: Series) -> None:
    db.execute(delete(Series).where(Series.id == series.id))
    db.flush()
