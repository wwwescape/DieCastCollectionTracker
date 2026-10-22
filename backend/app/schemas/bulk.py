from typing import Any

from pydantic import Field

from app.models.car import CarCondition, CarStatus
from app.schemas.base import CamelModel

# Generous for a single-admin collection, but bounded so one request can't lock the database
# for long.
MAX_BULK_ITEMS = 2000


class BulkEditRequest(CamelModel):
    """One change applied to every selected vehicle (or set). Only the fields actually sent
    are changed: `condition: null` clears the condition, `series: null` (or "") clears the
    series, and leaving a field out leaves it alone."""

    ids: list[int] = Field(min_length=1, max_length=MAX_BULK_ITEMS)
    status: CarStatus | None = None
    condition: CarCondition | None = None
    series: str | None = Field(default=None, max_length=255)
    add_tags: list[str] = Field(default_factory=list)
    remove_tag_ids: list[int] = Field(default_factory=list)

    def changes(self) -> dict[str, Any]:
        return {
            name: getattr(self, name) for name in ("status", "condition", "series") if name in self.model_fields_set
        }


class BulkDeleteRequest(CamelModel):
    ids: list[int] = Field(min_length=1, max_length=MAX_BULK_ITEMS)


class BulkResultResponse(CamelModel):
    # How many of the given ids existed and were changed or deleted.
    count: int
