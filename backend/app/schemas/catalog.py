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
    # "casting", or "pack" for a multi-pack page (open it with GET /api/catalog/pack).
    kind: str = "casting"
    pack_label: str | None = None


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
    casting_title: str | None = None


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


class CatalogPackResponse(CamelModel):
    source: str
    title: str
    url: str
    manufacturer: str
    image_url: str | None
    pack_label: str
    toy_numbers: list[str]
    year: int | None
    cars: list[CatalogSetCarResponse]
