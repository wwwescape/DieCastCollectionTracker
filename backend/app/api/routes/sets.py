from fastapi import APIRouter, Depends, File, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.api.routes.list_params import SetFilterParams
from app.api.routes.uploads import image_upload_error_to_http
from app.schemas.bulk import BulkDeleteRequest, BulkEditRequest, BulkResultResponse
from app.schemas.car import CarPhotoResponse
from app.schemas.car_set import SetCreateRequest, SetResponse, SetUpdateRequest, set_from_orm
from app.schemas.upload import ImageImportRequest
from app.services import set_service, upload_service

router = APIRouter(prefix="/api/sets", tags=["sets"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[SetResponse])
def list_sets(filters: SetFilterParams = Depends(), db: Session = Depends(get_db)) -> list[SetResponse]:
    return [set_from_orm(car_set) for car_set in set_service.list_sets(db, **vars(filters))]


@router.post("/bulk-edit", response_model=BulkResultResponse)
def bulk_edit_sets(body: BulkEditRequest, db: Session = Depends(get_db)) -> BulkResultResponse:
    """The Sets list's selection mode; see POST /api/cars/bulk-edit."""
    count = set_service.bulk_edit_sets(db, body.ids, body.changes(), body.add_tags, body.remove_tag_ids)
    return BulkResultResponse(count=count)


@router.post("/bulk-delete", response_model=BulkResultResponse)
def bulk_delete_sets(body: BulkDeleteRequest, db: Session = Depends(get_db)) -> BulkResultResponse:
    return BulkResultResponse(count=set_service.bulk_delete_sets(db, body.ids))


@router.get("/{set_id}", response_model=SetResponse)
def get_set(set_id: int, db: Session = Depends(get_db)) -> SetResponse:
    return set_from_orm(set_service.get_set(db, set_id))


@router.post("", response_model=SetResponse, status_code=status.HTTP_201_CREATED)
def create_set(body: SetCreateRequest, db: Session = Depends(get_db)) -> SetResponse:
    return set_from_orm(set_service.create_set(db, **body.model_dump()))


@router.patch("/{set_id}", response_model=SetResponse)
def update_set(set_id: int, body: SetUpdateRequest, db: Session = Depends(get_db)) -> SetResponse:
    return set_from_orm(set_service.update_set(db, set_id, **body.model_dump(exclude_unset=True)))


@router.delete("/{set_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set(set_id: int, db: Session = Depends(get_db)) -> None:
    set_service.delete_set(db, set_id)


# --- Photo gallery (mirrors /api/cars/{id}/photos) ---


def _photo_response(photo) -> CarPhotoResponse:
    return CarPhotoResponse(id=photo.id, url=photo.url, is_primary=photo.is_primary, sort_order=photo.sort_order)


@router.post("/{set_id}/photos", response_model=CarPhotoResponse, status_code=status.HTTP_201_CREATED)
def add_set_photo(set_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)) -> CarPhotoResponse:
    set_service.get_set(db, set_id)  # 404 before writing a file that would be orphaned
    try:
        url = upload_service.save_car_image(file.file)
    except ValueError as exc:
        raise image_upload_error_to_http(exc) from exc
    return _photo_response(set_service.add_set_photo(db, set_id, url))


@router.post("/{set_id}/photos/from-wiki", response_model=CarPhotoResponse, status_code=status.HTTP_201_CREATED)
def import_set_photo_from_wiki(
    set_id: int, body: ImageImportRequest, db: Session = Depends(get_db)
) -> CarPhotoResponse:
    set_service.get_set(db, set_id)
    try:
        url = upload_service.import_car_image_from_wiki(body.url)
    except ValueError as exc:
        raise image_upload_error_to_http(exc) from exc
    return _photo_response(set_service.add_set_photo(db, set_id, url))


@router.delete("/{set_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_set_photo(set_id: int, photo_id: int, db: Session = Depends(get_db)) -> None:
    set_service.delete_set_photo(db, set_id, photo_id)


@router.patch("/{set_id}/photos/{photo_id}/primary", response_model=CarPhotoResponse)
def set_primary_set_photo(set_id: int, photo_id: int, db: Session = Depends(get_db)) -> CarPhotoResponse:
    return _photo_response(set_service.set_primary_set_photo(db, set_id, photo_id))
