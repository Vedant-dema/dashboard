from __future__ import annotations

from fastapi import APIRouter, Header

from app.schemas.customer import (
    CustomerCreate,
    CustomerHistoryResponse,
    CustomerListResponse,
    CustomerRecord,
    CustomerUpdate,
    CustomerWashProfileResponse,
)
from app.services.customer_service import customer_service

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


@router.get("", response_model=CustomerListResponse)
def list_customers(
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerListResponse:
    items, updated_at = customer_service.list_customers(x_demo_key=x_demo_key)
    return CustomerListResponse(items=items, updated_at=updated_at)


@router.get("/{customer_id}", response_model=CustomerRecord)
def get_customer(
    customer_id: int,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerRecord:
    return customer_service.get_customer(customer_id=customer_id, x_demo_key=x_demo_key)


@router.post("", response_model=CustomerRecord, status_code=201)
def create_customer(
    body: CustomerCreate,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
    x_editor_name: str | None = Header(default=None, alias="x-editor-name"),
    x_editor_email: str | None = Header(default=None, alias="x-editor-email"),
) -> CustomerRecord:
    return customer_service.create_customer(
        payload=body,
        x_demo_key=x_demo_key,
        editor_name=x_editor_name,
        editor_email=x_editor_email,
    )


@router.patch("/{customer_id}", response_model=CustomerRecord)
def patch_customer(
    customer_id: int,
    body: CustomerUpdate,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
    x_editor_name: str | None = Header(default=None, alias="x-editor-name"),
    x_editor_email: str | None = Header(default=None, alias="x-editor-email"),
) -> CustomerRecord:
    return customer_service.patch_customer(
        customer_id=customer_id,
        payload=body,
        x_demo_key=x_demo_key,
        editor_name=x_editor_name,
        editor_email=x_editor_email,
    )


@router.get("/{customer_id}/history", response_model=CustomerHistoryResponse)
def customer_history(
    customer_id: int,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerHistoryResponse:
    items, updated_at = customer_service.get_customer_history(customer_id=customer_id, x_demo_key=x_demo_key)
    return CustomerHistoryResponse(items=items, updated_at=updated_at)


@router.get("/{customer_id}/wash-profile", response_model=CustomerWashProfileResponse)
def customer_wash_profile(
    customer_id: int,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerWashProfileResponse:
    item, updated_at = customer_service.get_customer_wash_profile(customer_id=customer_id, x_demo_key=x_demo_key)
    return CustomerWashProfileResponse(item=item, updated_at=updated_at)

