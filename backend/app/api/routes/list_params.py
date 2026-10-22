"""Query parameters for the Vehicles and Sets lists, as FastAPI dependencies (like
VideoGameTrackarr's GameFilterParams). Every filter takes repeated values
(?manufacturerId=1&manufacturerId=2) plus an Exclude flag, and tags also a Match-all flag;
see app/services/list_filters.py. The single-value forms older callers send
(?manufacturerId=1, ?status=owned) are just a one-item list, so they keep working.

Field names match car_service.list_cars' / set_service.list_sets' keyword arguments, so a
route can pass **vars(params).
"""

from dataclasses import dataclass
from typing import Literal

from fastapi import Query

from app.models.car import CarCondition, CarStatus
from app.models.car_set import SetType

Source = Literal["wiki", "custom"]
SealedState = Literal["sealed", "opened"]


@dataclass
class VehicleFilterParams:
    search: str | None = Query(default=None)
    statuses: list[CarStatus] | None = Query(default=None, alias="status")
    status_exclude: bool = Query(default=False, alias="statusExclude")
    manufacturer_ids: list[int] | None = Query(default=None, alias="manufacturerId")
    manufacturer_exclude: bool = Query(default=False, alias="manufacturerExclude")
    series_ids: list[int] | None = Query(default=None, alias="seriesId")
    series_exclude: bool = Query(default=False, alias="seriesExclude")
    vehicle_type_ids: list[int] | None = Query(default=None, alias="vehicleTypeId")
    vehicle_type_exclude: bool = Query(default=False, alias="vehicleTypeExclude")
    color_ids: list[int] | None = Query(default=None, alias="colorId")
    color_exclude: bool = Query(default=False, alias="colorExclude")
    conditions: list[CarCondition] | None = Query(default=None, alias="condition")
    condition_exclude: bool = Query(default=False, alias="conditionExclude")
    tag_ids: list[int] | None = Query(default=None, alias="tagId")
    tag_exclude: bool = Query(default=False, alias="tagExclude")
    tag_match_all: bool = Query(default=False, alias="tagMatchAll")
    sources: list[Source] | None = Query(default=None, alias="source")
    source_exclude: bool = Query(default=False, alias="sourceExclude")
    sort: str = Query(default="name")
    order: Literal["asc", "desc"] = Query(default="asc")


@dataclass
class SetFilterParams:
    search: str | None = Query(default=None)
    statuses: list[CarStatus] | None = Query(default=None, alias="status")
    status_exclude: bool = Query(default=False, alias="statusExclude")
    set_types: list[SetType] | None = Query(default=None, alias="setType")
    set_type_exclude: bool = Query(default=False, alias="setTypeExclude")
    manufacturer_ids: list[int] | None = Query(default=None, alias="manufacturerId")
    manufacturer_exclude: bool = Query(default=False, alias="manufacturerExclude")
    series_ids: list[int] | None = Query(default=None, alias="seriesId")
    series_exclude: bool = Query(default=False, alias="seriesExclude")
    conditions: list[CarCondition] | None = Query(default=None, alias="condition")
    condition_exclude: bool = Query(default=False, alias="conditionExclude")
    sealed_states: list[SealedState] | None = Query(default=None, alias="sealed")
    sealed_exclude: bool = Query(default=False, alias="sealedExclude")
    tag_ids: list[int] | None = Query(default=None, alias="tagId")
    tag_exclude: bool = Query(default=False, alias="tagExclude")
    tag_match_all: bool = Query(default=False, alias="tagMatchAll")
    sources: list[Source] | None = Query(default=None, alias="source")
    source_exclude: bool = Query(default=False, alias="sourceExclude")
    sort: str = Query(default="name")
    order: Literal["asc", "desc"] = Query(default="asc")
