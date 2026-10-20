from app.models.car import Car, CarCondition, CarStatus
from app.models.car_set import CarSet, SetType
from app.schemas.base import CamelModel


class PublicCarResponse(CamelModel):
    """What a share-link visitor sees of a car: the catalog facts and one photo. None of the
    owner's own data (purchase price, notes, tags)."""

    id: int
    name: str
    manufacturer_name: str
    series_name: str | None
    vehicle_type_name: str | None
    color_name: str | None
    cast_number: str | None
    collection_number: str | None
    year: int | None
    status: CarStatus
    condition: CarCondition | None
    quantity: int
    photo: str | None


def public_car_from_orm(car: Car) -> PublicCarResponse:
    photos = sorted(car.photos, key=lambda p: (not p.is_primary, p.sort_order))
    return PublicCarResponse(
        id=car.id,
        name=car.name,
        manufacturer_name=car.manufacturer.name,
        series_name=car.series.name if car.series else None,
        vehicle_type_name=car.vehicle_type.name if car.vehicle_type else None,
        color_name=car.color.name if car.color else None,
        cast_number=car.cast_number,
        collection_number=car.collection_number,
        year=car.year,
        status=car.status,
        condition=car.condition,
        quantity=car.quantity,
        photo=photos[0].url if photos else None,
    )


class PublicSetResponse(CamelModel):
    """A set as a share-link visitor sees it — no purchase price or notes."""

    id: int
    name: str
    manufacturer_name: str
    set_type: SetType
    toy_number: str | None
    year: int | None
    status: CarStatus
    sealed: bool
    quantity: int
    photo: str | None
    contents: list[str]


def public_set_from_orm(car_set: CarSet) -> PublicSetResponse:
    return PublicSetResponse(
        id=car_set.id,
        name=car_set.name,
        manufacturer_name=car_set.manufacturer.name,
        set_type=car_set.set_type,
        toy_number=car_set.toy_number,
        year=car_set.year,
        status=car_set.status,
        sealed=car_set.sealed,
        quantity=car_set.quantity,
        photo=car_set.photo,
        contents=list(car_set.contents or []),
    )
