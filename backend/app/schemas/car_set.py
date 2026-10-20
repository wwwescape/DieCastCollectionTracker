from typing import Literal

from pydantic import Field

from app.models.car import CarStatus
from app.models.car_set import CarSet, SetType
from app.schemas.base import CamelModel
from app.services import wiki_catalog


class SetResponse(CamelModel):
    id: int
    name: str
    manufacturer_id: int
    manufacturer_name: str
    set_type: SetType
    toy_number: str | None
    year: int | None
    status: CarStatus
    sealed: bool
    quantity: int
    purchase_price: float | None
    notes: str | None
    photo: str | None
    contents: list[str]
    catalog_source: str | None
    catalog_title: str | None
    catalog_url: str | None


def set_from_orm(car_set: CarSet) -> SetResponse:
    source = wiki_catalog.SOURCES.get(car_set.catalog_source or "")
    return SetResponse(
        id=car_set.id,
        name=car_set.name,
        manufacturer_id=car_set.manufacturer_id,
        manufacturer_name=car_set.manufacturer.name,
        set_type=car_set.set_type,
        toy_number=car_set.toy_number,
        year=car_set.year,
        status=car_set.status,
        sealed=car_set.sealed,
        quantity=car_set.quantity,
        purchase_price=car_set.purchase_price,
        notes=car_set.notes,
        photo=car_set.photo,
        contents=list(car_set.contents or []),
        catalog_source=car_set.catalog_source,
        catalog_title=car_set.catalog_title,
        catalog_url=source.page_url(car_set.catalog_title) if source and car_set.catalog_title else None,
    )


class SetCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    manufacturer: str = Field(min_length=1, max_length=255)
    set_type: SetType = SetType.PLAYSET
    toy_number: str | None = Field(default=None, max_length=100)
    year: int | None = None
    status: CarStatus = CarStatus.OWNED
    sealed: bool = True
    quantity: int = Field(default=1, ge=0)
    purchase_price: float | None = Field(default=None, ge=0)
    notes: str | None = None
    # A URL from POST /api/uploads/car-images (or .../from-wiki).
    photo: str | None = None
    contents: list[str] = Field(default_factory=list)
    catalog_source: Literal["hotwheels", "matchbox"] | None = None
    catalog_title: str | None = Field(default=None, max_length=255)


class SetUpdateRequest(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    manufacturer: str | None = Field(default=None, min_length=1, max_length=255)
    set_type: SetType | None = None
    toy_number: str | None = Field(default=None, max_length=100)
    year: int | None = None
    status: CarStatus | None = None
    sealed: bool | None = None
    quantity: int | None = Field(default=None, ge=0)
    purchase_price: float | None = Field(default=None, ge=0)
    notes: str | None = None
    photo: str | None = None
    contents: list[str] | None = None
    catalog_source: Literal["hotwheels", "matchbox"] | None = None
    catalog_title: str | None = Field(default=None, max_length=255)
