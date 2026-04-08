"""Customer history repository over transitional or SQL persistence."""

from __future__ import annotations

from copy import deepcopy
from typing import Any

from app.core.database import get_persistence_mode, get_session
from app.repositories.customer_repository import CustomerRepository

try:
    from sqlalchemy import select

    from app.models import Customer, CustomerHistory

    SQLALCHEMY_AVAILABLE = True
except ModuleNotFoundError:
    select = None  # type: ignore[assignment]
    Customer = CustomerHistory = Any  # type: ignore[assignment]
    SQLALCHEMY_AVAILABLE = False


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
        if SQLALCHEMY_AVAILABLE and (get_persistence_mode() or "").strip().lower() in {"db", "database", "postgres", "postgresql", "sqlalchemy"}:
            return self._list_for_customer_db(customer_id)
        state, updated_at = self._customer_repo.load_state()
        entries = [
            deepcopy(entry)
            for entry in state.get("history", [])
            if isinstance(entry, dict) and _safe_int(entry.get("kunden_id", -1)) == customer_id
        ]
        entries.sort(key=lambda row: (str(row.get("timestamp") or ""), _safe_int(row.get("id") or 0, default=0)), reverse=True)
        return entries, updated_at

    def _list_for_customer_db(self, customer_id: int) -> tuple[list[dict[str, Any]], str | None]:
        with get_session() as session:
            rows = list(
                session.scalars(
                    select(CustomerHistory)
                    .where(CustomerHistory.customer_id == customer_id)
                    .order_by(CustomerHistory.timestamp.desc(), CustomerHistory.id.desc())
                ).all()
            )
            entries = [
                {
                    "id": row.id,
                    "kunden_id": row.customer_id,
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                    "action": row.action,
                    "editor_name": row.editor_name,
                    "editor_email": row.editor_email,
                    "entity_type": row.entity_type,
                    "entity_id": row.entity_id,
                    "changed_by": row.changed_by,
                    "changed_at": row.changed_at.isoformat() if row.changed_at else None,
                    "source": row.source,
                    "changes": row.changes if isinstance(row.changes, list) else [],
                }
                for row in rows
            ]
            updated_row = session.get(Customer, customer_id)
            updated_at = updated_row.updated_at.isoformat() if updated_row and updated_row.updated_at else None
            return entries, updated_at
