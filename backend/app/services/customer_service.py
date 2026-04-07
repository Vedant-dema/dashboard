"""Customer service layer for REST endpoint behavior."""

from __future__ import annotations

from typing import Any

from app.repositories.customer_repository import (
    CustomerNotFoundError,
    CustomerRepository,
    CustomerValidationError,
)
from app.schemas.customer import (
    CustomerCreateRequest,
    CustomerDetailResponse,
    CustomerListResponse,
    CustomerMutationResponse,
    CustomerPayload,
    CustomerRolePayload,
    CustomerSummary,
    CustomerWashProfileResponse,
    WashProfilePayload,
)


class CustomerService:
    def __init__(self) -> None:
        self._repo = CustomerRepository()

    def list_customers(self, *, include_deleted: bool, x_demo_key: str | None) -> CustomerListResponse:
        self._repo.assert_access(x_demo_key)
        rows, updated_at = self._repo.list_customers(include_deleted=include_deleted)
        items = [
            CustomerSummary(
                id=int(row.get("id")),
                kunden_nr=str(row.get("kunden_nr") or ""),
                firmenname=str(row.get("firmenname") or ""),
                branche=(row.get("branche") if isinstance(row.get("branche"), str) else None),
                strasse=(row.get("strasse") if isinstance(row.get("strasse"), str) else None),
                plz=(row.get("plz") if isinstance(row.get("plz"), str) else None),
                ort=(row.get("ort") if isinstance(row.get("ort"), str) else None),
                land_code=(row.get("land_code") if isinstance(row.get("land_code"), str) else None),
                deleted=bool(row.get("deleted")),
                updated_at=(row.get("updated_at") if isinstance(row.get("updated_at"), str) else None),
            )
            for row in rows
            if isinstance(row.get("id"), int)
        ]
        return CustomerListResponse(items=items, total=len(items), updated_at=updated_at)

    def get_customer(self, customer_id: int, *, x_demo_key: str | None) -> CustomerDetailResponse:
        self._repo.assert_access(x_demo_key)
        detail, _ = self._repo.get_customer_detail(customer_id)
        return self._to_detail_response(detail)

    def create_customer(self, body: CustomerCreateRequest, *, x_demo_key: str | None) -> CustomerMutationResponse:
        self._repo.assert_access(x_demo_key)
        detail, updated_at = self._repo.create_customer(
            customer_payload=body.customer,
            wash_profile_payload=body.wash_profile,
            roles_payload=body.roles,
        )
        return CustomerMutationResponse(item=self._to_detail_response(detail), updated_at=updated_at)

    def patch_customer(
        self,
        customer_id: int,
        body: dict[str, Any],
        *,
        x_demo_key: str | None,
    ) -> CustomerMutationResponse:
        self._repo.assert_access(x_demo_key)
        detail, updated_at = self._repo.patch_customer(
            customer_id=customer_id,
            customer_patch=body.get("customer", {}),
            wash_profile_patch=body.get("wash_profile"),
            roles_patch=body.get("roles"),
        )
        return CustomerMutationResponse(item=self._to_detail_response(detail), updated_at=updated_at)

    def get_wash_profile(self, customer_id: int, *, x_demo_key: str | None) -> CustomerWashProfileResponse:
        self._repo.assert_access(x_demo_key)
        wash, updated_at = self._repo.get_wash_profile(customer_id)
        return CustomerWashProfileResponse(
            customer_id=customer_id,
            wash_profile=WashProfilePayload.model_validate(wash) if isinstance(wash, dict) else None,
            updated_at=updated_at,
        )

    @staticmethod
    def _to_detail_response(detail: dict[str, Any]) -> CustomerDetailResponse:
        customer = detail.get("customer") if isinstance(detail.get("customer"), dict) else {}
        wash = detail.get("wash_profile") if isinstance(detail.get("wash_profile"), dict) else None
        roles = detail.get("roles") if isinstance(detail.get("roles"), list) else []
        return CustomerDetailResponse(
            customer=CustomerPayload.model_validate(customer),
            wash_profile=WashProfilePayload.model_validate(wash) if isinstance(wash, dict) else None,
            roles=[CustomerRolePayload.model_validate(role) for role in roles if isinstance(role, dict)],
        )


__all__ = [
    "CustomerService",
    "CustomerNotFoundError",
    "CustomerValidationError",
]

