from app.schemas.base import CamelModel


class CatalogSourceResponse(CamelModel):
    id: str
    label: str
    manufacturer: str
    url: str


class CatalogCastingSummaryResponse(CamelModel):
    source: str
    title: str
    url: str
    thumbnail_url: str | None


class CatalogVersionResponse(CamelModel):
    collector_number: str | None
    year: int | None
    series: str | None
    series_number: str | None
    color: str | None
    tampo: str | None
    toy_numbers: list[str]
    notes: str | None
    photo_url: str | None
    thumbnail_url: str | None


class CatalogCastingResponse(CamelModel):
    source: str
    title: str
    url: str
    manufacturer: str
    image_url: str | None
    versions: list[CatalogVersionResponse]


class CatalogSetSummaryResponse(CamelModel):
    source: str
    title: str
    url: str
    thumbnail_url: str | None
    set_type: str


class CatalogSetCarResponse(CamelModel):
    name: str
    color: str | None
    photo_url: str | None
    thumbnail_url: str | None


class CatalogSetResponse(CamelModel):
    source: str
    title: str
    url: str
    manufacturer: str
    image_url: str | None
    set_type: str
    toy_number: str | None
    year: int | None
    cars: list[CatalogSetCarResponse]
