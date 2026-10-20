"""create sets table

Revision ID: f5a1c3d7b9e2
Revises: e3b9f4a2c6d8
Create Date: 2026-10-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f5a1c3d7b9e2'
down_revision: Union[str, None] = 'e3b9f4a2c6d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'sets',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('manufacturer_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column(
            'set_type',
            sa.Enum('playset', 'track_set', name='settype', native_enum=False, create_constraint=True),
            nullable=False,
        ),
        sa.Column('toy_number', sa.String(length=100), nullable=True),
        sa.Column('year', sa.Integer(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('owned', 'wishlist', name='carstatus', native_enum=False, create_constraint=True),
            nullable=False,
        ),
        sa.Column('sealed', sa.Boolean(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('purchase_price', sa.Float(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('photo', sa.String(length=1024), nullable=True),
        sa.Column('contents', sa.JSON(), nullable=False),
        sa.Column('catalog_source', sa.String(length=32), nullable=True),
        sa.Column('catalog_title', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['manufacturer_id'], ['manufacturers.id'], name=op.f('fk_sets_manufacturer_id_manufacturers')),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_sets')),
    )
    op.create_index(op.f('ix_sets_manufacturer_id'), 'sets', ['manufacturer_id'], unique=False)
    op.create_index(op.f('ix_sets_name'), 'sets', ['name'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_sets_name'), table_name='sets')
    op.drop_index(op.f('ix_sets_manufacturer_id'), table_name='sets')
    op.drop_table('sets')
