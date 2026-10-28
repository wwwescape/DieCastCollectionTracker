from typing import Literal

from pydantic import Field

from app.models.car import CarCondition, CarStatus
from app.models.car_set import CarSet, SetType
from app.schemas.base import CamelModel
from app.schemas.car import CarPhotoResponse, LinkedItemResponse, linked_car_from_orm
from app.schemas.tag import TagResponse, tag_from_orm
from app.services import wiki_catalog


class SetResponse(CamelModel):
    id: int
    name: str
    manufacturer_id: int
    manufacturer_name: str
    series_id: int | None
    series_name: str | None
    set_type: SetType
    toy_number: str | None
    year: int | None
    status: CarStatus
    condition: CarCondition | None
    sealed: bool
    quantity: int
    purchase_price: float | None
    notes: str | None
    # Primary photo, for cards; the whole gallery is in `photos`.
    photo: str | None
    photos: list[CarPhotoResponse]
    tags: list[TagResponse]
    # The wiki's list of vehicles that came with the set, as names.
    contents: list[str]
    # Vehicles in the collection linked to this set.
    vehicles: list[LinkedItemResponse]
    catalog_source: str | None
    catalog_title: str | None
    catalog_url: str | None


def set_from_orm(car_set: CarSet) -> SetResponse:
    source = wiki_catalog.SOURCES.get(car_set.catalog_source or "")
    photos = sorted(car_set.photos, key=lambda p: (not p.is_primary, p.sort_order))
    vehicles = sorted((link.car for link in car_set.vehicle_links), key=lambda car: car.name.lower())
    return SetResponse(
        id=car_set.id,
        name=car_set.name,
        manufacturer_id=car_set.manufacturer_id,
        manufacturer_name=car_set.manufacturer.name,
        series_id=car_set.series_id,
        series_name=car_set.series.name if car_set.series else None,
        set_type=car_set.set_type,
        toy_number=car_set.toy_number,
        year=car_set.year,
        status=car_set.status,
        condition=car_set.condition,
        sealed=car_set.sealed,
        quantity=car_set.quantity,
        purchase_price=car_set.purchase_price,
        notes=car_set.notes,
        photo=photos[0].url if photos else None,
        photos=[CarPhotoResponse(id=p.id, url=p.url, is_primary=p.is_primary, sort_order=p.sort_order) for p in photos],
        tags=[tag_from_orm(link.tag) for link in sorted(car_set.tag_links, key=lambda link: link.tag.name)],
        contents=list(car_set.contents or []),
        vehicles=[linked_car_from_orm(car) for car in vehicles],
        catalog_source=car_set.catalog_source,
        catalog_title=car_set.catalog_title,
        catalog_url=source.page_url(car_set.catalog_title) if source and car_set.catalog_title else None,
    )


def linked_set_from_orm(car_set: CarSet) -> LinkedItemResponse:
    photos = sorted(car_set.photos, key=lambda p: (not p.is_primary, p.sort_order))
    return LinkedItemResponse(
        id=car_set.id,
        name=car_set.name,
        manufacturer_name=car_set.manufacturer.name,
        year=car_set.year,
        status=car_set.status,
        photo=photos[0].url if photos else None,
    )


class SetCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    manufacturer: str = Field(min_length=1, max_length=255)
    series: str | None = None
    set_type: SetType = SetType.PLAYSET
    toy_number: str | None = Field(default=None, max_length=100)
    year: int | None = None
    status: CarStatus = CarStatus.OWNED
    condition: CarCondition | None = None
    sealed: bool = True
    quantity: int = Field(default=1, ge=0)
    purchase_price: float | None = Field(default=None, ge=0)
    notes: str | None = None
    # Initial photo URL from POST /api/uploads/car-images (or .../from-wiki); becomes the
    # primary gallery photo. More photos are added via POST /api/sets/{id}/photos.
    photo: str | None = None
    tags: list[str] = Field(default_factory=list)
    contents: list[str] = Field(default_factory=list)
    vehicle_ids: list[int] = Field(default_factory=list)
    catalog_source: Literal["hotwheels", "matchbox"] | None = None
    catalog_title: str | None = Field(default=None, max_length=255)


class SetUpdateRequest(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    manufacturer: str | None = Field(default=None, min_length=1, max_length=255)
    series: str | None = None
    set_type: SetType | None = None
    toy_number: str | None = Field(default=None, max_length=100)
    year: int | None = None
    status: CarStatus | None = None
    condition: CarCondition | None = None
    sealed: bool | None = None
    quantity: int | None = Field(default=None, ge=0)
    purchase_price: float | None = Field(default=None, ge=0)
    notes: str | None = None
    tags: list[str] | None = None
    contents: list[str] | None = None
    vehicle_ids: list[int] | None = None
    catalog_source: Literal["hotwheels", "matchbox"] | None = None
    catalog_title: str | None = Field(default=None, max_length=255)
