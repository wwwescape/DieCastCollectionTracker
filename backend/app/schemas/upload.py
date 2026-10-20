from pydantic import Field

from app.schemas.base import CamelModel


class ImageImportRequest(CamelModel):
    url: str = Field(min_length=1, max_length=2048)


class UploadResponse(CamelModel):
    url: str
