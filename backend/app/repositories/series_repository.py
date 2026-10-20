from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.models.car import Car
from app.models.car_set import CarSet
from app.models.lookups import Series


def list_with_counts(db: Session) -> list[tuple[Series, int, int]]:
    """Every series with how many vehicles and sets it has, most items first."""
    car_counts = select(Car.series_id, func.count(Car.id).label("n")).group_by(Car.series_id).subquery()
    set_counts = select(CarSet.series_id, func.count(CarSet.id).label("n")).group_by(CarSet.series_id).subquery()
    cars = func.coalesce(car_counts.c.n, 0)
    sets = func.coalesce(set_counts.c.n, 0)
    rows = db.execute(
        select(Series, cars, sets)
        .options(joinedload(Series.manufacturer))
        .outerjoin(car_counts, car_counts.c.series_id == Series.id)
        .outerjoin(set_counts, set_counts.c.series_id == Series.id)
        .order_by((cars + sets).desc(), Series.name)
    ).all()
    return [(row[0], row[1], row[2]) for row in rows]


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
