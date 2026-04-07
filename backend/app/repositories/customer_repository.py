"""Transitional customer repository over demo/blob-compatible shared state."""

from __future__ import annotations

import datetime as dt
import importlib
import json
from copy import deepcopy
from typing import Any


class CustomerNotFoundError(Exception):
    pass


class CustomerValidationError(Exception):
    pass


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _date_from_iso(iso_ts: str) -> str:
    return iso_ts[:10]


def _to_history_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    return str(value)


def _safe_int(value: Any, default: int = -1) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


class CustomerRepository:
    """Repository for customer state stored in demo_store.customers_db."""

    @staticmethod
    def _legacy_main() -> Any:
        return importlib.import_module("main")

    def assert_access(self, x_demo_key: str | None) -> None:
        self._legacy_main()._assert_demo_api_key(x_demo_key)

    def _empty_state(self) -> dict[str, Any]:
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

    def _normalize_state(self, state: dict[str, Any] | None) -> dict[str, Any]:
        if not isinstance(state, dict):
            return self._empty_state()

        out = self._empty_state()
        out.update(state)
        for key in ("kunden", "kundenWash", "rollen", "unterlagen", "termine", "beziehungen", "risikoanalysen", "history"):
            if not isinstance(out.get(key), list):
                out[key] = []
        for key in (
            "nextKundeId",
            "nextWashId",
            "nextRolleId",
            "nextUnterlageId",
            "nextTerminId",
            "nextBeziehungId",
            "nextRisikoanalyseId",
            "nextHistoryId",
        ):
            value = out.get(key)
            if not isinstance(value, int) or value < 1:
                out[key] = 1
        out["version"] = 1
        return out

    def load_state(self) -> tuple[dict[str, Any], str | None]:
        state, updated_at = self._legacy_main()._demo_get_customers_state()
        return self._normalize_state(state), updated_at

    def save_state(self, state: dict[str, Any]) -> tuple[dict[str, Any], str]:
        normalized = self._normalize_state(state)
        return self._legacy_main()._demo_save_customers_state(normalized)

    @staticmethod
    def _next_numeric_id(items: list[dict[str, Any]], preferred_start: int) -> int:
        existing = {int(item.get("id")) for item in items if isinstance(item.get("id"), int)}
        next_id = max(1, preferred_start)
        while next_id in existing:
            next_id += 1
        return next_id

    @staticmethod
    def _customer_id_matches(raw_customer: dict[str, Any], customer_id: int) -> bool:
        try:
            return int(raw_customer.get("id")) == customer_id
        except (TypeError, ValueError):
            return False

    def list_customers(self, include_deleted: bool = False) -> tuple[list[dict[str, Any]], str | None]:
        state, updated_at = self.load_state()
        items = [deepcopy(k) for k in state["kunden"] if isinstance(k, dict)]
        if not include_deleted:
            items = [k for k in items if not bool(k.get("deleted"))]
        return items, updated_at

    def get_customer_detail(self, customer_id: int) -> tuple[dict[str, Any], str | None]:
        state, updated_at = self.load_state()
        customer = next((k for k in state["kunden"] if isinstance(k, dict) and self._customer_id_matches(k, customer_id)), None)
        if customer is None:
            raise CustomerNotFoundError(f"Customer {customer_id} not found")

        wash_profile = next(
            (
                w
                for w in state["kundenWash"]
                if isinstance(w, dict) and _safe_int(w.get("kunden_id", -1)) == customer_id
            ),
            None,
        )
        roles = [
            deepcopy(role)
            for role in state["rollen"]
            if isinstance(role, dict) and _safe_int(role.get("kunden_id", -1)) == customer_id
        ]
        return {
            "customer": deepcopy(customer),
            "wash_profile": deepcopy(wash_profile) if isinstance(wash_profile, dict) else None,
            "roles": roles,
        }, updated_at

    def get_wash_profile(self, customer_id: int) -> tuple[dict[str, Any] | None, str | None]:
        state, updated_at = self.load_state()
        wash = next(
            (
                w
                for w in state["kundenWash"]
                if isinstance(w, dict) and _safe_int(w.get("kunden_id", -1)) == customer_id
            ),
            None,
        )
        return (deepcopy(wash) if isinstance(wash, dict) else None), updated_at

    def create_customer(
        self,
        customer_payload: dict[str, Any],
        wash_profile_payload: dict[str, Any] | None,
        roles_payload: list[dict[str, Any]] | None,
    ) -> tuple[dict[str, Any], str]:
        state, _ = self.load_state()
        now = _now_iso()

        customer = dict(customer_payload)
        firmenname = str(customer.get("firmenname") or "").strip()
        if not firmenname:
            raise CustomerValidationError("Field 'firmenname' is required")

        next_kunde = self._next_numeric_id(state["kunden"], int(state.get("nextKundeId", 1)))
        customer_id = int(customer.get("id")) if isinstance(customer.get("id"), int) else next_kunde
        if any(self._customer_id_matches(item, customer_id) for item in state["kunden"] if isinstance(item, dict)):
            customer_id = next_kunde
        customer["id"] = customer_id

        kunden_nr = str(customer.get("kunden_nr") or "").strip()
        customer["kunden_nr"] = kunden_nr or f"{customer_id:05d}"
        customer["firmenname"] = firmenname
        customer.setdefault("deleted", False)
        customer.setdefault("aufnahme", _date_from_iso(now))
        customer.setdefault("created_at", now)
        customer["updated_at"] = now

        state["kunden"].append(customer)
        state["nextKundeId"] = max(int(state.get("nextKundeId", 1)), customer_id + 1)

        if wash_profile_payload is not None:
            wash = dict(wash_profile_payload)
            wash_next = self._next_numeric_id(state["kundenWash"], int(state.get("nextWashId", 1)))
            wash_id = int(wash.get("id")) if isinstance(wash.get("id"), int) else wash_next
            if any(isinstance(item, dict) and _safe_int(item.get("id", -1)) == wash_id for item in state["kundenWash"]):
                wash_id = wash_next
            wash["id"] = wash_id
            wash["kunden_id"] = customer_id
            wash.setdefault("created_at", now)
            wash["updated_at"] = now
            state["kundenWash"].append(wash)
            state["nextWashId"] = max(int(state.get("nextWashId", 1)), wash_id + 1)

        if roles_payload:
            next_role_id = int(state.get("nextRolleId", 1))
            existing_role_ids = {int(item.get("id")) for item in state["rollen"] if isinstance(item, dict) and isinstance(item.get("id"), int)}
            for role in roles_payload:
                role_row = dict(role)
                while next_role_id in existing_role_ids:
                    next_role_id += 1
                role_row["id"] = next_role_id
                role_row["kunden_id"] = customer_id
                existing_role_ids.add(next_role_id)
                state["rollen"].append(role_row)
                next_role_id += 1
            state["nextRolleId"] = max(int(state.get("nextRolleId", 1)), next_role_id)

        self._append_history_entry(
            state,
            customer_id=customer_id,
            action="created",
            editor_name=str(customer.get("last_edited_by_name") or customer.get("created_by_name") or "").strip() or None,
            editor_email=str(customer.get("last_edited_by_email") or customer.get("created_by_email") or "").strip() or None,
            changes=[],
            timestamp=now,
        )

        _, updated_at = self.save_state(state)
        detail, _ = self.get_customer_detail(customer_id)
        return detail, updated_at

    def patch_customer(
        self,
        customer_id: int,
        customer_patch: dict[str, Any],
        wash_profile_patch: dict[str, Any] | None,
        roles_patch: list[dict[str, Any]] | None,
    ) -> tuple[dict[str, Any], str]:
        state, _ = self.load_state()
        customer_index = next(
            (
                idx
                for idx, item in enumerate(state["kunden"])
                if isinstance(item, dict) and self._customer_id_matches(item, customer_id)
            ),
            None,
        )
        if customer_index is None:
            raise CustomerNotFoundError(f"Customer {customer_id} not found")

        now = _now_iso()
        customer = dict(state["kunden"][customer_index])
        before_customer = deepcopy(customer)

        for key, value in customer_patch.items():
            if key == "id":
                continue
            customer[key] = value
        customer["updated_at"] = now
        state["kunden"][customer_index] = customer

        changes: list[dict[str, Any]] = []
        tracked_keys = set(customer_patch.keys()) | {"updated_at"}
        for key in tracked_keys:
            if key == "id":
                continue
            before_value = before_customer.get(key)
            after_value = customer.get(key)
            if before_value != after_value:
                changes.append(
                    {
                        "field": key,
                        "labelKey": key,
                        "from": _to_history_value(before_value),
                        "to": _to_history_value(after_value),
                    }
                )

        if wash_profile_patch is not None:
            wash_index = next(
                (
                    idx
                    for idx, item in enumerate(state["kundenWash"])
                    if isinstance(item, dict) and _safe_int(item.get("kunden_id", -1)) == customer_id
                ),
                None,
            )
            if wash_index is None:
                wash_next = self._next_numeric_id(state["kundenWash"], int(state.get("nextWashId", 1)))
                wash = {"id": wash_next, "kunden_id": customer_id, "created_at": now, "updated_at": now}
                for key, value in wash_profile_patch.items():
                    if key in {"id", "kunden_id"}:
                        continue
                    wash[key] = value
                state["kundenWash"].append(wash)
                state["nextWashId"] = max(int(state.get("nextWashId", 1)), wash_next + 1)
                for key, value in wash_profile_patch.items():
                    if key in {"id", "kunden_id"}:
                        continue
                    changes.append(
                        {
                            "field": f"wash.{key}",
                            "labelKey": f"wash.{key}",
                            "from": "",
                            "to": _to_history_value(value),
                        }
                    )
            else:
                wash = dict(state["kundenWash"][wash_index])
                before_wash = deepcopy(wash)
                for key, value in wash_profile_patch.items():
                    if key in {"id", "kunden_id"}:
                        continue
                    wash[key] = value
                wash["updated_at"] = now
                state["kundenWash"][wash_index] = wash
                for key, value in wash_profile_patch.items():
                    if key in {"id", "kunden_id"}:
                        continue
                    before_value = before_wash.get(key)
                    after_value = wash.get(key)
                    if before_value != after_value:
                        changes.append(
                            {
                                "field": f"wash.{key}",
                                "labelKey": f"wash.{key}",
                                "from": _to_history_value(before_value),
                                "to": _to_history_value(after_value),
                            }
                        )

        if roles_patch is not None:
            existing_roles = [
                role
                for role in state["rollen"]
                if isinstance(role, dict) and _safe_int(role.get("kunden_id", -1)) == customer_id
            ]
            state["rollen"] = [
                role
                for role in state["rollen"]
                if not (isinstance(role, dict) and _safe_int(role.get("kunden_id", -1)) == customer_id)
            ]
            next_role_id = int(state.get("nextRolleId", 1))
            existing_ids = {int(role.get("id")) for role in state["rollen"] if isinstance(role, dict) and isinstance(role.get("id"), int)}
            for role in roles_patch:
                role_row = dict(role)
                while next_role_id in existing_ids:
                    next_role_id += 1
                role_row["id"] = next_role_id
                role_row["kunden_id"] = customer_id
                existing_ids.add(next_role_id)
                state["rollen"].append(role_row)
                next_role_id += 1
            state["nextRolleId"] = max(int(state.get("nextRolleId", 1)), next_role_id)
            changes.append(
                {
                    "field": "roles",
                    "labelKey": "roles",
                    "from": _to_history_value(len(existing_roles)),
                    "to": _to_history_value(len(roles_patch)),
                }
            )

        if changes:
            self._append_history_entry(
                state,
                customer_id=customer_id,
                action="updated",
                editor_name=str(customer.get("last_edited_by_name") or "").strip() or None,
                editor_email=str(customer.get("last_edited_by_email") or "").strip() or None,
                changes=changes,
                timestamp=now,
            )

        _, updated_at = self.save_state(state)
        detail, _ = self.get_customer_detail(customer_id)
        return detail, updated_at

    def _append_history_entry(
        self,
        state: dict[str, Any],
        *,
        customer_id: int,
        action: str,
        editor_name: str | None,
        editor_email: str | None,
        changes: list[dict[str, Any]],
        timestamp: str,
    ) -> None:
        history = state.setdefault("history", [])
        next_history_id = int(state.get("nextHistoryId", 1))
        existing_ids = {_safe_int(item.get("id")) for item in history if isinstance(item, dict)}
        while next_history_id in existing_ids:
            next_history_id += 1
        history.append(
            {
                "id": next_history_id,
                "kunden_id": customer_id,
                "timestamp": timestamp,
                "action": action,
                "editor_name": editor_name,
                "editor_email": editor_email,
                "changes": changes,
            }
        )
        state["nextHistoryId"] = max(int(state.get("nextHistoryId", 1)), next_history_id + 1)
