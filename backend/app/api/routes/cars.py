from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.car import CarStatus
from app.schemas.car import CarCreateRequest, CarPhotoResponse, CarResponse, CarUpdateRequest, car_from_orm
from app.services import car_service, upload_service

router = APIRouter(prefix="/api/cars", tags=["cars"], dependencies=[Depends(get_current_user)])


def _car_response(db: Session, car) -> CarResponse:
    return car_from_orm(car, car_service.get_car_tags(db, car.id))


@router.get("", response_model=list[CarResponse])
def list_cars(
    search: str | None = Query(default=None),
    manufacturer_id: int | None = Query(default=None, alias="manufacturerId"),
    series_id: int | None = Query(default=None, alias="seriesId"),
    vehicle_type_id: int | None = Query(default=None, alias="vehicleTypeId"),
    color_id: int | None = Query(default=None, alias="colorId"),
    status_filter: CarStatus | None = Query(default=None, alias="status"),
    tag_id: int | None = Query(default=None, alias="tagId"),
    sort: str = Query(default="name"),
    order: str = Query(default="asc"),
    db: Session = Depends(get_db),
) -> list[CarResponse]:
    cars = car_service.list_cars(
        db,
        search=search,
        manufacturer_id=manufacturer_id,
        series_id=series_id,
        vehicle_type_id=vehicle_type_id,
        color_id=color_id,
        status=status_filter,
        tag_id=tag_id,
        sort=sort,
        order=order,
    )
    return [_car_response(db, car) for car in cars]


@router.get("/{car_id}", response_model=CarResponse)
def get_car(car_id: int, db: Session = Depends(get_db)) -> CarResponse:
    car = car_service.get_car(db, car_id)
    return _car_response(db, car)


@router.post("", response_model=CarResponse, status_code=status.HTTP_201_CREATED)
def create_car(body: CarCreateRequest, db: Session = Depends(get_db)) -> CarResponse:
    car = car_service.create_car(db, **body.model_dump())
    return _car_response(db, car)


@router.patch("/{car_id}", response_model=CarResponse)
def update_car(car_id: int, body: CarUpdateRequest, db: Session = Depends(get_db)) -> CarResponse:
    car = car_service.update_car(db, car_id, **body.model_dump(exclude_unset=True))
    return _car_response(db, car)


@router.delete("/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(car_id: int, db: Session = Depends(get_db)) -> None:
    car_service.delete_car(db, car_id)


# --- Photo gallery ---

@router.post("/{car_id}/photos", response_model=CarPhotoResponse, status_code=status.HTTP_201_CREATED)
async def add_car_photo(
    car_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> CarPhotoResponse:
    raw = await file.read()
    try:
        url = upload_service.save_car_image(raw)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    photo = car_service.add_car_photo(db, car_id, url)
    return CarPhotoResponse(id=photo.id, url=photo.url, is_primary=photo.is_primary, sort_order=photo.sort_order)


@router.delete("/{car_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car_photo(car_id: int, photo_id: int, db: Session = Depends(get_db)) -> None:
    car_service.delete_car_photo(db, car_id, photo_id)


@router.patch("/{car_id}/photos/{photo_id}/primary", response_model=CarPhotoResponse)
def set_primary_car_photo(car_id: int, photo_id: int, db: Session = Depends(get_db)) -> CarPhotoResponse:
    photo = car_service.set_primary_car_photo(db, car_id, photo_id)
    return CarPhotoResponse(id=photo.id, url=photo.url, is_primary=photo.is_primary, sort_order=photo.sort_order)
