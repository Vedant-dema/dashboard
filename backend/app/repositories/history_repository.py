from __future__ import annotations

from typing import Any


class HistoryRepository:
    def next_history_id(self, state: dict[str, Any]) -> int:
        value = state.get("nextHistoryId")
        if isinstance(value, int) and value >= 1:
            return value
        history = state.get("history")
        if isinstance(history, list):
            return len(history) + 1
        return 1

    def append(self, state: dict[str, Any], entry: dict[str, Any]) -> None:
        history = state.get("history")
        if not isinstance(history, list):
            history = []
        history.append(entry)
        state["history"] = history
        state["nextHistoryId"] = int(entry.get("id") or self.next_history_id(state)) + 1

