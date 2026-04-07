"""Customer DTOs for Phase 4 REST endpoints."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CustomerPayload(BaseModel):
    """Flexible customer payload (transitional store-compatible)."""

    model_config = ConfigDict(extra="allow")

    id: int | None = None
    kunden_nr: str | None = None
    firmenname: str | None = None
    deleted: bool | None = False
    created_at: str | None = None
    updated_at: str | None = None


class WashProfilePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int | None = None
    kunden_id: int | None = None


class CustomerRolePayload(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int | None = None
    kunden_id: int | None = None
    rolle: str | None = None


class CustomerSummary(BaseModel):
    id: int
    kunden_nr: str
    firmenname: str
    branche: str | None = None
    strasse: str | None = None
    plz: str | None = None
    ort: str | None = None
    land_code: str | None = None
    deleted: bool = False
    updated_at: str | None = None


class CustomerDetailResponse(BaseModel):
    customer: CustomerPayload
    wash_profile: WashProfilePayload | None = None
    roles: list[CustomerRolePayload] = Field(default_factory=list)


class CustomerListResponse(BaseModel):
    items: list[CustomerSummary]
    total: int
    updated_at: str | None = None


class CustomerCreateRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    customer: dict[str, Any]
    wash_profile: dict[str, Any] | None = None
    roles: list[dict[str, Any]] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_shape(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        if "customer" in value and isinstance(value.get("customer"), dict):
            return value

        payload = dict(value)
        wash_profile = payload.pop("wash_profile", None)
        roles = payload.pop("roles", [])
        return {"customer": payload, "wash_profile": wash_profile, "roles": roles}


class CustomerPatchRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    customer: dict[str, Any] = Field(default_factory=dict)
    wash_profile: dict[str, Any] | None = None
    roles: list[dict[str, Any]] | None = None

    @model_validator(mode="before")
    @classmethod
    def normalize_shape(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        if "customer" in value and isinstance(value.get("customer"), dict):
            return value

        payload = dict(value)
        wash_profile = payload.pop("wash_profile", None)
        roles = payload.pop("roles", None)
        return {"customer": payload, "wash_profile": wash_profile, "roles": roles}


class CustomerMutationResponse(BaseModel):
    item: CustomerDetailResponse
    updated_at: str | None = None


class CustomerHistoryEntryResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: int | None = None
    kunden_id: int
    timestamp: str
    action: str
    editor_name: str | None = None
    editor_email: str | None = None
    changes: list[dict[str, Any]] = Field(default_factory=list)


class CustomerHistoryResponse(BaseModel):
    items: list[CustomerHistoryEntryResponse]
    total: int
    updated_at: str | None = None


class CustomerWashProfileResponse(BaseModel):
    customer_id: int
    wash_profile: WashProfilePayload | None = None
    updated_at: str | None = None

