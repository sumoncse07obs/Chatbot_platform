"""add handoff fields to chat conversations

Revision ID: h1i2j3k4l5m6
Revises: g7h8i9j0k1l2
Create Date: 2026-07-05
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h1i2j3k4l5m6"
down_revision: Union[str, Sequence[str], None] = "g7h8i9j0k1l2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "chat_conversations",
        sa.Column("needs_human", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "chat_conversations",
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_chat_conversations_needs_human",
        "chat_conversations",
        ["needs_human"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_chat_conversations_needs_human", table_name="chat_conversations")
    op.drop_column("chat_conversations", "resolved_at")
    op.drop_column("chat_conversations", "needs_human")