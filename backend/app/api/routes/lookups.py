from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.lookups import Series
from app.repositories import color_repository, manufacturer_repository, series_repository, vehicle_type_repository
from app.schemas.lookups import (
    ColorCreateRequest,
    ColorResponse,
    ManufacturerCreateRequest,
    ManufacturerResponse,
    SeriesCreateRequest,
    SeriesResponse,
    VehicleTypeCreateRequest,
    VehicleTypeResponse,
)
from app.services.exceptions import ConflictError, NotFoundError

router = APIRouter(prefix="/api", tags=["lookups"], dependencies=[Depends(get_current_user)])


def _conflict_if_in_use(in_use: bool, kind: str) -> None:
    if in_use:
        raise ConflictError(f"{kind} is still in use by a car")


def _not_found(kind: str) -> NotFoundError:
    return NotFoundError(f"{kind} not found")


@router.get("/manufacturers", response_model=list[ManufacturerResponse])
def list_manufacturers(db: Session = Depends(get_db)) -> list[ManufacturerResponse]:
    return [ManufacturerResponse.model_validate(m) for m in manufacturer_repository.list_manufacturers(db)]


@router.post("/manufacturers", response_model=ManufacturerResponse, status_code=status.HTTP_201_CREATED)
def create_manufacturer(body: ManufacturerCreateRequest, db: Session = Depends(get_db)) -> ManufacturerResponse:
    manufacturer = manufacturer_repository.get_or_create_by_name(db, body.name)
    db.commit()
    return ManufacturerResponse.model_validate(manufacturer)


@router.delete("/manufacturers/{manufacturer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_manufacturer(manufacturer_id: int, db: Session = Depends(get_db)) -> None:
    manufacturer = manufacturer_repository.get_by_id(db, manufacturer_id)
    if manufacturer is None:
        raise _not_found("Manufacturer")
    _conflict_if_in_use(manufacturer_repository.is_in_use(db, manufacturer_id), "Manufacturer")
    manufacturer_repository.delete_manufacturer(db, manufacturer)
    db.commit()


@router.get("/vehicle-types", response_model=list[VehicleTypeResponse])
def list_vehicle_types(db: Session = Depends(get_db)) -> list[VehicleTypeResponse]:
    return [VehicleTypeResponse.model_validate(v) for v in vehicle_type_repository.list_vehicle_types(db)]


@router.post("/vehicle-types", response_model=VehicleTypeResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle_type(body: VehicleTypeCreateRequest, db: Session = Depends(get_db)) -> VehicleTypeResponse:
    vehicle_type = vehicle_type_repository.get_or_create_by_name(db, body.name)
    db.commit()
    return VehicleTypeResponse.model_validate(vehicle_type)


@router.delete("/vehicle-types/{vehicle_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle_type(vehicle_type_id: int, db: Session = Depends(get_db)) -> None:
    vehicle_type = vehicle_type_repository.get_by_id(db, vehicle_type_id)
    if vehicle_type is None:
        raise _not_found("Vehicle type")
    _conflict_if_in_use(vehicle_type_repository.is_in_use(db, vehicle_type_id), "Vehicle type")
    vehicle_type_repository.delete_vehicle_type(db, vehicle_type)
    db.commit()


@router.get("/colors", response_model=list[ColorResponse])
def list_colors(db: Session = Depends(get_db)) -> list[ColorResponse]:
    return [ColorResponse.model_validate(c) for c in color_repository.list_colors(db)]


@router.post("/colors", response_model=ColorResponse, status_code=status.HTTP_201_CREATED)
def create_color(body: ColorCreateRequest, db: Session = Depends(get_db)) -> ColorResponse:
    color = color_repository.get_or_create_by_name(db, body.name)
    db.commit()
    return ColorResponse.model_validate(color)


@router.delete("/colors/{color_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_color(color_id: int, db: Session = Depends(get_db)) -> None:
    color = color_repository.get_by_id(db, color_id)
    if color is None:
        raise _not_found("Color")
    _conflict_if_in_use(color_repository.is_in_use(db, color_id), "Color")
    color_repository.delete_color(db, color)
    db.commit()


def _series_response(series: Series) -> SeriesResponse:
    return SeriesResponse(
        id=series.id,
        name=series.name,
        manufacturer_id=series.manufacturer_id,
        manufacturer_name=series.manufacturer.name if series.manufacturer else None,
    )


@router.get("/series", response_model=list[SeriesResponse])
def list_series(
    manufacturer_id: int | None = Query(default=None, alias="manufacturerId"), db: Session = Depends(get_db)
) -> list[SeriesResponse]:
    return [_series_response(s) for s in series_repository.list_series(db, manufacturer_id=manufacturer_id)]


@router.post("/series", response_model=SeriesResponse, status_code=status.HTTP_201_CREATED)
def create_series(body: SeriesCreateRequest, db: Session = Depends(get_db)) -> SeriesResponse:
    manufacturer_id = (
        manufacturer_repository.get_or_create_by_name(db, body.manufacturer).id if body.manufacturer else None
    )
    series = series_repository.get_or_create_by_name(db, body.name, manufacturer_id)
    db.commit()
    return _series_response(series)


@router.delete("/series/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_series(series_id: int, db: Session = Depends(get_db)) -> None:
    series = series_repository.get_by_id(db, series_id)
    if series is None:
        raise _not_found("Series")
    _conflict_if_in_use(series_repository.is_in_use(db, series_id), "Series")
    series_repository.delete_series(db, series)
    db.commit()
