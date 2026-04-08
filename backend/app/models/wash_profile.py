"""Customer wash profile ORM model."""

from __future__ import annotations

import datetime as dt
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.models.base import Base

JsonType = JSON().with_variant(JSONB, "postgresql")


class CustomerWashProfile(Base):
    __tablename__ = "customer_wash_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    bukto: Mapped[str | None] = mapped_column(String(128), nullable=True)
    limit_betrag: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    rechnung_zusatz: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rechnung_plz: Mapped[str | None] = mapped_column(String(64), nullable=True)
    rechnung_ort: Mapped[str | None] = mapped_column(String(255), nullable=True)
    rechnung_strasse: Mapped[str | None] = mapped_column(String(255), nullable=True)
    kunde_gesperrt: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    bankname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bic: Mapped[str | None] = mapped_column(String(64), nullable=True)
    iban: Mapped[str | None] = mapped_column(String(64), nullable=True)
    wichtige_infos: Mapped[str | None] = mapped_column(Text, nullable=True)
    bemerkungen: Mapped[str | None] = mapped_column(Text, nullable=True)
    lastschrift: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    kennzeichen: Mapped[str | None] = mapped_column(String(128), nullable=True)
    wasch_fahrzeug_typ: Mapped[str | None] = mapped_column(String(128), nullable=True)
    wasch_programm: Mapped[str | None] = mapped_column(String(255), nullable=True)
    netto_preis: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    brutto_preis: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    wasch_intervall: Mapped[str | None] = mapped_column(String(128), nullable=True)
    payload: Mapped[dict] = mapped_column(JsonType, nullable=False, default=dict)

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

    customer = relationship("Customer", back_populates="wash_profile")

