from __future__ import annotations

from app.core.config import settings


def get_database_url() -> str | None:
    return settings.database_url


def is_database_configured() -> bool:
    return bool(settings.database_url)

