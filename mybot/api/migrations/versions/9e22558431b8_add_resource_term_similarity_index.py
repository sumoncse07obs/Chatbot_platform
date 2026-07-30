"""add resource term similarity index

Revision ID: 9e22558431b8
Revises: 99de8f7cab4c
Create Date: 2026-07-31 02:28:31.201498

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e22558431b8'
down_revision: Union[str, Sequence[str], None] = '99de8f7cab4c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_resource_terms_normalized_term_trgm
        ON resource_terms
        USING gin (normalized_term gin_trgm_ops)
        """
    )


def downgrade() -> None:
    op.execute(
        "DROP INDEX IF EXISTS ix_resource_terms_normalized_term_trgm"
    )