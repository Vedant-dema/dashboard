from __future__ import annotations

import datetime as dt
from typing import Any

from fastapi import HTTPException

from app.legacy import legacy_main

REQUIRED_ARRAY_KEYS = ("kunden", "kundenWash", "rollen", "unterlagen")
REQUIRED_COUNTER_KEYS = {
    "nextKundeId": 1,
    "nextWashId": 1,
    "nextRolleId": 1,
    "nextUnterlageId": 1,
}
OPTIONAL_ARRAY_KEYS = ("termine", "beziehungen", "risikoanalysen", "history")
OPTIONAL_COUNTER_KEYS = {
    "nextTerminId": 1,
    "nextBeziehungId": 1,
    "nextRisikoanalyseId": 1,
    "nextHistoryId": 1,
}


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _default_state() -> dict[str, Any]:
    return {
        "version": 1,
        "kunden": [],
        "kundenWash": [],
        "rollen": [],
        "unterlagen": [],
        "termine": [],
        "beziehungen": [],
        "risikoanalysen": [],
        "history": [],
        "nextKundeId": 1,
        "nextWashId": 1,
        "nextRolleId": 1,
        "nextUnterlageId": 1,
        "nextTerminId": 1,
        "nextBeziehungId": 1,
        "nextRisikoanalyseId": 1,
        "nextHistoryId": 1,
    }


def _normalize_state(state: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(state, dict):
        return _default_state()
    out = dict(state)
    out["version"] = 1
    for key in REQUIRED_ARRAY_KEYS + OPTIONAL_ARRAY_KEYS:
        if not isinstance(out.get(key), list):
            out[key] = []
    for key, fallback in {**REQUIRED_COUNTER_KEYS, **OPTIONAL_COUNTER_KEYS}.items():
        value = out.get(key)
        if not isinstance(value, int) or value < 1:
            out[key] = fallback
    return out


class CustomerRepository:
    def load_state(self, x_demo_key: str | None) -> tuple[dict[str, Any], str | None]:
        legacy_main._assert_demo_api_key(x_demo_key)
        state, updated_at = legacy_main._demo_get_customers_state()
        return _normalize_state(state), updated_at

    def save_state(self, state: dict[str, Any]) -> tuple[dict[str, Any], str]:
        saved, updated_at = legacy_main._demo_save_customers_state(_normalize_state(state))
        return _normalize_state(saved), updated_at

    def list_customers(self, state: dict[str, Any]) -> list[dict[str, Any]]:
        return [row for row in state["kunden"] if not bool(row.get("deleted"))]

    def get_customer(self, state: dict[str, Any], customer_id: int) -> dict[str, Any]:
        for row in state["kunden"]:
            if int(row.get("id", 0)) == customer_id:
                return row
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    def get_customer_history(self, state: dict[str, Any], customer_id: int) -> list[dict[str, Any]]:
        history = state.get("history")
        if not isinstance(history, list):
            return []
        return [row for row in history if int(row.get("kunden_id", 0)) == customer_id]

    def get_customer_wash_profile(self, state: dict[str, Any], customer_id: int) -> dict[str, Any] | None:
        for row in state["kundenWash"]:
            if int(row.get("kunden_id", 0)) == customer_id:
                return row
        return None

    def next_customer_id(self, state: dict[str, Any]) -> int:
        value = state.get("nextKundeId")
        if isinstance(value, int) and value >= 1:
            return value
        return max((int(row.get("id", 0)) for row in state["kunden"]), default=0) + 1

    def next_customer_number(self, state: dict[str, Any]) -> str:
        max_num = 10000
        for row in state["kunden"]:
            raw = str(row.get("kunden_nr", "")).strip()
            if raw.isdigit():
                max_num = max(max_num, int(raw))
        return str(max_num + 1)

    def mark_updated(self, row: dict[str, Any]) -> None:
        row["updated_at"] = _now_iso()

