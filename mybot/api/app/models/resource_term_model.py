from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database.db import Base


class ResourceTerm(Base):
    __tablename__ = "resource_terms"
    __table_args__ = (
        UniqueConstraint(
            "created_by_id",
            "resource_chunk_id",
            "normalized_term",
            name="uq_resource_terms_owner_chunk_term",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    resource_id: Mapped[int] = mapped_column(
        ForeignKey("resources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    resource_chunk_id: Mapped[int] = mapped_column(
        ForeignKey("resource_chunks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    term: Mapped[str] = mapped_column(String(500), nullable=False)
    normalized_term: Mapped[str] = mapped_column(String(500), nullable=False, index=True)

    term_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="named_term",
        index=True,
    )

    source_text: Mapped[str] = mapped_column(Text, nullable=False)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )