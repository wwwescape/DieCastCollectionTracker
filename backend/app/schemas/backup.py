from app.schemas.base import CamelModel

BACKUP_FORMAT_VERSION = 1


class BackupManufacturer(CamelModel):
    id: int
    name: str


class BackupSeries(CamelModel):
    id: int
    name: str
    manufacturer_id: int | None


class BackupVehicleType(CamelModel):
    id: int
    name: str


class BackupColor(CamelModel):
    id: int
    name: str


class BackupTag(CamelModel):
    id: int
    name: str
    color: str | None


class BackupCar(CamelModel):
    id: int
    name: str
    manufacturer_id: int
    series_id: int | None
    vehicle_type_id: int | None
    color_id: int | None
    cast_number: str | None
    collection_number: str | None
    year: int | None
    status: str
    condition: str | None
    quantity: int
    purchase_price: float | None
    notes: str | None
    # Primary photo URL — photos aren't bundled in the backup, they live in uploads/
    photo: str | None
    tag_ids: list[int]


class BackupPayload(CamelModel):
    version: int
    exported_at: str
    manufacturers: list[BackupManufacturer]
    series: list[BackupSeries]
    vehicle_types: list[BackupVehicleType]
    colors: list[BackupColor]
    tags: list[BackupTag]
    cars: list[BackupCar]


class BackupRestoreResult(CamelModel):
    restored_cars: int
    safety_snapshot_path: str
