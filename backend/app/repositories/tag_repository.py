from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.models.car import CarTag
from app.models.car_set import SetTag
from app.models.lookups import Tag


def list_tags(db: Session) -> list[Tag]:
    return list(db.scalars(select(Tag).order_by(Tag.name)))


def get_tag(db: Session, tag_id: int) -> Tag | None:
    return db.scalars(select(Tag).where(Tag.id == tag_id)).first()


def get_tag_by_name(db: Session, name: str) -> Tag | None:
    return db.scalars(select(Tag).where(Tag.name == name)).first()


def get_or_create_by_name(db: Session, name: str, color: str | None = None) -> Tag:
    tag = get_tag_by_name(db, name)
    if tag is not None:
        return tag

    tag = Tag(name=name, color=color)
    db.add(tag)
    db.flush()
    return tag


def delete_tag(db: Session, tag: Tag) -> None:
    db.execute(delete(CarTag).where(CarTag.tag_id == tag.id))
    db.execute(delete(SetTag).where(SetTag.tag_id == tag.id))
    db.delete(tag)
    db.flush()


def list_tags_for_car(db: Session, car_id: int) -> list[Tag]:
    stmt = select(Tag).join(CarTag, CarTag.tag_id == Tag.id).where(CarTag.car_id == car_id).order_by(Tag.name)
    return list(db.scalars(stmt))


def set_tags_for_car(db: Session, car_id: int, tag_ids: list[int]) -> None:
    """Replaces the full tag set for a car in one shot — matches the multi-select tag
    picker on the Add/Edit Car form, which always submits the complete desired set rather
    than incremental attach/detach calls."""
    db.execute(delete(CarTag).where(CarTag.car_id == car_id))
    for tag_id in tag_ids:
        db.add(CarTag(car_id=car_id, tag_id=tag_id))
    db.flush()


def add_tags_to_cars(db: Session, car_ids: list[int], tag_ids: list[int]) -> None:
    if not car_ids or not tag_ids:
        return
    existing = set(db.execute(select(CarTag.car_id, CarTag.tag_id).where(CarTag.car_id.in_(car_ids))).all())
    for car_id in car_ids:
        for tag_id in dict.fromkeys(tag_ids):
            if (car_id, tag_id) not in existing:
                db.add(CarTag(car_id=car_id, tag_id=tag_id))
    db.flush()


def remove_tags_from_cars(db: Session, car_ids: list[int], tag_ids: list[int]) -> None:
    if car_ids and tag_ids:
        db.execute(delete(CarTag).where(CarTag.car_id.in_(car_ids), CarTag.tag_id.in_(tag_ids)))
        db.flush()


def add_tags_to_sets(db: Session, set_ids: list[int], tag_ids: list[int]) -> None:
    if not set_ids or not tag_ids:
        return
    existing = set(db.execute(select(SetTag.set_id, SetTag.tag_id).where(SetTag.set_id.in_(set_ids))).all())
    for set_id in set_ids:
        for tag_id in dict.fromkeys(tag_ids):
            if (set_id, tag_id) not in existing:
                db.add(SetTag(set_id=set_id, tag_id=tag_id))
    db.flush()


def remove_tags_from_sets(db: Session, set_ids: list[int], tag_ids: list[int]) -> None:
    if set_ids and tag_ids:
        db.execute(delete(SetTag).where(SetTag.set_id.in_(set_ids), SetTag.tag_id.in_(tag_ids)))
        db.flush()


def tag_coverage(db: Session, car_ids: list[int], set_ids: list[int]) -> list[tuple[Tag, int]]:
    """Every tag with how many of the given vehicles and sets carry it, for the bulk Tags
    dialog's "3 of 5" counts."""
    counts: dict[int, int] = {}
    if car_ids:
        for tag_id, count in db.execute(
            select(CarTag.tag_id, func.count()).where(CarTag.car_id.in_(car_ids)).group_by(CarTag.tag_id)
        ).all():
            counts[tag_id] = counts.get(tag_id, 0) + count
    if set_ids:
        for tag_id, count in db.execute(
            select(SetTag.tag_id, func.count()).where(SetTag.set_id.in_(set_ids)).group_by(SetTag.tag_id)
        ).all():
            counts[tag_id] = counts.get(tag_id, 0) + count
    return [(tag, counts.get(tag.id, 0)) for tag in list_tags(db)]

