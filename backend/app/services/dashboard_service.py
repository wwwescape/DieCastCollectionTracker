from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.car import Car, CarStatus
from app.models.car_set import CarSet
from app.models.lookups import Manufacturer, VehicleType
from app.repositories import tag_repository
from app.schemas.car import car_from_orm
from app.schemas.dashboard import DashboardStats, ManufacturerStat, VehicleTypeStat


def get_dashboard_stats(db: Session) -> DashboardStats:
    total_cars = db.scalar(select(func.count()).select_from(Car)) or 0
    # Wishlist rows carry a quantity too (how many you want), so only owned rows count as pieces
    # in the collection.
    total_quantity = db.scalar(select(func.sum(Car.quantity)).where(Car.status == CarStatus.OWNED)) or 0
    owned_count = db.scalar(select(func.count()).select_from(Car).where(Car.status == CarStatus.OWNED)) or 0
    wishlist_count = db.scalar(select(func.count()).select_from(Car).where(Car.status == CarStatus.WISHLIST)) or 0

    total_sets = db.scalar(select(func.count()).select_from(CarSet)) or 0
    sets_owned = db.scalar(select(func.count()).select_from(CarSet).where(CarSet.status == CarStatus.OWNED)) or 0

    collection_value = sum(
        db.scalar(
            select(func.coalesce(func.sum(model.purchase_price * model.quantity), 0)).where(
                model.status == CarStatus.OWNED, model.purchase_price.is_not(None)
            )
        )
        or 0
        for model in (Car, CarSet)
    )

    mfr_rows = db.execute(
        select(Manufacturer.name, func.count(Car.id).label("car_count"))
        .join(Car, Car.manufacturer_id == Manufacturer.id)
        .group_by(Manufacturer.id, Manufacturer.name)
        .order_by(func.count(Car.id).desc())
    ).all()
    by_manufacturer = [ManufacturerStat(manufacturer_name=r[0], car_count=r[1]) for r in mfr_rows]

    vt_rows = db.execute(
        select(VehicleType.name, func.count(Car.id).label("car_count"))
        .join(Car, Car.vehicle_type_id == VehicleType.id)
        .group_by(VehicleType.id, VehicleType.name)
        .order_by(func.count(Car.id).desc())
    ).all()
    by_vehicle_type = [VehicleTypeStat(vehicle_type_name=r[0], car_count=r[1]) for r in vt_rows]

    recent_cars = list(
        db.scalars(
            select(Car)
            .options(
                joinedload(Car.manufacturer),
                joinedload(Car.series),
                joinedload(Car.vehicle_type),
                joinedload(Car.color),
            )
            .order_by(Car.created_at.desc())
            .limit(5)
        ).unique()
    )
    recently_added = [car_from_orm(car, tag_repository.list_tags_for_car(db, car.id)) for car in recent_cars]

    return DashboardStats(
        total_cars=total_cars,
        total_quantity=total_quantity,
        owned_count=owned_count,
        wishlist_count=wishlist_count,
        total_sets=total_sets,
        sets_owned=sets_owned,
        collection_value=float(collection_value),
        by_manufacturer=by_manufacturer,
        by_vehicle_type=by_vehicle_type,
        recently_added=recently_added,
    )
