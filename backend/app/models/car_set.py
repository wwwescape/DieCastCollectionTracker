import enum

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.car import CarStatus
from app.models.lookups import Manufacturer
from app.models.mixins import TimestampMixin, enum_column


class SetType(enum.Enum):
    PLAYSET = "playset"
    TRACK_SET = "track_set"


class CarSet(TimestampMixin, Base):
    """A playset or track set, like Hot Wheels City's Super Loop Fire Station. Tracked as
    one item (it may be kept sealed), so any cars that came with it are a plain list of names
    in `contents` rather than Car rows. Multi-packs and gift packs are not sets here: their
    cars are tracked individually."""

    __tablename__ = "sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    manufacturer_id: Mapped[int] = mapped_column(ForeignKey("manufacturers.id"), nullable=False, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    set_type: Mapped[SetType] = mapped_column(enum_column(SetType), nullable=False, default=SetType.PLAYSET)
    toy_number: Mapped[str | None] = mapped_column(String(100))
    year: Mapped[int | None] = mapped_column(Integer)

    status: Mapped[CarStatus] = mapped_column(enum_column(CarStatus), nullable=False, default=CarStatus.OWNED)
    sealed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    purchase_price: Mapped[float | None] = mapped_column()
    notes: Mapped[str | None] = mapped_column(Text)
    photo: Mapped[str | None] = mapped_column(String(1024))
    # One entry per car in the box, e.g. "'83 Chevy Silverado (Metalflake dark gray)".
    contents: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    # Wiki page this set was matched to — see app/services/wiki_catalog.py.
    catalog_source: Mapped[str | None] = mapped_column(String(32))
    catalog_title: Mapped[str | None] = mapped_column(String(255))

    manufacturer: Mapped["Manufacturer"] = relationship()
