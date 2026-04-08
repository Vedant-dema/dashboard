"""Customer address ORM model."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base

JsonType = JSON().with_variant(JSONB, "postgresql")


class CustomerAddress(Base):
    __tablename__ = "customer_addresses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    typ: Mapped[str] = mapped_column(String(64), nullable=False, default="Hauptadresse", server_default="Hauptadresse")
    strasse: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plz: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ort: Mapped[str | None] = mapped_column(String(255), nullable=True)
    land_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    art_land_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    ust_id_nr: Mapped[str | None] = mapped_column(String(64), nullable=True)
    steuer_nr: Mapped[str | None] = mapped_column(String(64), nullable=True)
    branchen_nr: Mapped[str | None] = mapped_column(String(64), nullable=True)
    raw_payload: Mapped[dict] = mapped_column(JsonType, nullable=False, default=dict)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=dt.datetime.now(dt.timezone.utc),
        server_default=func.now(),
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=dt.datetime.now(dt.timezone.utc),
        onupdate=dt.datetime.now(dt.timezone.utc),
        server_default=func.now(),
    )

    customer = relationship("Customer", back_populates="addresses")

