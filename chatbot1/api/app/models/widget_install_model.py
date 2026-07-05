from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.db import Base


class WidgetInstall(Base):
    __tablename__ = "widget_installs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
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

    external_user_id: Mapped[str | None] = mapped_column(String(150), nullable=True)
    embed_type: Mapped[str] = mapped_column(String(30), nullable=False, default="iframe")
    position: Mapped[str] = mapped_column(String(30), nullable=False, default="bottom-right")

    width: Mapped[int] = mapped_column(Integer, nullable=False, default=380)
    height: Mapped[int] = mapped_column(Integer, nullable=False, default=620)
    button_text_open: Mapped[str] = mapped_column(String(80), nullable=False, default="Chat")
    button_text_close: Mapped[str] = mapped_column(String(80), nullable=False, default="Close")
    z_index: Mapped[int] = mapped_column(Integer, nullable=False, default=999999)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )