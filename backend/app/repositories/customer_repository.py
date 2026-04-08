"""Transitional customer repository over demo/blob-compatible shared state."""

from __future__ import annotations

import datetime as dt
import importlib
import json
from copy import deepcopy
from decimal import Decimal, InvalidOperation
from typing import Any

from app.core.config import get_settings
from app.core.database import get_persistence_mode, get_session

try:
    from sqlalchemy import delete, select, text

    from app.models import Customer, CustomerAddress, CustomerContact, CustomerHistory, CustomerWashProfile

    SQLALCHEMY_AVAILABLE = True
except ModuleNotFoundError:
    delete = select = text = None  # type: ignore[assignment]
    Customer = CustomerAddress = CustomerContact = CustomerHistory = CustomerWashProfile = Any  # type: ignore[assignment]
    SQLALCHEMY_AVAILABLE = False

DB_MODES = {"db", "database", "postgres", "postgresql", "sqlalchemy"}


class CustomerNotFoundError(Exception):
    pass


class CustomerValidationError(Exception):
    pass


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def _date_from_iso(iso_ts: str) -> str:
    return iso_ts[:10]


def _now_dt() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


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


def _safe_str(value: Any) -> str | None:
    if value is None:
        return None
    text_value = str(value).strip()
    return text_value or None


def _safe_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return False


def _safe_decimal(value: Any) -> Decimal | None:
    if value in (None, ""):
        return None
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def _dt_to_iso(value: dt.datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(dt.timezone.utc).isoformat()


def _iso_to_dt(value: str | None) -> dt.datetime:
    if not value:
        return _now_dt()
    text_value = value.strip()
    if not text_value:
        return _now_dt()
    try:
        parsed = dt.datetime.fromisoformat(text_value.replace("Z", "+00:00"))
    except ValueError:
        return _now_dt()
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def _ensure_dict_list(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [dict(item) for item in value if isinstance(item, dict)]


class CustomerRepository:
    """Repository for customer state (transitional blob mode + SQL DB mode)."""

    @staticmethod
    def _legacy_main() -> Any:
        return importlib.import_module("main")

    def assert_access(self, x_demo_key: str | None) -> None:
        self._legacy_main()._assert_demo_api_key(x_demo_key)

    @staticmethod
    def _is_db_mode() -> bool:
        mode = (get_persistence_mode() or "").strip().lower()
        return mode in DB_MODES and SQLALCHEMY_AVAILABLE

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

    @staticmethod
    def _build_change(
        *,
        field: str,
        before_value: Any,
        after_value: Any,
        customer_id: int,
        changed_by: str | None,
        changed_at: str,
        source: str,
    ) -> dict[str, Any]:
        before_text = _to_history_value(before_value)
        after_text = _to_history_value(after_value)
        return {
            "field": field,
            "labelKey": field,
            "from": before_text,
            "to": after_text,
            "entityType": "customer",
            "entityId": customer_id,
            "oldValue": before_text,
            "newValue": after_text,
            "changedBy": changed_by,
            "changedAt": changed_at,
            "source": source,
        }

    def list_customers(self, include_deleted: bool = False) -> tuple[list[dict[str, Any]], str | None]:
        if self._is_db_mode():
            return self._list_customers_db(include_deleted=include_deleted)
        state, updated_at = self.load_state()
        items = [deepcopy(k) for k in state["kunden"] if isinstance(k, dict)]
        if not include_deleted:
            items = [k for k in items if not bool(k.get("deleted"))]
        return items, updated_at

    def get_customer_detail(self, customer_id: int) -> tuple[dict[str, Any], str | None]:
        if self._is_db_mode():
            return self._get_customer_detail_db(customer_id)
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
        if self._is_db_mode():
            return self._get_wash_profile_db(customer_id)
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
        if self._is_db_mode():
            return self._create_customer_db(
                customer_payload=customer_payload,
                wash_profile_payload=wash_profile_payload,
                roles_payload=roles_payload,
            )
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
            source="api.v1.customers.create",
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
        if self._is_db_mode():
            return self._patch_customer_db(
                customer_id=customer_id,
                customer_patch=customer_patch,
                wash_profile_patch=wash_profile_patch,
                roles_patch=roles_patch,
            )
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
        source = "api.v1.customers.patch"

        for key, value in customer_patch.items():
            if key == "id":
                continue
            customer[key] = value
        customer["updated_at"] = now
        state["kunden"][customer_index] = customer

        changes: list[dict[str, Any]] = []
        changed_by = str(customer.get("last_edited_by_name") or customer.get("last_edited_by_email") or "").strip() or None
        tracked_keys = set(customer_patch.keys()) | {"updated_at"}
        for key in tracked_keys:
            if key == "id":
                continue
            before_value = before_customer.get(key)
            after_value = customer.get(key)
            if before_value != after_value:
                changes.append(
                    self._build_change(
                        field=f"customer.{key}",
                        before_value=before_value,
                        after_value=after_value,
                        customer_id=customer_id,
                        changed_by=changed_by,
                        changed_at=now,
                        source=source,
                    )
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
                        self._build_change(
                            field=f"wash.{key}",
                            before_value=None,
                            after_value=value,
                            customer_id=customer_id,
                            changed_by=changed_by,
                            changed_at=now,
                            source=source,
                        )
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
                            self._build_change(
                                field=f"wash.{key}",
                                before_value=before_value,
                                after_value=after_value,
                                customer_id=customer_id,
                                changed_by=changed_by,
                                changed_at=now,
                                source=source,
                            )
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
                self._build_change(
                    field="roles.count",
                    before_value=len(existing_roles),
                    after_value=len(roles_patch),
                    customer_id=customer_id,
                    changed_by=changed_by,
                    changed_at=now,
                    source=source,
                )
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
                source=source,
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
        source: str,
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
                "entity_type": "customer",
                "entity_id": customer_id,
                "changed_by": editor_name or editor_email,
                "changed_at": timestamp,
                "source": source,
                "changes": changes,
            }
        )
        state["nextHistoryId"] = max(int(state.get("nextHistoryId", 1)), next_history_id + 1)

    def _list_customers_db(self, *, include_deleted: bool) -> tuple[list[dict[str, Any]], str | None]:
        with get_session() as session:
            query = select(Customer).order_by(Customer.id.asc())
            if not include_deleted:
                query = query.where(Customer.deleted.is_(False))
            rows = list(session.scalars(query).all())
            items = [self._customer_row_to_summary_dict(row) for row in rows]
            latest = max((row.updated_at for row in rows if row.updated_at is not None), default=None)
            return items, _dt_to_iso(latest)

    def _get_customer_detail_db(self, customer_id: int) -> tuple[dict[str, Any], str | None]:
        with get_session() as session:
            row = session.get(Customer, customer_id)
            if row is None:
                raise CustomerNotFoundError(f"Customer {customer_id} not found")
            return self._build_customer_detail_db(session, row), _dt_to_iso(row.updated_at)

    def _get_wash_profile_db(self, customer_id: int) -> tuple[dict[str, Any] | None, str | None]:
        with get_session() as session:
            row = session.get(Customer, customer_id)
            if row is None:
                raise CustomerNotFoundError(f"Customer {customer_id} not found")
            wash = session.scalar(select(CustomerWashProfile).where(CustomerWashProfile.customer_id == customer_id))
            return self._wash_row_to_payload(wash), _dt_to_iso(row.updated_at)

    def _customer_row_to_summary_dict(self, row: Customer) -> dict[str, Any]:
        payload = dict(row.payload or {})
        return {
            "id": row.id,
            "kunden_nr": row.kunden_nr,
            "firmenname": row.firmenname,
            "branche": payload.get("branche") if payload.get("branche") is not None else row.branche,
            "strasse": payload.get("strasse") if payload.get("strasse") is not None else row.strasse,
            "plz": payload.get("plz") if payload.get("plz") is not None else row.plz,
            "ort": payload.get("ort") if payload.get("ort") is not None else row.ort,
            "land_code": payload.get("land_code") if payload.get("land_code") is not None else row.land_code,
            "deleted": bool(row.deleted),
            "updated_at": _dt_to_iso(row.updated_at),
        }

    def _customer_row_to_payload(self, row: Customer) -> dict[str, Any]:
        payload = deepcopy(row.payload or {})
        payload["id"] = row.id
        payload["kunden_nr"] = row.kunden_nr
        payload["firmenname"] = row.firmenname
        payload["deleted"] = bool(row.deleted)
        payload["branche"] = payload.get("branche") if payload.get("branche") is not None else row.branche
        payload["strasse"] = payload.get("strasse") if payload.get("strasse") is not None else row.strasse
        payload["plz"] = payload.get("plz") if payload.get("plz") is not None else row.plz
        payload["ort"] = payload.get("ort") if payload.get("ort") is not None else row.ort
        payload["land_code"] = payload.get("land_code") if payload.get("land_code") is not None else row.land_code
        payload["aufnahme"] = payload.get("aufnahme") or row.aufnahme
        payload["created_at"] = payload.get("created_at") or _dt_to_iso(row.created_at)
        payload["updated_at"] = _dt_to_iso(row.updated_at)
        payload["created_by_name"] = payload.get("created_by_name") or row.created_by_name
        payload["created_by_email"] = payload.get("created_by_email") or row.created_by_email
        payload["last_edited_by_name"] = payload.get("last_edited_by_name") or row.last_edited_by_name
        payload["last_edited_by_email"] = payload.get("last_edited_by_email") or row.last_edited_by_email
        return payload

    def _wash_row_to_payload(self, row: CustomerWashProfile | None) -> dict[str, Any] | None:
        if row is None:
            return None
        payload = deepcopy(row.payload or {})
        payload["id"] = row.id
        payload["kunden_id"] = row.customer_id
        payload["bukto"] = payload.get("bukto") if payload.get("bukto") is not None else row.bukto
        payload["limit_betrag"] = float(row.limit_betrag) if row.limit_betrag is not None else payload.get("limit_betrag")
        payload["rechnung_zusatz"] = payload.get("rechnung_zusatz") if payload.get("rechnung_zusatz") is not None else row.rechnung_zusatz
        payload["rechnung_plz"] = payload.get("rechnung_plz") if payload.get("rechnung_plz") is not None else row.rechnung_plz
        payload["rechnung_ort"] = payload.get("rechnung_ort") if payload.get("rechnung_ort") is not None else row.rechnung_ort
        payload["rechnung_strasse"] = payload.get("rechnung_strasse") if payload.get("rechnung_strasse") is not None else row.rechnung_strasse
        payload["kunde_gesperrt"] = bool(payload.get("kunde_gesperrt") if payload.get("kunde_gesperrt") is not None else row.kunde_gesperrt)
        payload["bankname"] = payload.get("bankname") if payload.get("bankname") is not None else row.bankname
        payload["bic"] = payload.get("bic") if payload.get("bic") is not None else row.bic
        payload["iban"] = payload.get("iban") if payload.get("iban") is not None else row.iban
        payload["wichtige_infos"] = payload.get("wichtige_infos") if payload.get("wichtige_infos") is not None else row.wichtige_infos
        payload["bemerkungen"] = payload.get("bemerkungen") if payload.get("bemerkungen") is not None else row.bemerkungen
        payload["lastschrift"] = bool(payload.get("lastschrift") if payload.get("lastschrift") is not None else row.lastschrift)
        payload["kennzeichen"] = payload.get("kennzeichen") if payload.get("kennzeichen") is not None else row.kennzeichen
        payload["wasch_fahrzeug_typ"] = payload.get("wasch_fahrzeug_typ") if payload.get("wasch_fahrzeug_typ") is not None else row.wasch_fahrzeug_typ
        payload["wasch_programm"] = payload.get("wasch_programm") if payload.get("wasch_programm") is not None else row.wasch_programm
        payload["netto_preis"] = float(row.netto_preis) if row.netto_preis is not None else payload.get("netto_preis")
        payload["brutto_preis"] = float(row.brutto_preis) if row.brutto_preis is not None else payload.get("brutto_preis")
        payload["wasch_intervall"] = payload.get("wasch_intervall") if payload.get("wasch_intervall") is not None else row.wasch_intervall
        payload["created_at"] = payload.get("created_at") or _dt_to_iso(row.created_at)
        payload["updated_at"] = _dt_to_iso(row.updated_at)
        return payload

    def _build_customer_detail_db(self, session: Any, customer_row: Customer) -> dict[str, Any]:
        payload = self._customer_row_to_payload(customer_row)

        addresses = list(
            session.scalars(
                select(CustomerAddress).where(CustomerAddress.customer_id == customer_row.id).order_by(CustomerAddress.id.asc())
            ).all()
        )
        if addresses:
            payload["adressen"] = [dict(row.raw_payload or {}) for row in addresses]
            first = payload["adressen"][0] if payload["adressen"] else None
            if isinstance(first, dict):
                for key in ("strasse", "plz", "ort", "land_code", "art_land_code", "ust_id_nr", "steuer_nr", "branchen_nr"):
                    if key in first and first.get(key) is not None:
                        payload[key] = first.get(key)

        contacts = list(
            session.scalars(
                select(CustomerContact).where(CustomerContact.customer_id == customer_row.id).order_by(CustomerContact.id.asc())
            ).all()
        )
        if contacts:
            payload["kontakte"] = [dict(row.raw_payload or {}) for row in contacts]
            first_contact = payload["kontakte"][0] if payload["kontakte"] else None
            if isinstance(first_contact, dict):
                payload["ansprechpartner"] = first_contact.get("name", payload.get("ansprechpartner"))
                payload["rolle_kontakt"] = first_contact.get("rolle", payload.get("rolle_kontakt"))
                payload["telefonnummer"] = first_contact.get("telefon", payload.get("telefonnummer"))
                payload["email"] = first_contact.get("email", payload.get("email"))
                payload["bemerkungen_kontakt"] = first_contact.get("bemerkung", payload.get("bemerkungen_kontakt"))

        wash_row = session.scalar(
            select(CustomerWashProfile).where(CustomerWashProfile.customer_id == customer_row.id)
        )
        roles_payload = _ensure_dict_list(payload.get("roles"))
        return {
            "customer": payload,
            "wash_profile": self._wash_row_to_payload(wash_row),
            "roles": roles_payload,
        }

    def _sync_customer_columns_from_payload(self, row: Customer, payload: dict[str, Any]) -> None:
        firmenname = str(payload.get("firmenname") or "").strip()
        if not firmenname:
            raise CustomerValidationError("Field 'firmenname' is required")
        row.firmenname = firmenname
        row.kunden_nr = str(payload.get("kunden_nr") or row.kunden_nr or f"{row.id:05d}").strip()
        row.branche = _safe_str(payload.get("branche"))
        row.strasse = _safe_str(payload.get("strasse"))
        row.plz = _safe_str(payload.get("plz"))
        row.ort = _safe_str(payload.get("ort"))
        row.land_code = _safe_str(payload.get("land_code"))
        row.deleted = _safe_bool(payload.get("deleted"))
        row.aufnahme = _safe_str(payload.get("aufnahme")) or row.aufnahme or _date_from_iso(_now_iso())
        row.created_by_name = _safe_str(payload.get("created_by_name")) or row.created_by_name
        row.created_by_email = _safe_str(payload.get("created_by_email")) or row.created_by_email
        row.last_edited_by_name = _safe_str(payload.get("last_edited_by_name")) or row.last_edited_by_name
        row.last_edited_by_email = _safe_str(payload.get("last_edited_by_email")) or row.last_edited_by_email

    def _sync_addresses_from_payload(self, session: Any, customer_id: int, payload: dict[str, Any], now_dt: dt.datetime) -> None:
        address_payloads = _ensure_dict_list(payload.get("adressen"))
        if not address_payloads:
            address_payloads = [
                {
                    "typ": "Hauptadresse",
                    "strasse": payload.get("strasse"),
                    "plz": payload.get("plz"),
                    "ort": payload.get("ort"),
                    "land_code": payload.get("land_code"),
                    "art_land_code": payload.get("art_land_code"),
                    "ust_id_nr": payload.get("ust_id_nr"),
                    "steuer_nr": payload.get("steuer_nr"),
                    "branchen_nr": payload.get("branchen_nr"),
                }
            ]
        session.execute(delete(CustomerAddress).where(CustomerAddress.customer_id == customer_id))
        for raw in address_payloads:
            row_payload = dict(raw)
            session.add(
                CustomerAddress(
                    customer_id=customer_id,
                    typ=str(raw.get("typ") or "Hauptadresse"),
                    strasse=_safe_str(raw.get("strasse")),
                    plz=_safe_str(raw.get("plz")),
                    ort=_safe_str(raw.get("ort")),
                    land_code=_safe_str(raw.get("land_code")),
                    art_land_code=_safe_str(raw.get("art_land_code")),
                    ust_id_nr=_safe_str(raw.get("ust_id_nr")),
                    steuer_nr=_safe_str(raw.get("steuer_nr")),
                    branchen_nr=_safe_str(raw.get("branchen_nr")),
                    raw_payload=row_payload,
                    created_at=now_dt,
                    updated_at=now_dt,
                )
            )

    def _sync_contacts_from_payload(self, session: Any, customer_id: int, payload: dict[str, Any], now_dt: dt.datetime) -> None:
        contact_payloads = _ensure_dict_list(payload.get("kontakte"))
        if not contact_payloads:
            contact_payloads = [
                {
                    "kind": "PRIMARY",
                    "name": payload.get("ansprechpartner"),
                    "rolle": payload.get("rolle_kontakt"),
                    "telefon": payload.get("telefonnummer"),
                    "email": payload.get("email"),
                    "bemerkung": payload.get("bemerkungen_kontakt"),
                }
            ]
        session.execute(delete(CustomerContact).where(CustomerContact.customer_id == customer_id))
        for raw in contact_payloads:
            row_payload = dict(raw)
            session.add(
                CustomerContact(
                    customer_id=customer_id,
                    kind=str(raw.get("kind") or raw.get("typ") or "CONTACT"),
                    name=_safe_str(raw.get("name")),
                    role=_safe_str(raw.get("rolle") or raw.get("role")),
                    phone=_safe_str(raw.get("telefon") or raw.get("phone")),
                    email=_safe_str(raw.get("email")),
                    notes=_safe_str(raw.get("bemerkung") or raw.get("notes")),
                    raw_payload=row_payload,
                    created_at=now_dt,
                    updated_at=now_dt,
                )
            )

    def _upsert_wash_profile_db(self, session: Any, customer_id: int, wash_payload: dict[str, Any], now_dt: dt.datetime) -> None:
        row = session.scalar(select(CustomerWashProfile).where(CustomerWashProfile.customer_id == customer_id))
        payload = deepcopy(wash_payload)
        payload["kunden_id"] = customer_id
        payload["updated_at"] = _dt_to_iso(now_dt)
        if row is None:
            row = CustomerWashProfile(
                customer_id=customer_id,
                payload=payload,
                created_at=now_dt,
                updated_at=now_dt,
            )
            session.add(row)

        row.bukto = _safe_str(payload.get("bukto"))
        row.limit_betrag = _safe_decimal(payload.get("limit_betrag"))
        row.rechnung_zusatz = _safe_str(payload.get("rechnung_zusatz"))
        row.rechnung_plz = _safe_str(payload.get("rechnung_plz"))
        row.rechnung_ort = _safe_str(payload.get("rechnung_ort"))
        row.rechnung_strasse = _safe_str(payload.get("rechnung_strasse"))
        row.kunde_gesperrt = _safe_bool(payload.get("kunde_gesperrt"))
        row.bankname = _safe_str(payload.get("bankname"))
        row.bic = _safe_str(payload.get("bic"))
        row.iban = _safe_str(payload.get("iban"))
        row.wichtige_infos = _safe_str(payload.get("wichtige_infos"))
        row.bemerkungen = _safe_str(payload.get("bemerkungen"))
        row.lastschrift = _safe_bool(payload.get("lastschrift"))
        row.kennzeichen = _safe_str(payload.get("kennzeichen"))
        row.wasch_fahrzeug_typ = _safe_str(payload.get("wasch_fahrzeug_typ"))
        row.wasch_programm = _safe_str(payload.get("wasch_programm"))
        row.netto_preis = _safe_decimal(payload.get("netto_preis"))
        row.brutto_preis = _safe_decimal(payload.get("brutto_preis"))
        row.wasch_intervall = _safe_str(payload.get("wasch_intervall"))
        row.payload = payload
        row.updated_at = now_dt

    def _append_history_entry_db(
        self,
        session: Any,
        *,
        customer_id: int,
        action: str,
        editor_name: str | None,
        editor_email: str | None,
        changes: list[dict[str, Any]],
        timestamp: dt.datetime,
        source: str,
    ) -> None:
        session.add(
            CustomerHistory(
                customer_id=customer_id,
                timestamp=timestamp,
                action=action,
                editor_name=editor_name,
                editor_email=editor_email,
                entity_type="customer",
                entity_id=customer_id,
                changed_by=editor_name or editor_email,
                changed_at=timestamp,
                source=source,
                changes=changes,
            )
        )

    def _create_customer_db(
        self,
        *,
        customer_payload: dict[str, Any],
        wash_profile_payload: dict[str, Any] | None,
        roles_payload: list[dict[str, Any]] | None,
    ) -> tuple[dict[str, Any], str]:
        payload = deepcopy(customer_payload)
        firmenname = str(payload.get("firmenname") or "").strip()
        if not firmenname:
            raise CustomerValidationError("Field 'firmenname' is required")

        now_dt = _now_dt()
        now_iso = now_dt.isoformat()
        initial_kunden_nr = str(payload.get("kunden_nr") or "").strip() or f"TEMP-{now_dt.strftime('%Y%m%d%H%M%S%f')}"
        customer_row = Customer(
            kunden_nr=initial_kunden_nr,
            firmenname=firmenname,
            branche=_safe_str(payload.get("branche")),
            strasse=_safe_str(payload.get("strasse")),
            plz=_safe_str(payload.get("plz")),
            ort=_safe_str(payload.get("ort")),
            land_code=_safe_str(payload.get("land_code")),
            deleted=_safe_bool(payload.get("deleted")),
            aufnahme=_safe_str(payload.get("aufnahme")) or _date_from_iso(now_iso),
            created_by_name=_safe_str(payload.get("created_by_name")),
            created_by_email=_safe_str(payload.get("created_by_email")),
            last_edited_by_name=_safe_str(payload.get("last_edited_by_name")),
            last_edited_by_email=_safe_str(payload.get("last_edited_by_email")),
            payload=deepcopy(payload),
            created_at=_iso_to_dt(_safe_str(payload.get("created_at"))),
            updated_at=now_dt,
        )

        with get_session() as session:
            session.add(customer_row)
            session.flush()

            if not str(customer_payload.get("kunden_nr") or "").strip():
                customer_row.kunden_nr = f"{customer_row.id:05d}"
            payload["id"] = customer_row.id
            payload["kunden_nr"] = customer_row.kunden_nr
            payload["firmenname"] = firmenname
            payload["deleted"] = customer_row.deleted
            payload["aufnahme"] = payload.get("aufnahme") or customer_row.aufnahme or _date_from_iso(now_iso)
            payload["created_at"] = _dt_to_iso(customer_row.created_at) or now_iso
            payload["updated_at"] = now_iso
            if roles_payload is not None:
                payload["roles"] = [dict(item) for item in roles_payload if isinstance(item, dict)]

            customer_row.payload = deepcopy(payload)
            self._sync_customer_columns_from_payload(customer_row, payload)
            self._sync_addresses_from_payload(session, customer_row.id, payload, now_dt)
            self._sync_contacts_from_payload(session, customer_row.id, payload, now_dt)

            if isinstance(wash_profile_payload, dict):
                self._upsert_wash_profile_db(session, customer_row.id, wash_profile_payload, now_dt)

            self._append_history_entry_db(
                session,
                customer_id=customer_row.id,
                action="created",
                editor_name=customer_row.last_edited_by_name or customer_row.created_by_name,
                editor_email=customer_row.last_edited_by_email or customer_row.created_by_email,
                changes=[],
                timestamp=now_dt,
                source="api.v1.customers.create",
            )

            session.flush()
            detail = self._build_customer_detail_db(session, customer_row)
            updated_at = _dt_to_iso(customer_row.updated_at) or now_iso
            session.commit()
            return detail, updated_at

    def _patch_customer_db(
        self,
        *,
        customer_id: int,
        customer_patch: dict[str, Any],
        wash_profile_patch: dict[str, Any] | None,
        roles_patch: list[dict[str, Any]] | None,
    ) -> tuple[dict[str, Any], str]:
        now_dt = _now_dt()
        now_iso = now_dt.isoformat()
        source = "api.v1.customers.patch"

        with get_session() as session:
            customer_row = session.get(Customer, customer_id)
            if customer_row is None:
                raise CustomerNotFoundError(f"Customer {customer_id} not found")

            payload_before = self._customer_row_to_payload(customer_row)
            payload_after = deepcopy(payload_before)
            for key, value in customer_patch.items():
                if key == "id":
                    continue
                payload_after[key] = value
            payload_after["id"] = customer_id
            payload_after["updated_at"] = now_iso
            if roles_patch is not None:
                payload_after["roles"] = [dict(item) for item in roles_patch if isinstance(item, dict)]

            customer_row.payload = deepcopy(payload_after)
            customer_row.updated_at = now_dt
            self._sync_customer_columns_from_payload(customer_row, payload_after)

            changed_by = str(payload_after.get("last_edited_by_name") or payload_after.get("last_edited_by_email") or "").strip() or None
            changes: list[dict[str, Any]] = []
            tracked_customer_keys = set(customer_patch.keys()) | {"updated_at"}
            for key in tracked_customer_keys:
                if key == "id":
                    continue
                before_value = payload_before.get(key)
                after_value = payload_after.get(key)
                if before_value != after_value:
                    changes.append(
                        self._build_change(
                            field=f"customer.{key}",
                            before_value=before_value,
                            after_value=after_value,
                            customer_id=customer_id,
                            changed_by=changed_by,
                            changed_at=now_iso,
                            source=source,
                        )
                    )

            if wash_profile_patch is not None:
                wash_before = self._wash_row_to_payload(
                    session.scalar(select(CustomerWashProfile).where(CustomerWashProfile.customer_id == customer_id))
                ) or {}
                wash_after = deepcopy(wash_before)
                for key, value in wash_profile_patch.items():
                    if key in {"id", "kunden_id"}:
                        continue
                    wash_after[key] = value
                wash_after["kunden_id"] = customer_id
                wash_after["updated_at"] = now_iso
                self._upsert_wash_profile_db(session, customer_id, wash_after, now_dt)

                for key in wash_profile_patch.keys():
                    if key in {"id", "kunden_id"}:
                        continue
                    before_value = wash_before.get(key)
                    after_value = wash_after.get(key)
                    if before_value != after_value:
                        changes.append(
                            self._build_change(
                                field=f"wash.{key}",
                                before_value=before_value,
                                after_value=after_value,
                                customer_id=customer_id,
                                changed_by=changed_by,
                                changed_at=now_iso,
                                source=source,
                            )
                        )

            if roles_patch is not None:
                before_roles = payload_before.get("roles")
                before_count = len(before_roles) if isinstance(before_roles, list) else 0
                after_count = len(roles_patch)
                if before_count != after_count:
                    changes.append(
                        self._build_change(
                            field="roles.count",
                            before_value=before_count,
                            after_value=after_count,
                            customer_id=customer_id,
                            changed_by=changed_by,
                            changed_at=now_iso,
                            source=source,
                        )
                    )

            self._sync_addresses_from_payload(session, customer_id, payload_after, now_dt)
            self._sync_contacts_from_payload(session, customer_id, payload_after, now_dt)

            if changes:
                self._append_history_entry_db(
                    session,
                    customer_id=customer_id,
                    action="updated",
                    editor_name=_safe_str(payload_after.get("last_edited_by_name")),
                    editor_email=_safe_str(payload_after.get("last_edited_by_email")),
                    changes=changes,
                    timestamp=now_dt,
                    source=source,
                )

            session.flush()
            detail = self._build_customer_detail_db(session, customer_row)
            updated_at = _dt_to_iso(customer_row.updated_at) or now_iso
            session.commit()
            return detail, updated_at

    def import_transitional_state_to_db(self, *, replace_existing: bool = False) -> dict[str, int]:
        mode = (get_settings().customers_store_mode or "").strip().lower()
        if mode not in DB_MODES:
            raise CustomerValidationError("Set CUSTOMERS_STORE_MODE=db before importing into PostgreSQL.")
        if not SQLALCHEMY_AVAILABLE:
            raise CustomerValidationError("SQLAlchemy/Alembic dependencies are not installed.")

        state, _ = self.load_state()
        customers = [dict(row) for row in state.get("kunden", []) if isinstance(row, dict)]
        wash_rows = [dict(row) for row in state.get("kundenWash", []) if isinstance(row, dict)]
        history_rows = [dict(row) for row in state.get("history", []) if isinstance(row, dict)]

        imported_counts = {
            "customers_created": 0,
            "customers_updated": 0,
            "wash_profiles_upserted": 0,
            "history_imported": 0,
        }

        with get_session() as session:
            if replace_existing:
                session.execute(delete(CustomerHistory))
                session.execute(delete(CustomerWashProfile))
                session.execute(delete(CustomerContact))
                session.execute(delete(CustomerAddress))
                session.execute(delete(Customer))
                session.flush()

            seen_customer_ids: set[int] = set()
            cached_rows: dict[int, Customer] = {}
            now_dt = _now_dt()
            for index, raw in enumerate(customers, start=1):
                customer_id = _safe_int(raw.get("id"), default=0)
                if customer_id < 1:
                    continue
                seen_customer_ids.add(customer_id)

                existing = session.get(Customer, customer_id)
                if existing is None:
                    kunden_nr = str(raw.get("kunden_nr") or "").strip() or f"TEMP-{index:05d}"
                    existing = Customer(
                        id=customer_id,
                        kunden_nr=kunden_nr,
                        firmenname=str(raw.get("firmenname") or "").strip() or f"Customer {customer_id}",
                        payload={},
                        created_at=_iso_to_dt(_safe_str(raw.get("created_at"))),
                        updated_at=now_dt,
                    )
                    session.add(existing)
                    imported_counts["customers_created"] += 1
                else:
                    imported_counts["customers_updated"] += 1

                payload = deepcopy(raw)
                payload["id"] = customer_id
                if not str(payload.get("kunden_nr") or "").strip():
                    payload["kunden_nr"] = f"{customer_id:05d}"
                payload["created_at"] = _safe_str(payload.get("created_at")) or now_dt.isoformat()
                payload["updated_at"] = _safe_str(payload.get("updated_at")) or now_dt.isoformat()
                existing.payload = payload
                existing.created_at = _iso_to_dt(payload["created_at"])
                existing.updated_at = _iso_to_dt(payload["updated_at"])
                self._sync_customer_columns_from_payload(existing, payload)
                cached_rows[customer_id] = existing

            session.flush()
            for customer_id, row in cached_rows.items():
                self._sync_addresses_from_payload(session, customer_id, row.payload or {}, now_dt)
                self._sync_contacts_from_payload(session, customer_id, row.payload or {}, now_dt)

            for raw_wash in wash_rows:
                customer_id = _safe_int(raw_wash.get("kunden_id"), default=0)
                if customer_id < 1 or customer_id not in seen_customer_ids:
                    continue
                self._upsert_wash_profile_db(
                    session,
                    customer_id,
                    raw_wash,
                    _iso_to_dt(_safe_str(raw_wash.get("updated_at"))),
                )
                imported_counts["wash_profiles_upserted"] += 1

            for raw_history in history_rows:
                customer_id = _safe_int(raw_history.get("kunden_id"), default=0)
                if customer_id < 1 or customer_id not in seen_customer_ids:
                    continue
                self._append_history_entry_db(
                    session,
                    customer_id=customer_id,
                    action=str(raw_history.get("action") or "updated"),
                    editor_name=_safe_str(raw_history.get("editor_name")),
                    editor_email=_safe_str(raw_history.get("editor_email")),
                    changes=_ensure_dict_list(raw_history.get("changes")),
                    timestamp=_iso_to_dt(_safe_str(raw_history.get("timestamp"))),
                    source=_safe_str(raw_history.get("source")) or "import.transitional",
                )
                imported_counts["history_imported"] += 1

            self._reset_postgres_sequences(session)
            session.commit()
        return imported_counts

    @staticmethod
    def _reset_postgres_sequences(session: Any) -> None:
        bind = session.get_bind()
        if bind is None or bind.dialect.name != "postgresql":
            return
        session.execute(text("SELECT setval(pg_get_serial_sequence('customers', 'id'), COALESCE(MAX(id), 1), true) FROM customers"))
        session.execute(text("SELECT setval(pg_get_serial_sequence('customer_addresses', 'id'), COALESCE(MAX(id), 1), true) FROM customer_addresses"))
        session.execute(text("SELECT setval(pg_get_serial_sequence('customer_contacts', 'id'), COALESCE(MAX(id), 1), true) FROM customer_contacts"))
        session.execute(text("SELECT setval(pg_get_serial_sequence('customer_wash_profiles', 'id'), COALESCE(MAX(id), 1), true) FROM customer_wash_profiles"))
        session.execute(text("SELECT setval(pg_get_serial_sequence('customer_history', 'id'), COALESCE(MAX(id), 1), true) FROM customer_history"))


__all__ = [
    "CustomerRepository",
    "CustomerNotFoundError",
    "CustomerValidationError",
]
