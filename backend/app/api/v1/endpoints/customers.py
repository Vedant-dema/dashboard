"""Customer REST endpoints (Phase 4)."""

from __future__ import annotations

from fastapi import APIRouter, Header, HTTPException, status

from app.schemas.customer import (
    CustomerCreateRequest,
    CustomerDetailResponse,
    CustomerHistoryResponse,
    CustomerListResponse,
    CustomerMutationResponse,
    CustomerPatchRequest,
    CustomerWashProfileResponse,
)
from app.services.customer_service import (
    CustomerNotFoundError,
    CustomerService,
    CustomerValidationError,
)
from app.services.history_service import HistoryService

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])

customer_service = CustomerService()
history_service = HistoryService()


@router.get("", response_model=CustomerListResponse)
def list_customers(
    include_deleted: bool = False,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerListResponse:
    return customer_service.list_customers(include_deleted=include_deleted, x_demo_key=x_demo_key)


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
def get_customer(
    customer_id: int,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerDetailResponse:
    try:
        return customer_service.get_customer(customer_id, x_demo_key=x_demo_key)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("", response_model=CustomerMutationResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    body: CustomerCreateRequest,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerMutationResponse:
    try:
        return customer_service.create_customer(body, x_demo_key=x_demo_key)
    except CustomerValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/{customer_id}", response_model=CustomerMutationResponse)
def patch_customer(
    customer_id: int,
    body: CustomerPatchRequest,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerMutationResponse:
    try:
        return customer_service.patch_customer(customer_id, body.model_dump(), x_demo_key=x_demo_key)
    except CustomerNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{customer_id}/history", response_model=CustomerHistoryResponse)
def get_customer_history(
    customer_id: int,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerHistoryResponse:
    return history_service.get_customer_history(customer_id, x_demo_key=x_demo_key)


@router.get("/{customer_id}/wash-profile", response_model=CustomerWashProfileResponse)
def get_customer_wash_profile(
    customer_id: int,
    x_demo_key: str | None = Header(default=None, alias="x-demo-key"),
) -> CustomerWashProfileResponse:
    return customer_service.get_wash_profile(customer_id, x_demo_key=x_demo_key)

