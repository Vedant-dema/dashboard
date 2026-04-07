"""Transitional database wiring.

Phase 4 keeps customer persistence on the existing demo/blob-compatible SQLite-backed store.
This module intentionally stays lightweight until PostgreSQL is introduced in Phase 6.
"""

from __future__ import annotations

from app.core.config import get_settings


def get_persistence_mode() -> str:
    """Returns current persistence mode label for diagnostics."""
    return get_settings().customers_store_mode

