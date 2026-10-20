"""add catalog link to cars

Revision ID: e3b9f4a2c6d8
Revises: c7f2a8d1e5b3
Create Date: 2026-10-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e3b9f4a2c6d8'
down_revision: Union[str, None] = 'c7f2a8d1e5b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Wiki casting page a car was matched to — nullable, so existing (manual) cars are unaffected
    op.add_column('cars', sa.Column('catalog_source', sa.String(length=32), nullable=True))
    op.add_column('cars', sa.Column('catalog_title', sa.String(length=255), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('cars') as batch_op:
        batch_op.drop_column('catalog_title')
        batch_op.drop_column('catalog_source')
