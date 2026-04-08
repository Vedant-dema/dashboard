import asyncio
from typing import Any

from fastapi.testclient import TestClient

from app.main import app


def test_vat_check_unexpected_exception_returns_structured_503(monkeypatch) -> None:
    async def _boom(*args: Any, **kwargs: Any) -> dict[str, Any]:
        raise RuntimeError("simulated upstream crash")

    monkeypatch.setattr("main._vies_call_with_retries", _boom)
    client = TestClient(app)
    response = client.post(
        "/api/v1/vat/check",
        json={"country_code": "DE", "vat_number": "123456789"},
    )
    assert response.status_code == 503
    payload = response.json()
    detail = payload.get("detail", {})
    assert detail.get("code") == "vat_check_internal_error"
    assert isinstance(detail.get("message"), str)


def test_vat_check_hard_deadline_returns_504_json(monkeypatch) -> None:
    async def _hang(*args: Any, **kwargs: Any) -> dict[str, Any]:
        await asyncio.sleep(120.0)
        return {}

    monkeypatch.setenv("VIES_CHECK_ENDPOINT_MAX_TOTAL_SEC", "2")
    monkeypatch.setattr("main._vies_call_with_retries", _hang)
    client = TestClient(app)
    response = client.post(
        "/api/v1/vat/check",
        json={"country_code": "DE", "vat_number": "123456789"},
    )
    assert response.status_code == 504
    payload = response.json()
    detail = payload.get("detail", {})
    assert detail.get("code") == "vat_check_deadline_exceeded"
    assert isinstance(detail.get("message"), str)
