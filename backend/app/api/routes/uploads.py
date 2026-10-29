from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.api.deps import get_current_user
from app.schemas.upload import ImageImportRequest, UploadResponse
from app.services import upload_service

router = APIRouter(prefix="/api/uploads", tags=["uploads"], dependencies=[Depends(get_current_user)])
# Public like the /uploads files themselves (an <img> sends no token); registered before that
# mount in main.py so this path is answered here.
thumbnail_router = APIRouter(tags=["uploads"])


def image_upload_error_to_http(exc: ValueError) -> HTTPException:
    if isinstance(exc, upload_service.ImageTooLargeError):
        return HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=str(exc))
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/car-images", response_model=UploadResponse, status_code=201)
def upload_car_image(file: UploadFile = File(...)) -> UploadResponse:
    try:
        url = upload_service.save_car_image(file.file)
    except ValueError as exc:
        raise image_upload_error_to_http(exc) from exc
    return UploadResponse(url=url)


@router.post("/car-images/from-wiki", response_model=UploadResponse, status_code=201)
def import_car_image_from_wiki(body: ImageImportRequest) -> UploadResponse:
    try:
        url = upload_service.import_car_image_from_wiki(body.url)
    except ValueError as exc:
        raise image_upload_error_to_http(exc) from exc
    return UploadResponse(url=url)


@thumbnail_router.get("/uploads/car-images/thumbs/{name}", include_in_schema=False)
def car_image_thumbnail(name: str) -> FileResponse:
    found = upload_service.car_image_thumbnail(name)
    if found is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    path, is_thumbnail = found
    # The full photo stands in until the thumbnail is made, so it mustn't be kept as if it
    # were the thumbnail (main.py marks everything else under /uploads/ as cacheable forever).
    headers = None if is_thumbnail else {"Cache-Control": "no-cache"}
    return FileResponse(path, media_type="image/jpeg", headers=headers)
