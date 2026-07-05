from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.repositories import tag_repository
from app.schemas.tag import TagCreateRequest, TagResponse, tag_from_orm
from app.services.exceptions import NotFoundError

router = APIRouter(prefix="/api/tags", tags=["tags"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db)) -> list[TagResponse]:
    return [tag_from_orm(tag) for tag in tag_repository.list_tags(db)]


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(body: TagCreateRequest, db: Session = Depends(get_db)) -> TagResponse:
    tag = tag_repository.get_or_create_by_name(db, body.name, body.color)
    db.commit()
    return tag_from_orm(tag)


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(tag_id: int, db: Session = Depends(get_db)) -> None:
    tag = tag_repository.get_tag(db, tag_id)
    if tag is None:
        raise NotFoundError("Tag not found")
    tag_repository.delete_tag(db, tag)
    db.commit()
