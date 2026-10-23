"""Settings → Lookups: usage counts, rename and merge for manufacturers, series, vehicle
types, colors and tags.

Lookups carry no "came from the wiki" flag — they're plain names, and the same entry is shared
by hand-entered and wiki-matched items. What matters is what uses an entry now: one used by
any wiki-matched vehicle or set (``catalog_title`` set) is *wiki-backed*. Renaming it would
drift from the wiki, and the next Re-match would quietly recreate the old name, so it can't be
renamed or merged away. The wiki only fills in manufacturer, series and color, so vehicle
types and tags are never wiki-backed.
"""

from dataclasses import dataclass, field

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.models.car import Car, CarTag
from app.models.car_set import CarSet, SetTag
from app.models.lookups import Color, Manufacturer, Series, Tag, VehicleType
from app.services.exceptions import ConflictError, NotFoundError

# Column references: (item model, foreign-key column name). Tags use link tables instead.
_COLUMN_REFS = {
    "manufacturers": [(Car, "manufacturer_id"), (CarSet, "manufacturer_id")],
    "series": [(Car, "series_id"), (CarSet, "series_id")],
    "vehicle-types": [(Car, "vehicle_type_id")],
    "colors": [(Car, "color_id")],
}
_MODELS = {
    "manufacturers": Manufacturer,
    "series": Series,
    "vehicle-types": VehicleType,
    "colors": Color,
    "tags": Tag,
}
_WIKI_FILLED = {"manufacturers", "series", "colors"}
_LABELS = {
    "manufacturers": "Manufacturer",
    "series": "Series",
    "vehicle-types": "Vehicle type",
    "colors": "Color",
    "tags": "Tag",
}

LOOKUP_KINDS = tuple(_MODELS)


@dataclass
class Usage:
    car_count: int = 0
    set_count: int = 0
    wiki_backed: bool = False


@dataclass
class _Counts:
    cars: dict[int, int] = field(default_factory=dict)
    sets: dict[int, int] = field(default_factory=dict)
    wiki: set[int] = field(default_factory=set)


def _check_kind(kind: str) -> None:
    if kind not in _MODELS:
        raise NotFoundError(f"Unknown lookup list: {kind}")


def usage(db: Session, kind: str) -> dict[int, Usage]:
    """Every entry of one list with how many vehicles and sets use it, and whether any of them
    is wiki-matched. Entries nothing uses are included with zero counts."""
    _check_kind(kind)
    model = _MODELS[kind]
    counts = _Counts()

    if kind == "tags":
        for link, target in ((CarTag, counts.cars), (SetTag, counts.sets)):
            for tag_id, n in db.execute(select(link.tag_id, func.count()).group_by(link.tag_id)):
                target[tag_id] = n
    else:
        for item, column_name in _COLUMN_REFS[kind]:
            column = getattr(item, column_name)
            target = counts.cars if item is Car else counts.sets
            for ref_id, n in db.execute(select(column, func.count()).where(column.is_not(None)).group_by(column)):
                target[ref_id] = n
            if kind in _WIKI_FILLED:
                wiki_rows = db.scalars(
                    select(column).where(column.is_not(None), item.catalog_title.is_not(None)).distinct()
                )
                counts.wiki.update(wiki_rows)

    return {
        entry_id: Usage(
            car_count=counts.cars.get(entry_id, 0),
            set_count=counts.sets.get(entry_id, 0),
            wiki_backed=entry_id in counts.wiki,
        )
        for entry_id in db.scalars(select(model.id))
    }


def _is_wiki_backed(db: Session, kind: str, entry_id: int) -> bool:
    if kind not in _WIKI_FILLED:
        return False
    for item, column_name in _COLUMN_REFS[kind]:
        column = getattr(item, column_name)
        hit = db.scalars(
            select(item.id).where(column == entry_id, item.catalog_title.is_not(None)).limit(1)
        ).first()
        if hit is not None:
            return True
    return False


def _get(db: Session, kind: str, entry_id: int):
    _check_kind(kind)
    entry = db.get(_MODELS[kind], entry_id)
    if entry is None:
        raise NotFoundError(f"{_LABELS[kind]} not found")
    return entry


def _name_taken(db: Session, kind: str, entry, name: str) -> bool:
    model = _MODELS[kind]
    stmt = select(model.id).where(model.name == name, model.id != entry.id)
    if kind == "series":
        # Series names are unique per manufacturer (or among unscoped series).
        stmt = stmt.where(
            Series.manufacturer_id.is_(None)
            if entry.manufacturer_id is None
            else Series.manufacturer_id == entry.manufacturer_id
        )
    return db.scalars(stmt.limit(1)).first() is not None


def rename(db: Session, kind: str, entry_id: int, name: str, color: str | None = None, set_color: bool = False):
    """Renames an entry (and, for tags, sets its chip color). Refused for wiki-backed entries,
    and when another entry already has the name — that's what merge is for."""
    entry = _get(db, kind, entry_id)
    name = name.strip()
    if name != entry.name:
        if _is_wiki_backed(db, kind, entry_id):
            raise ConflictError(f"{_LABELS[kind]} comes from the wiki and can't be renamed")
        if _name_taken(db, kind, entry, name):
            raise ConflictError(f'Another {_LABELS[kind].lower()} is already called "{name}". Merge them instead.')
        entry.name = name
    if kind == "tags" and set_color:
        entry.color = color
    db.commit()
    db.refresh(entry)
    return entry


def merge(db: Session, kind: str, source_id: int, target_id: int):
    """Moves everything that uses ``source_id`` over to ``target_id`` and deletes the source —
    for duplicates like "Dark blue" and "Dark Blue". The source can't be wiki-backed (the next
    Re-match would recreate it); series can only merge within the same manufacturer."""
    if source_id == target_id:
        raise ConflictError("Pick a different entry to merge into")
    source = _get(db, kind, source_id)
    target = _get(db, kind, target_id)
    if _is_wiki_backed(db, kind, source_id):
        raise ConflictError(f"{_LABELS[kind]} comes from the wiki and can't be merged into another")
    if kind == "series" and source.manufacturer_id != target.manufacturer_id:
        raise ConflictError("Series can only be merged within the same manufacturer")

    if kind == "tags":
        for link, item_column in ((CarTag, CarTag.car_id), (SetTag, SetTag.set_id)):
            already = select(item_column).where(link.tag_id == target_id)
            # Items that have both tags keep the target's link; the rest move over.
            db.execute(delete(link).where(link.tag_id == source_id, item_column.in_(already)))
            db.execute(update(link).where(link.tag_id == source_id).values(tag_id=target_id))
    else:
        for item, column_name in _COLUMN_REFS[kind]:
            column = getattr(item, column_name)
            db.execute(update(item).where(column == source_id).values({column_name: target_id}))
        if kind == "manufacturers":
            # Series scoped to the merged manufacturer move with it (or fold into the target's
            # series of the same name).
            for series in db.scalars(select(Series).where(Series.manufacturer_id == source_id)).all():
                twin = db.scalars(
                    select(Series).where(Series.manufacturer_id == target_id, Series.name == series.name)
                ).first()
                if twin is None:
                    series.manufacturer_id = target_id
                else:
                    for item in (Car, CarSet):
                        db.execute(update(item).where(item.series_id == series.id).values(series_id=twin.id))
                    db.delete(series)
            db.flush()

    db.delete(source)
    db.commit()
    db.refresh(target)
    return target
