"""add visitor contact request timestamps

Revision ID: bb22cc33dd44
Revises: aa11bb22cc33
Create Date: 2026-08-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "bb22cc33dd44"
down_revision: Union[str, Sequence[str], None] = "aa11bb22cc33"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "visitors",
        sa.Column("email_requested_at", sa.DateTime(), nullable=True),
    )
    op.add_column(
        "visitors",
        sa.Column("phone_requested_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("visitors", "phone_requested_at")
    op.drop_column("visitors", "email_requested_at")