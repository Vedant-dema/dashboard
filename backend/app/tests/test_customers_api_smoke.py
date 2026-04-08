from fastapi.testclient import TestClient


def _create_customer(client: TestClient, headers: dict[str, str], *, name: str) -> int:
    response = client.post(
        "/api/v1/customers",
        headers=headers,
        json={
            "customer": {
                "firmenname": name,
                "branche": "Test",
                "last_edited_by_name": "QA Bot",
                "last_edited_by_email": "qa@example.com",
            }
        },
    )
    assert response.status_code == 201
    payload = response.json()
    return int(payload["item"]["customer"]["id"])


def test_customers_list_detail_history_smoke(
    client: TestClient, demo_headers: dict[str, str]
) -> None:
    headers = demo_headers

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


def test_customer_create_update_creates_history(
    client: TestClient, demo_headers: dict[str, str]
) -> None:
    headers = demo_headers
    customer_id = _create_customer(client, headers, name="Milestone 7 Test GmbH")

    patch_response = client.patch(
        f"/api/v1/customers/{customer_id}",
        headers=headers,
        json={
            "customer": {
                "firmenname": "Milestone 7 Updated GmbH",
                "last_edited_by_name": "QA Bot",
                "last_edited_by_email": "qa@example.com",
            }
        },
    )
    assert patch_response.status_code == 200
    updated_name = patch_response.json()["item"]["customer"]["firmenname"]
    assert updated_name == "Milestone 7 Updated GmbH"

    history_response = client.get(f"/api/v1/customers/{customer_id}/history", headers=headers)
    assert history_response.status_code == 200
    history_items = history_response.json().get("items", [])
    actions = [str(item.get("action")) for item in history_items]
    assert "created" in actions
    assert "updated" in actions

    updated_entries = [item for item in history_items if item.get("action") == "updated"]
    assert updated_entries, "expected at least one updated history entry"
    first_changes = updated_entries[0].get("changes", [])
    assert any(change.get("field") == "customer.firmenname" for change in first_changes)


def test_customers_db_conflict_response_smoke(
    client: TestClient, demo_headers: dict[str, str]
) -> None:
    headers = demo_headers
    _create_customer(client, headers, name="Conflict Seed GmbH")

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
    assert isinstance(detail.get("actual_updated_at"), str)


def test_vat_info_basic_behavior(client: TestClient) -> None:
    response = client.get("/api/v1/vat/info")
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("enabled") is True
    assert str(payload.get("rest_api_base", "")).startswith("http")


def test_vat_status_route_basic_behavior_with_stub(client: TestClient, monkeypatch) -> None:
    import main as legacy_main

    async def _fake_vies_call_with_retries(method: str, url: str, **_: object) -> dict[str, object]:
        assert method == "GET"
        assert "/check-status" in url
        return {"status": "available", "memberStates": {"DE": "AVAILABLE"}}

    monkeypatch.setattr(legacy_main, "_vies_call_with_retries", _fake_vies_call_with_retries)

    response = client.get("/api/v1/vat/status")
    assert response.status_code == 200
    payload = response.json()
    assert payload.get("status") == "available"
    assert isinstance(payload.get("memberStates"), dict)
