from pydantic import Field

from app.schemas.base import CamelModel


class ManufacturerResponse(CamelModel):
    id: int
    name: str


class ManufacturerOverviewResponse(CamelModel):
    id: int
    name: str
    car_count: int
    set_count: int


class ManufacturerCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)


class VehicleTypeResponse(CamelModel):
    id: int
    name: str


class VehicleTypeCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=100)


class ColorResponse(CamelModel):
    id: int
    name: str


class ColorCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=100)


class SeriesResponse(CamelModel):
    id: int
    name: str
    manufacturer_id: int | None
    manufacturer_name: str | None


class SeriesOverviewResponse(SeriesResponse):
    year: int | None
    car_count: int
    set_count: int


class SeriesCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    manufacturer: str | None = None


class LookupUsageResponse(CamelModel):
    id: int
    car_count: int
    set_count: int
    # Used by a wiki-matched vehicle or set, so it can't be renamed or merged away.
    wiki_backed: bool


class LookupsUsageResponse(CamelModel):
    manufacturers: list[LookupUsageResponse]
    series: list[LookupUsageResponse]
    vehicle_types: list[LookupUsageResponse]
    colors: list[LookupUsageResponse]
    tags: list[LookupUsageResponse]


class LookupRenameRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    # Tags only: the chip color (null clears it). Left out, the color is kept.
    color: str | None = None


class LookupMergeRequest(CamelModel):
    into_id: int


class LookupEntryResponse(CamelModel):
    id: int
    name: str
    color: str | None = None
