"""Modular FastAPI entrypoint for Phase 4.

This composes the existing legacy app (VAT/geocode/demo routes) and adds modular routes
without breaking transitional behavior.
"""

from __future__ import annotations

from fastapi import FastAPI

from app.api.v1.router import api_v1_router
from app.core.logging import configure_logging

configure_logging()

# Reuse the existing production behavior from the legacy backend during transition.
from main import app as legacy_app  # noqa: E402


def _router_already_attached(app: FastAPI) -> bool:
    return any(getattr(route, "path", None) == "/api/v1/customers" for route in app.routes)


def _remove_legacy_customer_history_route(app: FastAPI) -> None:
    """Avoid duplicate history endpoints by removing the legacy transitional route."""
    legacy_history_path = "/api/v1/customers/{customer_id}/history"
    app.router.routes = [
        route
        for route in app.router.routes
        if not (
            getattr(route, "path", None) == legacy_history_path
            and "GET" in getattr(route, "methods", set())
            and getattr(getattr(route, "endpoint", None), "__module__", "") == "main"
        )
    ]


if not _router_already_attached(legacy_app):
    _remove_legacy_customer_history_route(legacy_app)
    legacy_app.include_router(api_v1_router)

app = legacy_app

