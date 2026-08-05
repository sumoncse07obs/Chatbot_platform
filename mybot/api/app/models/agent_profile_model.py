from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.db import Base


class AgentProfile(Base):
    """
    Automatically generated agent understanding for one chatbot API key.

    This is not a manually written prompt. It is generated from the customer's
    active, indexed resources and used by the agent for natural guidance.
    """

    __tablename__ = "agent_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    api_key_id: Mapped[int] = mapped_column(
        ForeignKey("api_keys.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    business_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    supported_topics: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    services: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    suggested_questions: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    missing_information: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )

    handoff_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    resource_fingerprint: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )

    is_ready: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    last_generated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )