"""Health endpoints for smoke checks."""

from fastapi import APIRouter

from app.core.database import get_persistence_mode

router = APIRouter(tags=["health"])


@router.get("/api/health")
def api_health() -> dict[str, str]:
    return {"status": "ok", "service": "dema-backend", "persistence": get_persistence_mode()}


@router.get("/api/v1/health")
def api_v1_health() -> dict[str, str]:
    return {"status": "ok", "version": "v1"}

