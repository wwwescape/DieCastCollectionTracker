"""track refresh token rotation

Revision ID: a7e2c4b9d1f3
Revises: c1d3e5f7a9b2
Create Date: 2026-10-23 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7e2c4b9d1f3'
down_revision: Union[str, None] = 'c1d3e5f7a9b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('refresh_tokens', schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                'replaced_by_jti',
                sa.String(length=36),
                nullable=True,
                comment='Set when the token was rotated; presenting it again afterwards means reuse',
            )
        )


def downgrade() -> None:
    with op.batch_alter_table('refresh_tokens', schema=None) as batch_op:
        batch_op.drop_column('replaced_by_jti')
