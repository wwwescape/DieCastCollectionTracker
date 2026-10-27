"""add overview layout to users

Revision ID: e4b8d2f6a9c1
Revises: d2f6a8c4e1b7
Create Date: 2026-10-27 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e4b8d2f6a9c1'
down_revision: Union[str, None] = 'd2f6a8c4e1b7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'overview_layout',
                sa.JSON(),
                nullable=True,
                comment='Overview page sections in display order, each {key, hidden}; null = the default layout',
            )
        )


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('overview_layout')
