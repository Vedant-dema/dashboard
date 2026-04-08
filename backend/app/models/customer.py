"""Customer ORM model."""

from __future__ import annotations

import datetime as dt

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base

JsonType = JSON().with_variant(JSONB, "postgresql")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kunden_nr: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    firmenname: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    branche: Mapped[str | None] = mapped_column(String(255), nullable=True)
    strasse: Mapped[str | None] = mapped_column(String(255), nullable=True)
    plz: Mapped[str | None] = mapped_column(String(64), nullable=True)
    ort: Mapped[str | None] = mapped_column(String(255), nullable=True)
    land_code: Mapped[str | None] = mapped_column(String(16), nullable=True)
    deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    aufnahme: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_edited_by_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    last_edited_by_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

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
    payload: Mapped[dict] = mapped_column(JsonType, nullable=False, default=dict)

    addresses = relationship(
        "CustomerAddress",
        back_populates="customer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    contacts = relationship(
        "CustomerContact",
        back_populates="customer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    wash_profile = relationship(
        "CustomerWashProfile",
        back_populates="customer",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    history_entries = relationship(
        "CustomerHistory",
        back_populates="customer",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

