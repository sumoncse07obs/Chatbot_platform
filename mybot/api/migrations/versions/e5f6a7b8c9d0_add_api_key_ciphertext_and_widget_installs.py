"""add api key ciphertext and widget installs

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-02
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("api_keys", sa.Column("key_ciphertext", sa.Text(), nullable=True))

    op.create_table(
        "widget_installs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("api_key_id", sa.Integer(), nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("external_user_id", sa.String(length=150), nullable=True),
        sa.Column("embed_type", sa.String(length=30), nullable=False, server_default="iframe"),
        sa.Column("position", sa.String(length=30), nullable=False, server_default="bottom-right"),
        sa.Column("width", sa.Integer(), nullable=False, server_default="380"),
        sa.Column("height", sa.Integer(), nullable=False, server_default="620"),
        sa.Column("button_text_open", sa.String(length=80), nullable=False, server_default="Chat"),
        sa.Column("button_text_close", sa.String(length=80), nullable=False, server_default="Close"),
        sa.Column("z_index", sa.Integer(), nullable=False, server_default="999999"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["api_key_id"], ["api_keys.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="CASCADE"),
    )

    op.create_index("ix_widget_installs_api_key_id", "widget_installs", ["api_key_id"])
    op.create_index("ix_widget_installs_created_by_id", "widget_installs", ["created_by_id"])


def downgrade() -> None:
    op.drop_index("ix_widget_installs_created_by_id", table_name="widget_installs")
    op.drop_index("ix_widget_installs_api_key_id", table_name="widget_installs")
    op.drop_table("widget_installs")
    op.drop_column("api_keys", "key_ciphertext")