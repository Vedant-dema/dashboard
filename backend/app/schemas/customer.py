from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class CustomerRecord(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    kunden_nr: str
    firmenname: str


class CustomerCreate(BaseModel):
    model_config = ConfigDict(extra="allow")

    firmenname: str
    kunden_nr: str | None = None


class CustomerUpdate(BaseModel):
    model_config = ConfigDict(extra="allow")

    firmenname: str | None = None
    kunden_nr: str | None = None


class CustomerListResponse(BaseModel):
    items: list[CustomerRecord]
    updated_at: str | None = None


class CustomerHistoryEntry(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int | None = None
    kunden_id: int | None = None
    action: str | None = None
    timestamp: str | None = None
    changes: list[dict[str, Any]] | None = None


class CustomerHistoryResponse(BaseModel):
    items: list[CustomerHistoryEntry]
    updated_at: str | None = None


class CustomerWashProfile(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int
    kunden_id: int


class CustomerWashProfileResponse(BaseModel):
    item: CustomerWashProfile | None = None
    updated_at: str | None = None

