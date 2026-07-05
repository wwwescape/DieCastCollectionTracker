from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin


class Manufacturer(TimestampMixin, Base):
    __tablename__ = "manufacturers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)


class VehicleType(TimestampMixin, Base):
    __tablename__ = "vehicle_types"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)


class Color(TimestampMixin, Base):
    __tablename__ = "colors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)


class Series(TimestampMixin, Base):
    """Optionally scoped to a manufacturer (e.g. "Treasure Hunt" only makes sense under Hot
    Wheels) — manufacturer_id is nullable so a series can also be left unscoped."""

    __tablename__ = "series"
    __table_args__ = (UniqueConstraint("manufacturer_id", "name", name="uq_series_manufacturer_id_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    manufacturer_id: Mapped[int | None] = mapped_column(ForeignKey("manufacturers.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    manufacturer: Mapped["Manufacturer | None"] = relationship()


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    color: Mapped[str | None] = mapped_column(String(20), comment="hex color for UI chips")
