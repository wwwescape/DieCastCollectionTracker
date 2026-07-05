"""add condition and car photos

Revision ID: c7f2a8d1e5b3
Revises: a406c09729b9
Create Date: 2026-07-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c7f2a8d1e5b3'
down_revision: Union[str, None] = 'a406c09729b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Condition grading — nullable so existing cars aren't affected
    op.add_column('cars', sa.Column('condition', sa.String(50), nullable=True))

    # Car photos table — replaces the single `cars.photo` column
    op.create_table(
        'car_photos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('car_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=1024), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name=op.f('fk_car_photos_car_id_cars')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_car_photos')),
    )
    op.create_index(op.f('ix_car_photos_car_id'), 'car_photos', ['car_id'], unique=False)

    # Migrate existing single photos — mark them as primary
    op.execute(
        "INSERT INTO car_photos (car_id, url, is_primary, sort_order, created_at, updated_at) "
        "SELECT id, photo, 1, 0, created_at, updated_at "
        "FROM cars WHERE photo IS NOT NULL"
    )

    # Drop the old single-photo column (requires SQLite >= 3.35.0 / Python 3.12 bundles 3.43+)
    op.drop_column('cars', 'photo')


def downgrade() -> None:
    op.add_column('cars', sa.Column('photo', sa.String(1024), nullable=True))
    op.execute(
        "UPDATE cars SET photo = ("
        "  SELECT url FROM car_photos"
        "  WHERE car_photos.car_id = cars.id AND car_photos.is_primary = 1"
        "  LIMIT 1"
        ")"
    )
    op.drop_index(op.f('ix_car_photos_car_id'), table_name='car_photos')
    op.drop_table('car_photos')
    op.drop_column('cars', 'condition')
