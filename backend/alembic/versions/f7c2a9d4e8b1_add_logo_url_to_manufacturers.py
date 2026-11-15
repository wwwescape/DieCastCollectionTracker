"""add logo url to manufacturers

Revision ID: f7c2a9d4e8b1
Revises: e4b8d2f6a9c1
Create Date: 2026-11-15 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f7c2a9d4e8b1'
down_revision: Union[str, None] = 'e4b8d2f6a9c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('manufacturers', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'logo_url',
                sa.String(length=255),
                nullable=True,
                comment='Uploaded logo (/uploads/logos/...); null = the bundled logo or the name',
            )
        )


def downgrade() -> None:
    with op.batch_alter_table('manufacturers', schema=None) as batch_op:
        batch_op.drop_column('logo_url')
