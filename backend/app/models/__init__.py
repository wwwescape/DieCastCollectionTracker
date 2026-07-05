"""Import every model module so they register on Base.metadata — required for Alembic
autogenerate and for the cross-module string-based relationship() references to resolve."""

from app.db.base import Base
from app.models.car import Car, CarCondition, CarPhoto, CarStatus, CarTag  # noqa: F401
from app.models.lookups import Color, Manufacturer, Series, Tag, VehicleType  # noqa: F401
from app.models.system import RefreshToken, User  # noqa: F401

__all__ = ["Base"]
