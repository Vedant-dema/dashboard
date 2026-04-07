"""VAT-related schemas for modular endpoints."""

from __future__ import annotations

from pydantic import BaseModel


class VatStatusInfoResponse(BaseModel):
    enabled: bool
    rest_api_base: str

