from dataclasses import asdict
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.schemas.catalog import (
    CatalogCastingResponse,
    CatalogCastingSummaryResponse,
    CatalogSourceResponse,
    CatalogVersionResponse,
)
from app.services import wiki_catalog

router = APIRouter(prefix="/api/catalog", tags=["catalog"], dependencies=[Depends(get_current_user)])


@router.get("/sources", response_model=list[CatalogSourceResponse])
def list_sources() -> list[CatalogSourceResponse]:
    return [
        CatalogSourceResponse(id=s.id, label=s.label, manufacturer=s.manufacturer, url=s.base_url)
        for s in wiki_catalog.SOURCES.values()
    ]


@router.get("/search", response_model=list[CatalogCastingSummaryResponse])
def search_catalog(
    q: str = Query(min_length=2, max_length=200),
    source: Literal["all", "hotwheels", "matchbox"] = Query(default="all"),
) -> list[CatalogCastingSummaryResponse]:
    source_ids = list(wiki_catalog.SOURCES) if source == "all" else [source]
    return [CatalogCastingSummaryResponse(**asdict(result)) for result in wiki_catalog.search(q, source_ids)]


@router.get("/casting", response_model=CatalogCastingResponse)
def get_casting(
    source: Literal["hotwheels", "matchbox"] = Query(),
    title: str = Query(min_length=1, max_length=255),
) -> CatalogCastingResponse:
    casting = wiki_catalog.get_casting(source, title)
    return CatalogCastingResponse(
        source=casting.source,
        title=casting.title,
        url=casting.url,
        manufacturer=casting.manufacturer,
        image_url=casting.image_url,
        versions=[CatalogVersionResponse(**asdict(version)) for version in casting.versions],
    )
