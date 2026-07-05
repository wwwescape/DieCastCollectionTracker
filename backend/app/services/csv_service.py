import csv
import io

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.car import Car, CarTag
from app.models.lookups import Tag

CSV_COLUMNS = [
    "name", "manufacturer", "series", "vehicle_type", "color",
    "cast_number", "collection_number", "year", "status", "quantity",
    "purchase_price", "notes", "tags",
]


def export_csv(db: Session) -> str:
    cars = list(
        db.scalars(
            select(Car)
            .options(
                joinedload(Car.manufacturer),
                joinedload(Car.series),
                joinedload(Car.vehicle_type),
                joinedload(Car.color),
            )
            .order_by(Car.manufacturer_id, Car.name)
        ).unique()
    )

    # Fetch all car→tag associations in one query to avoid N+1
    car_tag_rows = db.execute(
        select(CarTag.car_id, Tag.name)
        .join(Tag, Tag.id == CarTag.tag_id)
        .order_by(CarTag.car_id, Tag.name)
    ).all()
    tags_by_car: dict[int, list[str]] = {}
    for car_id, tag_name in car_tag_rows:
        tags_by_car.setdefault(car_id, []).append(tag_name)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_COLUMNS)
    for car in cars:
        writer.writerow([
            car.name,
            car.manufacturer.name,
            car.series.name if car.series else "",
            car.vehicle_type.name if car.vehicle_type else "",
            car.color.name if car.color else "",
            car.cast_number or "",
            car.collection_number or "",
            car.year if car.year is not None else "",
            car.status.value,
            car.quantity,
            car.purchase_price if car.purchase_price is not None else "",
            car.notes or "",
            "; ".join(tags_by_car.get(car.id, [])),
        ])
    return output.getvalue()
