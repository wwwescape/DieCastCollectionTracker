import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from pydantic import ValidationError
from sqlalchemy.orm import Session
from starlette.background import BackgroundTask

from app.api.deps import get_current_user, get_db
from app.core.security import TokenError, TokenType, create_backup_download_token, decode_token
from app.models.system import User
from app.schemas.backup import BackupRestoreResult, FullBackupLinkResponse
from app.services import backup_service

router = APIRouter(tags=["export"], dependencies=[Depends(get_current_user)])
# Reached by a plain browser navigation with a signed token in the path (no auth header).
download_router = APIRouter(tags=["export"])

# A .json backup holds names, facts and photo URLs, not the photos themselves, so even a large
# collection is a few MB; the cap stops an oversized upload from being read into memory. A
# .zip with photos is streamed to disk instead, up to MAX_ZIP_BACKUP_BYTES.
MAX_BACKUP_BYTES = 50 * 1024 * 1024
MAX_ZIP_BACKUP_BYTES = 8 * 1024 * 1024 * 1024
ZIP_FILENAME = "diecast-backup.zip"


@router.get("/api/export/backup")
def export_backup(db: Session = Depends(get_db)) -> Response:
    """The backup as plain JSON: everything but the photo files."""
    backup_json = backup_service.export_backup_json(db)
    return Response(
        content=backup_json,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="diecast-backup.json"'},
    )


@router.post("/api/export/backup/full-link", response_model=FullBackupLinkResponse)
def create_full_backup_link(current_user: User = Depends(get_current_user)) -> FullBackupLinkResponse:
    """A short-lived signed link the browser downloads the .zip (with photos) from itself —
    it can be large, too big to fetch into memory first."""
    token = create_backup_download_token(current_user.id)
    return FullBackupLinkResponse(url=f"/api/export/backup/full/{token}/{ZIP_FILENAME}")


@download_router.get("/api/export/backup/full/{token}/{filename}")
def download_full_backup(token: str, filename: str, db: Session = Depends(get_db)) -> FileResponse:
    try:
        payload = decode_token(token, TokenType.BACKUP_DOWNLOAD)
    except TokenError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired download link") from exc
    if db.get(User, int(payload["sub"])) is None:
        raise HTTPException(status_code=401, detail="Invalid or expired download link")
    path = backup_service.export_full_backup_zip(db)
    return FileResponse(
        path,
        media_type="application/zip",
        filename=ZIP_FILENAME,
        background=BackgroundTask(path.unlink, missing_ok=True),
    )


@router.post("/api/import/backup", response_model=BackupRestoreResult)
async def restore_backup(file: UploadFile = File(...), db: Session = Depends(get_db)) -> BackupRestoreResult:
    """Restores a .json backup, or a .zip one with its photos. Either way the collection is
    replaced, after a safety snapshot of the current one."""
    head = await file.read(4)
    await file.seek(0)
    if head.startswith(b"PK") or (file.filename or "").lower().endswith(".zip"):
        return await _restore_zip(file, db)

    raw = await file.read(MAX_BACKUP_BYTES + 1)
    if len(raw) > MAX_BACKUP_BYTES:
        raise HTTPException(
            status_code=413, detail=f"Backup file is larger than {MAX_BACKUP_BYTES // (1024 * 1024)} MB"
        )
    try:
        payload = backup_service.parse_backup_payload(raw.decode("utf-8"))
    except (UnicodeDecodeError, ValidationError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Not a valid backup file: {exc}") from exc
    return backup_service.restore_backup(db, payload)


async def _restore_zip(file: UploadFile, db: Session) -> BackupRestoreResult:
    """Streams the .zip to a temp file (never all in memory), checks it's a DCT backup, puts
    its photos in place, then restores the rows. The temp file is always removed."""
    handle, name = tempfile.mkstemp(prefix="dct-restore-", suffix=".zip")
    path = Path(name)
    try:
        size = 0
        with os.fdopen(handle, "wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_ZIP_BACKUP_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Backup file is larger than {MAX_ZIP_BACKUP_BYTES // (1024**3)} GB",
                    )
                out.write(chunk)
        try:
            payload = backup_service.read_full_backup_zip(path)
        except (UnicodeDecodeError, ValidationError, ValueError) as exc:
            raise HTTPException(status_code=400, detail=f"Not a valid backup file: {exc}") from exc
        photos = backup_service.extract_backup_photos(path, payload)
        result = backup_service.restore_backup(db, payload)
        result.restored_photos = photos
        return result
    finally:
        path.unlink(missing_ok=True)
