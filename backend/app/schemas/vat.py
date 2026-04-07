from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class VatCheckRequest(BaseModel):
    country_code: str = Field(..., min_length=2, max_length=2)
    vat_number: str = Field(..., min_length=1, max_length=32)
    requester_member_state_code: str | None = Field(default=None, max_length=4)
    requester_number: str | None = Field(default=None, max_length=32)
    trader_name: str | None = Field(default=None, max_length=500)
    trader_street: str | None = Field(default=None, max_length=500)
    trader_postal_code: str | None = Field(default=None, max_length=32)
    trader_city: str | None = Field(default=None, max_length=200)
    trader_company_type: str | None = Field(default=None, max_length=100)


class VatCheckResponse(BaseModel):
    valid: bool
    country_code: str
    vat_number: str
    name: str | None = None
    address: str | None = None
    name_original: str | None = None
    address_original: str | None = None
    name_normalized: str | None = None
    address_normalized: str | None = None
    name_search: str | None = None
    address_search: str | None = None
    normalization_version: str | None = None
    request_date: str | None = None
    request_identifier: str | None = None
    vies_error: str | None = None
    trader_details_available: bool = False
    vies_raw: dict[str, Any] | None = None
    trader_name_match: str | None = None
    trader_street_match: str | None = None
    trader_postal_code_match: str | None = None
    trader_city_match: str | None = None
    trader_company_type_match: str | None = None

