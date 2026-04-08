import os

from fastapi.testclient import TestClient

from app.main import app


def _demo_headers() -> dict[str, str]:
    key = (os.environ.get("DEMO_API_KEY") or "").strip()
    return {"x-demo-key": key} if key else {}


def test_customers_list_detail_history_smoke() -> None:
    client = TestClient(app)
    headers = _demo_headers()

    list_response = client.get("/api/v1/customers", headers=headers)
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert isinstance(list_payload.get("items"), list)
    assert isinstance(list_payload.get("total"), int)

    if not list_payload["items"]:
        return

    first_customer = list_payload["items"][0]
    customer_id = first_customer["id"]

    detail_response = client.get(f"/api/v1/customers/{customer_id}", headers=headers)
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert isinstance(detail_payload.get("customer"), dict)

    history_response = client.get(f"/api/v1/customers/{customer_id}/history", headers=headers)
    assert history_response.status_code == 200
    history_payload = history_response.json()
    assert isinstance(history_payload.get("items"), list)
    assert isinstance(history_payload.get("total"), int)


def test_customers_db_conflict_response_smoke() -> None:
    client = TestClient(app)
    headers = _demo_headers()

    state_response = client.get("/api/v1/demo/customers-db", headers=headers)
    assert state_response.status_code == 200
    state_payload = state_response.json()
    assert isinstance(state_payload.get("state"), dict)

    stale_write_response = client.put(
        "/api/v1/demo/customers-db",
        headers=headers,
        json={
            "state": state_payload["state"],
            "expected_updated_at": "1900-01-01T00:00:00+00:00",
            "source": "pytest.customers-conflict-smoke",
        },
    )
    assert stale_write_response.status_code == 409
    detail = stale_write_response.json().get("detail", {})
    assert detail.get("code") == "customers_db_conflict"
