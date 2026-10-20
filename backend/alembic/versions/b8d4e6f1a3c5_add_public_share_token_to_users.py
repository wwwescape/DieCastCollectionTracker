"""add public share token to users

Revision ID: b8d4e6f1a3c5
Revises: f5a1c3d7b9e2
Create Date: 2026-10-20 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b8d4e6f1a3c5'
down_revision: Union[str, None] = 'f5a1c3d7b9e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite can't ALTER a table to add a constraint directly, so batch mode rebuilds it.
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('public_share_token', sa.String(length=64), nullable=True, comment='Unlisted share-link token for the public Cars/Sets view'))
        batch_op.create_unique_constraint(batch_op.f('uq_users_public_share_token'), ['public_share_token'])


def downgrade() -> None:
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('uq_users_public_share_token'), type_='unique')
        batch_op.drop_column('public_share_token')
