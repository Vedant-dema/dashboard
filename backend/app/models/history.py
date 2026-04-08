"""Customer history/audit ORM model."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base

JsonType = JSON().with_variant(JSONB, "postgresql")


class CustomerHistory(Base):
    __tablename__ = "customer_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    timestamp: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=dt.datetime.now(dt.timezone.utc),
        index=True,
    )
    action: Mapped[str] = mapped_column(String(32), nullable=False, default="updated", server_default="updated")
    editor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    editor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    entity_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    changed_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    changed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    changes: Mapped[list | dict] = mapped_column(JsonType, nullable=False, default=list)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=dt.datetime.now(dt.timezone.utc),
        server_default=func.now(),
    )

    customer = relationship("Customer", back_populates="history_entries")

