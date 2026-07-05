from app.schemas.base import CamelModel
from app.schemas.car import CarResponse


class ManufacturerStat(CamelModel):
    manufacturer_name: str
    car_count: int


class VehicleTypeStat(CamelModel):
    vehicle_type_name: str
    car_count: int


class DashboardStats(CamelModel):
    total_cars: int
    total_quantity: int
    owned_count: int
    wishlist_count: int
    by_manufacturer: list[ManufacturerStat]
    by_vehicle_type: list[VehicleTypeStat]
    recently_added: list[CarResponse]
