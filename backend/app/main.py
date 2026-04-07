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


if not _router_already_attached(legacy_app):
    legacy_app.include_router(api_v1_router)

app = legacy_app

