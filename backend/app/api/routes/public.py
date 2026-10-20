from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.public import PublicCarResponse, PublicSetResponse, public_car_from_orm, public_set_from_orm
from app.services import auth_service, car_service, set_service

# No auth dependency — this is the app's one deliberately unauthenticated router, gated
# instead by the unlisted per-user token in the path. See auth_service.get_user_by_share_token.
router = APIRouter(prefix="/api/public/{token}", tags=["public"])


@router.get("/cars", response_model=list[PublicCarResponse])
def list_public_cars(
    token: str, search: str | None = Query(default=None), db: Session = Depends(get_db)
) -> list[PublicCarResponse]:
    auth_service.get_user_by_share_token(db, token)
    return [public_car_from_orm(car) for car in car_service.list_cars(db, search=search)]


@router.get("/sets", response_model=list[PublicSetResponse])
def list_public_sets(
    token: str, search: str | None = Query(default=None), db: Session = Depends(get_db)
) -> list[PublicSetResponse]:
    auth_service.get_user_by_share_token(db, token)
    return [public_set_from_orm(car_set) for car_set in set_service.list_sets(db, search=search)]
