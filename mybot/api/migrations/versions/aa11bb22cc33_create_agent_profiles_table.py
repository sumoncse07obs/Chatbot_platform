"""create agent profiles table

Revision ID: aa11bb22cc33
Revises: 9e22558431b8
Create Date: 2026-08-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "aa11bb22cc33"
down_revision: Union[str, Sequence[str], None] = "9e22558431b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "agent_profiles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("api_key_id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("business_summary", sa.Text(), nullable=True),
        sa.Column("supported_topics", sa.JSON(), nullable=False),
        sa.Column("services", sa.JSON(), nullable=False),
        sa.Column("suggested_questions", sa.JSON(), nullable=False),
        sa.Column("missing_information", sa.JSON(), nullable=False),
        sa.Column("handoff_message", sa.Text(), nullable=True),
        sa.Column("resource_fingerprint", sa.String(length=64), nullable=True),
        sa.Column(
            "is_ready",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column("last_generated_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(
            ["api_key_id"],
            ["api_keys.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("api_key_id"),
    )

    op.create_index(
        "ix_agent_profiles_api_key_id",
        "agent_profiles",
        ["api_key_id"],
        unique=False,
    )

    op.create_index(
        "ix_agent_profiles_created_by_id",
        "agent_profiles",
        ["created_by_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_agent_profiles_created_by_id", table_name="agent_profiles")
    op.drop_index("ix_agent_profiles_api_key_id", table_name="agent_profiles")
    op.drop_table("agent_profiles")