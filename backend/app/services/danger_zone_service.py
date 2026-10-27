"""Settings → General → Danger Zone: clear one kind of data, tidy up what nothing uses any
more, or reset the vehicles, the sets or everything. Each says exactly what it removes; the
three resets need RESET typed and take a safety snapshot first (backup_service), restorable
like any backup. Your account, settings, share link and saved backups are never touched.

Resets leave photo files on disk on purpose, so restoring the snapshot brings the photos back
too; "Remove unused photo files" frees that space once you no longer need them.
"""

import enum
import time
from dataclasses import dataclass, field

from sqlalchemy import delete, exists, select, update
from sqlalchemy.orm import Session

from app.models.car import Car, CarPhoto, CarTag
from app.models.car_set import CarSet, SetPhoto, SetTag, SetVehicle
from app.models.lookups import Color, Manufacturer, Series, Tag, VehicleType
from app.services import backup_service, upload_service
from app.services.exceptions import ConflictError


class DangerZoneAction(enum.Enum):
    CLEAR_NOTES = "clear_notes"
    CLEAR_TAGS = "clear_tags"
    CLEAR_PURCHASE_PRICES = "clear_purchase_prices"
    REMOVE_UNUSED_LOOKUPS = "remove_unused_lookups"
    REMOVE_UNUSED_PHOTOS = "remove_unused_photos"
    RESET_VEHICLES = "reset_vehicles"
    RESET_SETS = "reset_sets"
    RESET_EVERYTHING = "reset_everything"


# The ones that need RESET typed and take a safety snapshot first.
RESET_ACTIONS = {DangerZoneAction.RESET_VEHICLES, DangerZoneAction.RESET_SETS, DangerZoneAction.RESET_EVERYTHING}
RESET_CONFIRMATION = "RESET"
# A photo uploaded on the add form isn't referenced until the vehicle or set is saved, so only
# files older than this count as unused.
UNUSED_PHOTO_MIN_AGE_SECONDS = 60 * 60


@dataclass
class DangerZoneResult:
    # How many of each kind were removed (or cleared), e.g. {"vehicles": 12}.
    removed: dict[str, int] = field(default_factory=dict)
    # File name of the pre-reset safety snapshot (resets only).
    safety_snapshot_path: str | None = None


def run(db: Session, action: DangerZoneAction, confirmation: str | None = None) -> DangerZoneResult:
    if action in RESET_ACTIONS and confirmation != RESET_CONFIRMATION:
        raise ConflictError(f"Type {RESET_CONFIRMATION} to confirm")
    result = DangerZoneResult()
    if action in RESET_ACTIONS:
        result.safety_snapshot_path = backup_service.write_safety_snapshot(db, label=f"reset-{action.value}").name

    if action is DangerZoneAction.CLEAR_NOTES:
        result.removed["vehicles"] = _count(db, update(Car).where(Car.notes.is_not(None)).values(notes=None))
        result.removed["sets"] = _count(db, update(CarSet).where(CarSet.notes.is_not(None)).values(notes=None))
    elif action is DangerZoneAction.CLEAR_TAGS:
        _clear_tags(db, result)
    elif action is DangerZoneAction.CLEAR_PURCHASE_PRICES:
        result.removed["vehicles"] = _count(
            db, update(Car).where(Car.purchase_price.is_not(None)).values(purchase_price=None)
        )
        result.removed["sets"] = _count(
            db, update(CarSet).where(CarSet.purchase_price.is_not(None)).values(purchase_price=None)
        )
    elif action is DangerZoneAction.REMOVE_UNUSED_LOOKUPS:
        _remove_unused_lookups(db, result)
    elif action is DangerZoneAction.REMOVE_UNUSED_PHOTOS:
        result.removed["photos"] = _remove_unused_photos(db)
    elif action is DangerZoneAction.RESET_VEHICLES:
        _reset_vehicles(db, result)
    elif action is DangerZoneAction.RESET_SETS:
        _reset_sets(db, result)
    else:
        _reset_sets(db, result)
        _reset_vehicles(db, result)
        _clear_tags(db, result)
        _remove_unused_lookups(db, result)
    db.commit()
    return result


def _count(db: Session, statement) -> int:
    """Runs a bulk delete/update and returns how many rows it changed."""
    return db.execute(statement).rowcount or 0


def _clear_tags(db: Session, result: DangerZoneResult) -> None:
    """Every tag, and every vehicle and set it was on."""
    db.execute(delete(CarTag))
    db.execute(delete(SetTag))
    result.removed["tags"] = _count(db, delete(Tag))


def _reset_vehicles(db: Session, result: DangerZoneResult) -> None:
    """Every vehicle with its photos (the rows; files stay), tags and set links."""
    db.execute(delete(SetVehicle))
    db.execute(delete(CarTag))
    db.execute(delete(CarPhoto))
    result.removed["vehicles"] = _count(db, delete(Car))


def _reset_sets(db: Session, result: DangerZoneResult) -> None:
    """Every set with its photos (the rows; files stay), tags and vehicle links."""
    db.execute(delete(SetVehicle))
    db.execute(delete(SetTag))
    db.execute(delete(SetPhoto))
    result.removed["sets"] = _count(db, delete(CarSet))


def _remove_unused_lookups(db: Session, result: DangerZoneResult) -> None:
    """Manufacturers, series, vehicle types and colors no vehicle or set uses. Series go
    first, so a manufacturer only an unused series pointed at goes too."""
    result.removed["series"] = _count(
        db,
        delete(Series).where(
            ~exists().where(Car.series_id == Series.id), ~exists().where(CarSet.series_id == Series.id)
        ),
    )
    result.removed["manufacturers"] = _count(
        db,
        delete(Manufacturer).where(
            ~exists().where(Car.manufacturer_id == Manufacturer.id),
            ~exists().where(CarSet.manufacturer_id == Manufacturer.id),
            ~exists().where(Series.manufacturer_id == Manufacturer.id),
        ),
    )
    result.removed["vehicleTypes"] = _count(
        db, delete(VehicleType).where(~exists().where(Car.vehicle_type_id == VehicleType.id))
    )
    result.removed["colors"] = _count(db, delete(Color).where(~exists().where(Car.color_id == Color.id)))


def _remove_unused_photos(db: Session) -> int:
    """Uploaded photo files no vehicle or set uses (left by deletes, resets and restores),
    except ones uploaded in the last hour, which may belong to an add form not yet saved."""
    folder = upload_service.CAR_IMAGES_DIR
    if not folder.is_dir():
        return 0
    used = {
        url.removeprefix(upload_service.CAR_IMAGES_URL_PREFIX)
        for model in (CarPhoto, SetPhoto)
        for url in db.scalars(select(model.url))
        if url and url.startswith(upload_service.CAR_IMAGES_URL_PREFIX)
    }
    cutoff = time.time() - UNUSED_PHOTO_MIN_AGE_SECONDS
    removed = 0
    for path in folder.iterdir():
        if path.is_file() and path.name not in used and path.stat().st_mtime < cutoff:
            path.unlink(missing_ok=True)
            removed += 1
    return removed
