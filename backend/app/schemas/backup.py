from app.schemas.base import CamelModel

# v2 added the full per-car photo gallery (`photos`); v1 files carry only `photo`.
# v3 added the wiki catalog link (`catalogSource`/`catalogTitle`); older files restore without one.
# v4 added `sets`; older files restore with none.
BACKUP_FORMAT_VERSION = 4


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


class BackupPhoto(CamelModel):
    url: str
    is_primary: bool
    sort_order: int


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
    catalog_source: str | None = None
    catalog_title: str | None = None
    # Primary photo URL, kept so v1 readers still see a photo. Image files aren't bundled in
    # the backup, they live in uploads/.
    photo: str | None
    # Full gallery. Missing from v1 backups, in which case restore falls back to `photo`.
    photos: list[BackupPhoto] = []
    tag_ids: list[int]


class BackupSet(CamelModel):
    id: int
    name: str
    manufacturer_id: int
    set_type: str
    toy_number: str | None
    year: int | None
    status: str
    sealed: bool
    quantity: int
    purchase_price: float | None
    notes: str | None
    photo: str | None
    contents: list[str] = []
    catalog_source: str | None = None
    catalog_title: str | None = None


class BackupPayload(CamelModel):
    version: int
    exported_at: str
    manufacturers: list[BackupManufacturer]
    series: list[BackupSeries]
    vehicle_types: list[BackupVehicleType]
    colors: list[BackupColor]
    tags: list[BackupTag]
    cars: list[BackupCar]
    sets: list[BackupSet] = []


class BackupRestoreResult(CamelModel):
    restored_cars: int
    restored_sets: int = 0
    safety_snapshot_path: str
