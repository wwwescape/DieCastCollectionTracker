import enum

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.lookups import Color, Manufacturer, Series, Tag, VehicleType
from app.models.mixins import TimestampMixin, enum_column


class CarStatus(enum.Enum):
    OWNED = "owned"
    WISHLIST = "wishlist"


class CarCondition(enum.Enum):
    MINT_IN_BOX = "mint_in_box"
    NEAR_MINT = "near_mint"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class Car(TimestampMixin, Base):
    __tablename__ = "cars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("manufacturers.id"), nullable=False, index=True)
    series_id: Mapped[int | None] = mapped_column(ForeignKey("series.id"), index=True)
    vehicle_type_id: Mapped[int | None] = mapped_column(ForeignKey("vehicle_types.id"), index=True)
    color_id: Mapped[int | None] = mapped_column(ForeignKey("colors.id"), index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    cast_number: Mapped[str | None] = mapped_column(String(100))
    collection_number: Mapped[str | None] = mapped_column(String(100))
    year: Mapped[int | None] = mapped_column(Integer)

    status: Mapped[CarStatus] = mapped_column(enum_column(CarStatus), nullable=False, default=CarStatus.OWNED)
    condition: Mapped[CarCondition | None] = mapped_column(enum_column(CarCondition), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    purchase_price: Mapped[float | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column(Text)

    manufacturer: Mapped["Manufacturer"] = relationship()
    series: Mapped["Series | None"] = relationship()
    vehicle_type: Mapped["VehicleType | None"] = relationship()
    color: Mapped["Color | None"] = relationship()
    photos: Mapped[list["CarPhoto"]] = relationship(back_populates="car")


class CarPhoto(TimestampMixin, Base):
    __tablename__ = "car_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    car: Mapped["Car"] = relationship(back_populates="photos")


class CarTag(Base):
    __tablename__ = "car_tags"

    car_id: Mapped[int] = mapped_column(ForeignKey("cars.id"), primary_key=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("tags.id"), primary_key=True)

    car: Mapped["Car"] = relationship()
    tag: Mapped["Tag"] = relationship()
