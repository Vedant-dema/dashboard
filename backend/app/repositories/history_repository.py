"""Customer history repository over transitional shared state."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.repositories.customer_repository import CustomerRepository


def _safe_int(value: Any, default: int = -1) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class HistoryRepository:
    def __init__(self) -> None:
        self._customer_repo = CustomerRepository()

    def assert_access(self, x_demo_key: str | None) -> None:
        self._customer_repo.assert_access(x_demo_key)

    def list_for_customer(self, customer_id: int) -> tuple[list[dict[str, Any]], str | None]:
        state, updated_at = self._customer_repo.load_state()
        entries = [
            deepcopy(entry)
            for entry in state.get("history", [])
            if isinstance(entry, dict) and _safe_int(entry.get("kunden_id", -1)) == customer_id
        ]
        entries.sort(key=lambda row: (str(row.get("timestamp") or ""), _safe_int(row.get("id") or 0, default=0)), reverse=True)
        return entries, updated_at
