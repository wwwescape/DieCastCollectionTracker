from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.car import Car
from app.models.lookups import Color


def list_colors(db: Session) -> list[Color]:
    return list(db.scalars(select(Color).order_by(Color.name)))


def get_by_id(db: Session, color_id: int) -> Color | None:
    return db.get(Color, color_id)


def get_by_name(db: Session, name: str) -> Color | None:
    return db.scalars(select(Color).where(Color.name == name)).first()


def get_or_create_by_name(db: Session, name: str) -> Color:
    color = get_by_name(db, name)
    if color is not None:
        return color

    color = Color(name=name)
    db.add(color)
    db.flush()
    return color


def is_in_use(db: Session, color_id: int) -> bool:
    return db.scalars(select(Car.id).where(Car.color_id == color_id).limit(1)).first() is not None


def delete_color(db: Session, color: Color) -> None:
    db.execute(delete(Color).where(Color.id == color.id))
    db.flush()
