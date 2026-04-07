from __future__ import annotations

import datetime as dt
from typing import Any

from app.repositories.history_repository import HistoryRepository


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


class HistoryService:
    def __init__(self, repository: HistoryRepository) -> None:
        self._repository = repository

    def append_event(
        self,
        state: dict[str, Any],
        *,
        customer_id: int,
        action: str,
        editor_name: str | None = None,
        editor_email: str | None = None,
        changes: list[dict[str, Any]] | None = None,
    ) -> None:
        entry = {
            "id": self._repository.next_history_id(state),
            "kunden_id": customer_id,
            "timestamp": _now_iso(),
            "action": action,
            "editor_name": editor_name,
            "editor_email": editor_email,
            "changes": changes or None,
        }
        self._repository.append(state, entry)


history_service = HistoryService(HistoryRepository())

