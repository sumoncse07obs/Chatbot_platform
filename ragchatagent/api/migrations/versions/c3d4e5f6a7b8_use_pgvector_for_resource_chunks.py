"""use pgvector for resource chunks

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-01
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.drop_column("resource_chunks", "embedding")
    op.add_column(
        "resource_chunks",
        sa.Column("embedding", Vector(1536), nullable=True),
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_resource_chunks_embedding
        ON resource_chunks
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_resource_chunks_embedding")
    op.drop_column("resource_chunks", "embedding")
    op.add_column(
        "resource_chunks",
        sa.Column("embedding", postgresql.JSONB(), nullable=True),
    )