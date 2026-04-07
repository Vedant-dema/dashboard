from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from fastapi.responses import Response

from app.core.config import settings
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/")
def api_root() -> dict[str, Any]:
    return {
        "service": settings.app_name,
        "note": "Open the app in the frontend dev server, not this API port.",
        "health": "/api/health",
        "docs": "/docs",
    }


@router.head("/", include_in_schema=False)
def api_root_head() -> Response:
    return Response(status_code=200)


@router.get("/favicon.ico", include_in_schema=False)
def favicon() -> Response:
    return Response(status_code=204)


@router.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", cors_origins=list(settings.cors_origins))

