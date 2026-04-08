"""Health and readiness endpoints for smoke checks."""

from typing import Any

from fastapi import APIRouter, HTTPException

from app.core.config import get_settings
from app.core.database import get_database_health_summary, get_persistence_mode
from app.core.startup_checks import get_startup_report

router = APIRouter(tags=["health"])


def _health_payload(*, version: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "status": "ok",
        "service": "dema-backend",
        "customers_store_mode": (get_settings().customers_store_mode or "").strip().lower(),
        "persistence": get_persistence_mode(),
        "database": get_database_health_summary(),
        "startup_checks": get_startup_report(),
    }
    if version is not None:
        payload["version"] = version
    return payload


@router.get("/api/health")
def api_health() -> dict[str, Any]:
    return _health_payload()


@router.get("/api/v1/health")
def api_v1_health() -> dict[str, Any]:
    return _health_payload(version="v1")


@router.get("/api/v1/ready")
def api_v1_ready() -> dict[str, Any]:
    startup_checks = get_startup_report()
    if not startup_checks.get("ok", False):
        raise HTTPException(status_code=503, detail={"status": "not_ready", "startup_checks": startup_checks})
    return {"status": "ready", "startup_checks": startup_checks}

