from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.uploads import image_upload_error_to_http
from app.models.car import CarStatus
from app.schemas.car import (
    CarBulkCreateRequest,
    CarBulkCreateResponse,
    CarCreateRequest,
    CarPhotoResponse,
    CarResponse,
    CarUpdateRequest,
    car_from_orm,
)
from app.schemas.car_set import linked_set_from_orm
from app.schemas.upload import ImageImportRequest
from app.services import car_service, upload_service, wiki_catalog

router = APIRouter(prefix="/api/cars", tags=["cars"], dependencies=[Depends(get_current_user)])

# Wiki photos copied at once by POST /api/cars/bulk; polite to Fandom, but ~5x faster than serial.
WIKI_PHOTO_WORKERS = 5


def _car_response(db: Session, car) -> CarResponse:
    sets = [linked_set_from_orm(car_set) for car_set in car_service.get_car_sets(db, car.id)]
    return car_from_orm(car, car_service.get_car_tags(db, car.id), sets)


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


@router.post("/bulk", response_model=CarBulkCreateResponse, status_code=status.HTTP_201_CREATED)
def create_cars_bulk(body: CarBulkCreateRequest, db: Session = Depends(get_db)) -> CarBulkCreateResponse:
    """Adds several cars at once, e.g. the cars picked from a multi-pack. Wiki photos are
    copied first; one that can't be copied leaves its car without a photo rather than failing
    the batch. If saving the cars fails, the copied photos are removed again.

    Each wiki image request takes a couple of seconds whatever its size, so the photos are
    fetched a few at a time rather than one after another."""
    items = [car.model_dump(exclude={"wiki_photo_url"}) for car in body.cars]
    to_import = {
        index: car.wiki_photo_url
        for index, car in enumerate(body.cars)
        if car.wiki_photo_url and not items[index].get("photo")
    }
    saved_photos: list[str] = []
    photos_failed = 0
    with ThreadPoolExecutor(max_workers=WIKI_PHOTO_WORKERS) as pool:
        futures = {
            index: pool.submit(upload_service.import_car_image_from_wiki, url) for index, url in to_import.items()
        }
        for index, future in futures.items():
            try:
                items[index]["photo"] = future.result()
                saved_photos.append(items[index]["photo"])
            except (ValueError, wiki_catalog.CatalogUnavailableError):
                photos_failed += 1
    try:
        cars = car_service.create_cars(db, items)
    except Exception:
        for url in saved_photos:
            upload_service.delete_if_local_car_image(url)
        raise
    return CarBulkCreateResponse(cars=[_car_response(db, car) for car in cars], photos_failed=photos_failed)


@router.patch("/{car_id}", response_model=CarResponse)
def update_car(car_id: int, body: CarUpdateRequest, db: Session = Depends(get_db)) -> CarResponse:
    car = car_service.update_car(db, car_id, **body.model_dump(exclude_unset=True))
    return _car_response(db, car)


@router.delete("/{car_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car(car_id: int, db: Session = Depends(get_db)) -> None:
    car_service.delete_car(db, car_id)


# --- Photo gallery ---

@router.post("/{car_id}/photos", response_model=CarPhotoResponse, status_code=status.HTTP_201_CREATED)
def add_car_photo(
    car_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> CarPhotoResponse:
    car_service.get_car(db, car_id)  # 404 before writing a file that would be orphaned
    try:
        url = upload_service.save_car_image(file.file)
    except ValueError as exc:
        raise image_upload_error_to_http(exc) from exc
    photo = car_service.add_car_photo(db, car_id, url)
    return CarPhotoResponse(id=photo.id, url=photo.url, is_primary=photo.is_primary, sort_order=photo.sort_order)


@router.post("/{car_id}/photos/from-wiki", response_model=CarPhotoResponse, status_code=status.HTTP_201_CREATED)
def import_car_photo_from_wiki(
    car_id: int, body: ImageImportRequest, db: Session = Depends(get_db)
) -> CarPhotoResponse:
    car_service.get_car(db, car_id)  # 404 before writing a file that would be orphaned
    try:
        url = upload_service.import_car_image_from_wiki(body.url)
    except ValueError as exc:
        raise image_upload_error_to_http(exc) from exc
    photo = car_service.add_car_photo(db, car_id, url)
    return CarPhotoResponse(id=photo.id, url=photo.url, is_primary=photo.is_primary, sort_order=photo.sort_order)


@router.delete("/{car_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_car_photo(car_id: int, photo_id: int, db: Session = Depends(get_db)) -> None:
    car_service.delete_car_photo(db, car_id, photo_id)


@router.patch("/{car_id}/photos/{photo_id}/primary", response_model=CarPhotoResponse)
def set_primary_car_photo(car_id: int, photo_id: int, db: Session = Depends(get_db)) -> CarPhotoResponse:
    photo = car_service.set_primary_car_photo(db, car_id, photo_id)
    return CarPhotoResponse(id=photo.id, url=photo.url, is_primary=photo.is_primary, sort_order=photo.sort_order)
