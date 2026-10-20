import enum

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.car import Car, CarCondition, CarStatus
from app.models.lookups import Manufacturer, Series, Tag
from app.models.mixins import TimestampMixin, enum_column


class SetType(enum.Enum):
    PLAYSET = "playset"
    TRACK_SET = "track_set"


class CarSet(TimestampMixin, Base):
    """A playset or track set, like Hot Wheels City's Super Loop Fire Station. Tracked as
    one item (it may be kept sealed). `contents` is the wiki's list of vehicles that came with
    it, as plain names; `vehicles` links the ones that are actually in the collection.
    Multi-packs and gift packs are not sets here: their vehicles are tracked individually."""

    __tablename__ = "sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("manufacturers.id"), nullable=False, index=True)
    series_id: Mapped[int | None] = mapped_column(ForeignKey("series.id"), index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    set_type: Mapped[SetType] = mapped_column(enum_column(SetType), nullable=False, default=SetType.PLAYSET)
    toy_number: Mapped[str | None] = mapped_column(String(100))
    year: Mapped[int | None] = mapped_column(Integer)

    status: Mapped[CarStatus] = mapped_column(enum_column(CarStatus), nullable=False, default=CarStatus.OWNED)
    condition: Mapped[CarCondition | None] = mapped_column(enum_column(CarCondition), nullable=True)
    sealed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    purchase_price: Mapped[float | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column(Text)
    # One entry per vehicle in the box, e.g. "'83 Chevy Silverado (Metalflake dark gray)".
    contents: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    # Wiki page this set was matched to — see app/services/wiki_catalog.py.
    catalog_source: Mapped[str | None] = mapped_column(String(32))
    catalog_title: Mapped[str | None] = mapped_column(String(255))

    manufacturer: Mapped["Manufacturer"] = relationship()
    series: Mapped["Series | None"] = relationship()
    photos: Mapped[list["SetPhoto"]] = relationship(back_populates="car_set")
    tag_links: Mapped[list["SetTag"]] = relationship()
    vehicle_links: Mapped[list["SetVehicle"]] = relationship(back_populates="car_set")


class SetPhoto(TimestampMixin, Base):
    """A set's photo gallery — the same shape as CarPhoto."""

    __tablename__ = "set_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    set_id: Mapped[int] = mapped_column(ForeignKey("sets.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    car_set: Mapped["CarSet"] = relationship(back_populates="photos")


class SetTag(Base):
    __tablename__ = "set_tags"

    set_id: Mapped[int] = mapped_column(ForeignKey("sets.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), primary_key=True)

    tag: Mapped["Tag"] = relationship()


class SetVehicle(Base):
    """Links a set to vehicles in the collection (many-to-many). Edited from either side —
    the Set form's Linked vehicles and the Vehicle form's Linked sets write the same rows."""

    __tablename__ = "set_vehicles"

    set_id: Mapped[int] = mapped_column(ForeignKey("sets.id"), primary_key=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id"), primary_key=True, index=True)

    car_set: Mapped["CarSet"] = relationship(back_populates="vehicle_links")
    car: Mapped["Car"] = relationship()
