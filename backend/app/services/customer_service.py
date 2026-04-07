from __future__ import annotations

import datetime as dt
from typing import Any

from fastapi import HTTPException

from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerRecord, CustomerUpdate, CustomerWashProfile
from app.services.history_service import history_service


def _now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


class CustomerService:
    def __init__(self, repository: CustomerRepository) -> None:
        self._repository = repository

    def list_customers(self, *, x_demo_key: str | None) -> tuple[list[CustomerRecord], str | None]:
        state, updated_at = self._repository.load_state(x_demo_key=x_demo_key)
        rows = self._repository.list_customers(state)
        return [CustomerRecord.model_validate(row) for row in rows], updated_at

    def get_customer(self, *, customer_id: int, x_demo_key: str | None) -> CustomerRecord:
        state, _ = self._repository.load_state(x_demo_key=x_demo_key)
        return CustomerRecord.model_validate(self._repository.get_customer(state, customer_id))

    def create_customer(
        self,
        *,
        payload: CustomerCreate,
        x_demo_key: str | None,
        editor_name: str | None = None,
        editor_email: str | None = None,
    ) -> CustomerRecord:
        state, _ = self._repository.load_state(x_demo_key=x_demo_key)
        data = payload.model_dump(exclude_unset=True)

        kunden_nr = str(data.get("kunden_nr") or self._repository.next_customer_number(state)).strip()
        if any(str(row.get("kunden_nr", "")).strip() == kunden_nr for row in state["kunden"]):
            raise HTTPException(status_code=409, detail=f"Customer number already exists: {kunden_nr}")

        customer_id = self._repository.next_customer_id(state)
        now = _now_iso()
        record = {
            **data,
            "id": customer_id,
            "kunden_nr": kunden_nr,
            "created_at": now,
            "updated_at": now,
            "aufnahme": data.get("aufnahme") or now,
            "created_by_name": editor_name,
            "created_by_email": editor_email,
            "last_edited_by_name": editor_name,
            "last_edited_by_email": editor_email,
        }
        state["kunden"].append(record)
        state["nextKundeId"] = customer_id + 1
        history_service.append_event(
            state,
            customer_id=customer_id,
            action="created",
            editor_name=editor_name,
            editor_email=editor_email,
        )
        saved_state, _ = self._repository.save_state(state)
        return CustomerRecord.model_validate(self._repository.get_customer(saved_state, customer_id))

    def patch_customer(
        self,
        *,
        customer_id: int,
        payload: CustomerUpdate,
        x_demo_key: str | None,
        editor_name: str | None = None,
        editor_email: str | None = None,
    ) -> CustomerRecord:
        state, _ = self._repository.load_state(x_demo_key=x_demo_key)
        row = self._repository.get_customer(state, customer_id)
        patch = payload.model_dump(exclude_unset=True)
        if not patch:
            return CustomerRecord.model_validate(row)

        if "id" in patch:
            patch.pop("id")

        if "kunden_nr" in patch:
            new_nr = str(patch["kunden_nr"]).strip()
            duplicate = any(
                int(other.get("id", 0)) != customer_id and str(other.get("kunden_nr", "")).strip() == new_nr
                for other in state["kunden"]
            )
            if duplicate:
                raise HTTPException(status_code=409, detail=f"Customer number already exists: {new_nr}")
            patch["kunden_nr"] = new_nr

        before = dict(row)
        row.update(patch)
        row["updated_at"] = _now_iso()
        row["last_edited_by_name"] = editor_name or row.get("last_edited_by_name")
        row["last_edited_by_email"] = editor_email or row.get("last_edited_by_email")

        changes: list[dict[str, Any]] = []
        for key, value in patch.items():
            if before.get(key) != value:
                changes.append({"field": key, "from": before.get(key), "to": value})

        history_service.append_event(
            state,
            customer_id=customer_id,
            action="updated",
            editor_name=editor_name,
            editor_email=editor_email,
            changes=changes if changes else None,
        )
        saved_state, _ = self._repository.save_state(state)
        return CustomerRecord.model_validate(self._repository.get_customer(saved_state, customer_id))

    def get_customer_history(self, *, customer_id: int, x_demo_key: str | None) -> tuple[list[dict[str, Any]], str | None]:
        state, updated_at = self._repository.load_state(x_demo_key=x_demo_key)
        self._repository.get_customer(state, customer_id)
        items = self._repository.get_customer_history(state, customer_id)
        items.sort(key=lambda row: str(row.get("timestamp", "")), reverse=True)
        return items, updated_at

    def get_customer_wash_profile(
        self,
        *,
        customer_id: int,
        x_demo_key: str | None,
    ) -> tuple[CustomerWashProfile | None, str | None]:
        state, updated_at = self._repository.load_state(x_demo_key=x_demo_key)
        self._repository.get_customer(state, customer_id)
        wash = self._repository.get_customer_wash_profile(state, customer_id)
        if wash is None:
            return None, updated_at
        return CustomerWashProfile.model_validate(wash), updated_at


customer_service = CustomerService(CustomerRepository())

