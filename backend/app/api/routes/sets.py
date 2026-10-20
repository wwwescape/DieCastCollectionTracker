from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.car import CarStatus
from app.models.car_set import SetType
from app.schemas.car_set import SetCreateRequest, SetResponse, SetUpdateRequest, set_from_orm
from app.services import set_service

router = APIRouter(prefix="/api/sets", tags=["sets"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[SetResponse])
def list_sets(
    search: str | None = Query(default=None),
    manufacturer_id: int | None = Query(default=None, alias="manufacturerId"),
    set_type: SetType | None = Query(default=None, alias="setType"),
    status_filter: CarStatus | None = Query(default=None, alias="status"),
    sort: str = Query(default="name"),
    order: str = Query(default="asc"),
    db: Session = Depends(get_db),
) -> list[SetResponse]:
    sets = set_service.list_sets(
        db,
        search=search,
        manufacturer_id=manufacturer_id,
        set_type=set_type,
        status=status_filter,
        sort=sort,
        order=order,
    )
    return [set_from_orm(car_set) for car_set in sets]


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
