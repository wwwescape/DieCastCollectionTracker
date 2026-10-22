from pydantic import Field

from app.models.lookups import Tag
from app.schemas.base import CamelModel


class TagResponse(CamelModel):
    id: int
    name: str
    color: str | None


def tag_from_orm(tag: Tag) -> TagResponse:
    return TagResponse(id=tag.id, name=tag.name, color=tag.color)


class TagCreateRequest(CamelModel):
    name: str = Field(min_length=1, max_length=100)
    color: str | None = None


class TagCoverageRequest(CamelModel):
    vehicle_ids: list[int] = Field(default_factory=list, max_length=2000)
    set_ids: list[int] = Field(default_factory=list, max_length=2000)


class TagCoverageResponse(TagResponse):
    # How many of the given vehicles and sets carry this tag.
    count: int
