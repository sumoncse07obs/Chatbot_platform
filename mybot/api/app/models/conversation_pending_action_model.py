from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.db import Base


class ConversationPendingAction(Base):
    __tablename__ = "conversation_pending_actions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("chat_conversations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    api_key_id: Mapped[int] = mapped_column(
        ForeignKey("api_keys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        index=True,
    )
    action_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="entity_clarification",
    )

    original_user_text: Mapped[str] = mapped_column(Text, nullable=False)
    uncertain_term: Mapped[str] = mapped_column(String(500), nullable=False)
    candidate_term: Mapped[str] = mapped_column(String(500), nullable=False)
    candidate_type: Mapped[str] = mapped_column(String(80), nullable=False, default="term")

    evidence: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        index=True,
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)