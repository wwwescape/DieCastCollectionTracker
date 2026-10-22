from sqlalchemy import delete, func, literal, or_, select, union_all
from sqlalchemy.orm import Session, joinedload

from app.models.car import Car
from app.models.car_set import CarSet
from app.models.lookups import Series


def list_with_counts(db: Session) -> list[tuple[Series, int | None, int, int]]:
    """Every series, split by year, with how many vehicles and sets each year has, most items
    first. A name like "Batman 5-Pack" is reused for a different pack every year, so each
    year is its own row; a series with no items gets one row with no year."""
    items = union_all(
        select(Car.series_id, Car.year, literal(1).label("car"), literal(0).label("set")),
        select(CarSet.series_id, CarSet.year, literal(0), literal(1)),
    ).subquery()
    counts = (
        select(
            items.c.series_id,
            items.c.year,
            func.sum(items.c.car).label("cars"),
            func.sum(items.c.set).label("sets"),
        )
        .group_by(items.c.series_id, items.c.year)
        .subquery()
    )
    cars = func.coalesce(counts.c.cars, 0)
    sets = func.coalesce(counts.c.sets, 0)
    rows = db.execute(
        select(Series, counts.c.year, cars, sets)
        .options(joinedload(Series.manufacturer))
        .outerjoin(counts, counts.c.series_id == Series.id)
        .order_by((cars + sets).desc(), Series.name, counts.c.year.desc().nulls_last())
    ).all()
    return [(row[0], row[1], row[2], row[3]) for row in rows]


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
    for model in (Car, CarSet):
        if db.scalars(select(model.id).where(model.series_id == series_id).limit(1)).first() is not None:
            return True
    return False


def delete_series(db: Session, series: Series) -> None:
    db.execute(delete(Series).where(Series.id == series.id))
    db.flush()
