"""History service for customer change log endpoints."""

from __future__ import annotations

from app.repositories.history_repository import HistoryRepository
from app.schemas.customer import CustomerHistoryEntryResponse, CustomerHistoryResponse


class HistoryService:
    def __init__(self) -> None:
        self._repo = HistoryRepository()

    def get_customer_history(self, customer_id: int, *, x_demo_key: str | None) -> CustomerHistoryResponse:
        self._repo.assert_access(x_demo_key)
        rows, updated_at = self._repo.list_for_customer(customer_id)
        items = [CustomerHistoryEntryResponse.model_validate(row) for row in rows]
        return CustomerHistoryResponse(items=items, total=len(items), updated_at=updated_at)

