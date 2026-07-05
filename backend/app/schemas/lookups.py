from pydantic import Field

from app.schemas.base import CamelModel


class ManufacturerResponse(CamelModel):
    id: int
    name: str


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


class SeriesCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    manufacturer: str | None = None
