"""Shared predicates for the Vehicles and Sets list filters (modelled on VideoGameTrackarr's
Games filters): every filter takes several values, an "exclude" flag that negates it, and —
for a many-valued field like tags — a "match all" flag.

A single-valued field (status, manufacturer, series, ...) can only ever hold one of the picked
values, so it has no "match all": "any" is the only sensible meaning. Excluding on a nullable
field keeps the rows where the field is empty too ("not Hot Wheels" includes vehicles with no
series, and so on), which is what "everything except these" means to a user.
"""

from collections.abc import Sequence
from typing import Any

from sqlalchemy import ColumnElement, and_, exists, false, not_, or_, select, true

# The "source" filter: matched to a wiki casting/set page, or added by hand (VGT's "Custom").
SOURCE_WIKI = "wiki"
SOURCE_CUSTOM = "custom"


def value_filter(column: Any, values: Sequence[Any] | None, exclude: bool = False) -> ColumnElement[bool]:
    if not values:
        return true()
    clause = column.in_(list(values))
    return or_(column.is_(None), not_(clause)) if exclude else clause


def link_filter(
    link_table: Any,
    owner_column: Any,
    owner_id: Any,
    value_column: Any,
    values: Sequence[Any] | None,
    exclude: bool = False,
    match_all: bool = False,
) -> ColumnElement[bool]:
    """A many-to-many filter (tags on a vehicle or set): has any / all of `values`."""
    if not values:
        return true()

    def has(picked: Sequence[Any]) -> ColumnElement[bool]:
        return exists(select(1).select_from(link_table).where(owner_column == owner_id, value_column.in_(picked)))

    clause = and_(*(has([value]) for value in values)) if match_all and len(values) > 1 else has(list(values))
    return not_(clause) if exclude else clause


def source_filter(
    catalog_title_column: Any, sources: Sequence[str] | None, exclude: bool = False
) -> ColumnElement[bool]:
    if not sources:
        return true()
    parts = []
    if SOURCE_WIKI in sources:
        parts.append(catalog_title_column.is_not(None))
    if SOURCE_CUSTOM in sources:
        parts.append(catalog_title_column.is_(None))
    clause = or_(*parts) if parts else false()
    return not_(clause) if exclude else clause


def order_by(column: Any, descending: bool) -> list[Any]:
    """Sort with empty values last either way (SQLite puts NULLs first ascending)."""
    return [column.is_(None), column.desc() if descending else column.asc()]
