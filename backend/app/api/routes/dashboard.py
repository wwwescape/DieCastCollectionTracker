from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.schemas.dashboard import DashboardStats
from app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)) -> DashboardStats:
    return dashboard_service.get_dashboard_stats(db)
