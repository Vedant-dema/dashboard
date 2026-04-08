"""Health endpoints for smoke checks."""

from typing import Any

from fastapi import APIRouter

from app.core.config import get_settings
from app.core.database import get_database_health_summary, get_persistence_mode

router = APIRouter(tags=["health"])


@router.get("/api/health")
def api_health() -> dict[str, Any]:
    return {
        "status": "ok",
        "service": "dema-backend",
        "customers_store_mode": (get_settings().customers_store_mode or "").strip().lower(),
        "persistence": get_persistence_mode(),
        "database": get_database_health_summary(),
    }


@router.get("/api/v1/health")
def api_v1_health() -> dict[str, str]:
    return {"status": "ok", "version": "v1"}

