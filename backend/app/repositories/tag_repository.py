from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.car import CarTag
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
