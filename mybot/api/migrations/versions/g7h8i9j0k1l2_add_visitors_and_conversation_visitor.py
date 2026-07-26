"""add visitors and conversation visitor

Revision ID: g7h8i9j0k1l2
Revises: f6a7b8c9d0e1
Create Date: 2026-06-05 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g7h8i9j0k1l2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "visitors",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("api_key_id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("external_user_id", sa.String(length=150), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=80), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["api_key_id"], ["api_keys.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("api_key_id", "external_user_id", name="uq_visitors_api_key_external_user"),
    )
    op.create_index(op.f("ix_visitors_api_key_id"), "visitors", ["api_key_id"], unique=False)
    op.create_index(op.f("ix_visitors_created_by_id"), "visitors", ["created_by_id"], unique=False)
    op.create_index(op.f("ix_visitors_email"), "visitors", ["email"], unique=False)
    op.create_index(op.f("ix_visitors_external_user_id"), "visitors", ["external_user_id"], unique=False)

    op.add_column("chat_conversations", sa.Column("visitor_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_chat_conversations_visitor_id_visitors",
        "chat_conversations",
        "visitors",
        ["visitor_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(op.f("ix_chat_conversations_visitor_id"), "chat_conversations", ["visitor_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_conversations_visitor_id"), table_name="chat_conversations")
    op.drop_constraint("fk_chat_conversations_visitor_id_visitors", "chat_conversations", type_="foreignkey")
    op.drop_column("chat_conversations", "visitor_id")

    op.drop_index(op.f("ix_visitors_external_user_id"), table_name="visitors")
    op.drop_index(op.f("ix_visitors_email"), table_name="visitors")
    op.drop_index(op.f("ix_visitors_created_by_id"), table_name="visitors")
    op.drop_index(op.f("ix_visitors_api_key_id"), table_name="visitors")
    op.drop_table("visitors")