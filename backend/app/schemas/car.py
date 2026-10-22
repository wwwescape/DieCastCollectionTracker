from typing import Literal

from pydantic import Field

from app.models.car import Car, CarCondition, CarStatus
from app.schemas.base import CamelModel
from app.schemas.tag import TagResponse, tag_from_orm
from app.services import wiki_catalog


class CarPhotoResponse(CamelModel):
    id: int
    url: str
    is_primary: bool
    sort_order: int


class LinkedItemResponse(CamelModel):
    """A vehicle as listed on a set, or a set as listed on a vehicle."""

    id: int
    name: str
    manufacturer_name: str
    year: int | None
    photo: str | None


def linked_car_from_orm(car: Car) -> LinkedItemResponse:
    photos = sorted(car.photos, key=lambda p: (not p.is_primary, p.sort_order))
    return LinkedItemResponse(
        id=car.id,
        name=car.name,
        manufacturer_name=car.manufacturer.name,
        year=car.year,
        photo=photos[0].url if photos else None,
    )


class CarResponse(CamelModel):
    id: int
    name: str
    manufacturer_id: int
    manufacturer_name: str
    series_id: int | None
    series_name: str | None
    vehicle_type_id: int | None
    vehicle_type_name: str | None
    color_id: int | None
    color_name: str | None
    cast_number: str | None
    collection_number: str | None
    year: int | None
    status: CarStatus
    condition: CarCondition | None
    quantity: int
    purchase_price: float | None
    notes: str | None
    catalog_source: str | None
    catalog_title: str | None
    catalog_url: str | None
    # Convenience field: URL of the primary photo (first photo with is_primary=True,
    # or the first photo overall). Kept for backward compat with any code that reads
    # car.photo directly; the full list is in `photos`.
    photo: str | None
    photos: list[CarPhotoResponse]
    tags: list[TagResponse]
    # Sets in the collection this vehicle is linked to.
    sets: list[LinkedItemResponse] = []


def _catalog_url(car: Car) -> str | None:
    source = wiki_catalog.SOURCES.get(car.catalog_source or "")
    return source.page_url(car.catalog_title) if source and car.catalog_title else None


def car_from_orm(car: Car, tags: list, sets: list[LinkedItemResponse] | None = None) -> CarResponse:
    photos = sorted(car.photos, key=lambda p: (not p.is_primary, p.sort_order))
    primary = next((p for p in photos if p.is_primary), photos[0] if photos else None)

    return CarResponse(
        id=car.id,
        name=car.name,
        manufacturer_id=car.manufacturer_id,
        manufacturer_name=car.manufacturer.name,
        series_id=car.series_id,
        series_name=car.series.name if car.series else None,
        vehicle_type_id=car.vehicle_type_id,
        vehicle_type_name=car.vehicle_type.name if car.vehicle_type else None,
        color_id=car.color_id,
        color_name=car.color.name if car.color else None,
        cast_number=car.cast_number,
        collection_number=car.collection_number,
        year=car.year,
        status=car.status,
        condition=car.condition,
        quantity=car.quantity,
        purchase_price=car.purchase_price,
        notes=car.notes,
        catalog_source=car.catalog_source,
        catalog_title=car.catalog_title,
        catalog_url=_catalog_url(car),
        photo=primary.url if primary else None,
        photos=[CarPhotoResponse(id=p.id, url=p.url, is_primary=p.is_primary, sort_order=p.sort_order) for p in photos],
        tags=[tag_from_orm(tag) for tag in tags],
        sets=sets or [],
    )


class CarCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    manufacturer: str = Field(min_length=1, max_length=255)
    series: str | None = None
    vehicle_type: str | None = None
    color: str | None = None
    cast_number: str | None = None
    collection_number: str | None = None
    year: int | None = None
    status: CarStatus = CarStatus.OWNED
    condition: CarCondition | None = None
    quantity: int = Field(default=1, ge=0)
    purchase_price: float | None = Field(default=None, ge=0)
    notes: str | None = None
    catalog_source: Literal["hotwheels", "matchbox"] | None = None
    catalog_title: str | None = Field(default=None, max_length=255)
    # Convenience: initial photo URL (from POST /api/uploads/car-images). Automatically
    # creates a CarPhoto record with is_primary=True. Additional photos are managed via
    # POST /api/cars/{id}/photos after the car is created.
    photo: str | None = None
    tags: list[str] = Field(default_factory=list)
    set_ids: list[int] = Field(default_factory=list)


class CarUpdateRequest(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    manufacturer: str | None = Field(default=None, min_length=1, max_length=255)
    series: str | None = None
    vehicle_type: str | None = None
    color: str | None = None
    cast_number: str | None = None
    collection_number: str | None = None
    year: int | None = None
    status: CarStatus | None = None
    condition: CarCondition | None = None
    quantity: int | None = Field(default=None, ge=0)
    purchase_price: float | None = Field(default=None, ge=0)
    notes: str | None = None
    catalog_source: Literal["hotwheels", "matchbox"] | None = None
    catalog_title: str | None = Field(default=None, max_length=255)
    tags: list[str] | None = None
    set_ids: list[int] | None = None


class CarBulkCreateItem(CarCreateRequest):
    # A wiki image (see POST /api/uploads/car-images/from-wiki) to copy in as the primary
    # photo, for adding several cars at once without a round trip per photo. Ignored when
    # `photo` is already set.
    wiki_photo_url: str | None = Field(default=None, max_length=2048)


class CarBulkCreateRequest(CamelModel):
    cars: list[CarBulkCreateItem] = Field(min_length=1, max_length=50)


class CarBulkCreateResponse(CamelModel):
    cars: list[CarResponse]
    # Wiki photos that couldn't be copied; those cars were added without a photo.
    photos_failed: int
