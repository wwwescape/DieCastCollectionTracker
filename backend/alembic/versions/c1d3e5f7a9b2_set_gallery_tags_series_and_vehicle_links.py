"""set gallery, tags, series, condition and vehicle links

Revision ID: c1d3e5f7a9b2
Revises: b8d4e6f1a3c5
Create Date: 2026-10-20 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1d3e5f7a9b2'
down_revision: Union[str, None] = 'b8d4e6f1a3c5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONDITIONS = ('mint_in_box', 'near_mint', 'good', 'fair', 'poor')


def upgrade() -> None:
    # Photo gallery — replaces the single `sets.photo` column, like car_photos did for cars.
    op.create_table(
        'set_photos',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('set_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=1024), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default=sa.text('0')),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['set_id'], ['sets.id'], name=op.f('fk_set_photos_set_id_sets')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_set_photos')),
    )
    op.create_index(op.f('ix_set_photos_set_id'), 'set_photos', ['set_id'], unique=False)
    op.execute(
        "INSERT INTO set_photos (set_id, url, is_primary, sort_order, created_at, updated_at) "
        "SELECT id, photo, 1, 0, created_at, updated_at FROM sets WHERE photo IS NOT NULL"
    )

    op.create_table(
        'set_tags',
        sa.Column('set_id', sa.Integer(), nullable=False),
        sa.Column('tag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['set_id'], ['sets.id'], name=op.f('fk_set_tags_set_id_sets')),
        sa.ForeignKeyConstraint(['tag_id'], ['tags.id'], name=op.f('fk_set_tags_tag_id_tags')),
        sa.PrimaryKeyConstraint('set_id', 'tag_id', name=op.f('pk_set_tags')),
    )

    op.create_table(
        'set_vehicles',
        sa.Column('set_id', sa.Integer(), nullable=False),
        sa.Column('car_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['set_id'], ['sets.id'], name=op.f('fk_set_vehicles_set_id_sets')),
        sa.ForeignKeyConstraint(['car_id'], ['cars.id'], name=op.f('fk_set_vehicles_car_id_cars')),
        sa.PrimaryKeyConstraint('set_id', 'car_id', name=op.f('pk_set_vehicles')),
    )
    op.create_index(op.f('ix_set_vehicles_car_id'), 'set_vehicles', ['car_id'], unique=False)

    # SQLite can't add a foreign key or CHECK constraint in place; batch mode rebuilds the table.
    with op.batch_alter_table('sets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('series_id', sa.Integer(), nullable=True))
        # The CHECK is added explicitly (not via the Enum) so it gets one, conventionally named
        # constraint that the downgrade can drop again.
        batch_op.add_column(
            sa.Column('condition', sa.Enum(*CONDITIONS, name='carcondition', native_enum=False), nullable=True)
        )
        batch_op.create_check_constraint(
            op.f('ck_sets_carcondition'), "condition IN ('" + "', '".join(CONDITIONS) + "')"
        )
        batch_op.create_foreign_key(batch_op.f('fk_sets_series_id_series'), 'series', ['series_id'], ['id'])
        batch_op.create_index(batch_op.f('ix_sets_series_id'), ['series_id'], unique=False)
        batch_op.drop_column('photo')


def downgrade() -> None:
    with op.batch_alter_table('sets', schema=None) as batch_op:
        batch_op.add_column(sa.Column('photo', sa.String(length=1024), nullable=True))
    op.execute(
        "UPDATE sets SET photo = ("
        "  SELECT url FROM set_photos WHERE set_photos.set_id = sets.id AND set_photos.is_primary = 1 LIMIT 1"
        ")"
    )
    with op.batch_alter_table('sets', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_sets_series_id'))
        batch_op.drop_constraint(batch_op.f('fk_sets_series_id_series'), type_='foreignkey')
        batch_op.drop_constraint(op.f('ck_sets_carcondition'), type_='check')
        batch_op.drop_column('condition')
        batch_op.drop_column('series_id')

    op.drop_index(op.f('ix_set_vehicles_car_id'), table_name='set_vehicles')
    op.drop_table('set_vehicles')
    op.drop_table('set_tags')
    op.drop_index(op.f('ix_set_photos_set_id'), table_name='set_photos')
    op.drop_table('set_photos')
