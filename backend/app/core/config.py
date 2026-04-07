"""Central runtime configuration for the modular backend."""

from __future__ import annotations

import os
from functools import lru_cache

from pydantic import BaseModel


def _as_bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class Settings(BaseModel):
    app_name: str = "DEMA Dashboard API"
    app_env: str = "development"
    app_debug: bool = False
    log_level: str = "INFO"
    customers_store_mode: str = "demo_blob"
    demo_api_key_enabled: bool = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    demo_api_key = (os.environ.get("DEMO_API_KEY") or "").strip()
    return Settings(
        app_env=(os.environ.get("APP_ENV") or "development").strip(),
        app_debug=_as_bool(os.environ.get("APP_DEBUG"), default=False),
        log_level=(os.environ.get("LOG_LEVEL") or "INFO").strip().upper(),
        customers_store_mode=(os.environ.get("CUSTOMERS_STORE_MODE") or "demo_blob").strip().lower(),
        demo_api_key_enabled=bool(demo_api_key),
    )

