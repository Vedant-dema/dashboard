"""Central runtime configuration for the modular backend."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel


def _load_dotenv_if_present() -> None:
    """Populate os.environ from ``backend/.env`` when the file exists.

    Uses ``python-dotenv`` if installed. Variables already set in the environment are not
    overwritten (same as a typical shell-first precedence).
    """
    try:
        from dotenv import load_dotenv
    except ModuleNotFoundError:
        return
    backend_root = Path(__file__).resolve().parent.parent.parent
    env_file = backend_root / ".env"
    if env_file.is_file():
        load_dotenv(env_file, override=False)


_load_dotenv_if_present()


def _as_bool(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _as_int(raw: str | None, default: int) -> int:
    if raw is None:
        return default
    try:
        return int(raw.strip())
    except (TypeError, ValueError):
        return default


def _as_csv_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [item.strip() for item in raw.split(",") if item.strip()]


def _normalize_app_env(raw: str | None) -> str:
    value = (raw or "development").strip().lower()
    if value in {"prod", "production"}:
        return "production"
    if value in {"stage", "staging"}:
        return "staging"
    if value in {"test", "testing"}:
        return "test"
    return "development"


def is_production_env(raw: str | None) -> bool:
    return _normalize_app_env(raw) == "production"


def _normalize_database_url(raw: str | None) -> str:
    value = (raw or "").strip()
    if not value:
        return "sqlite:///./dema_phase6.db"
    # Render and other hosts often expose postgres://...; SQLAlchemy + psycopg expects
    # postgresql+psycopg://... in this repo.
    if value.startswith("postgres://"):
        return "postgresql+psycopg://" + value[len("postgres://") :]
    if value.startswith("postgresql://"):
        return "postgresql+psycopg://" + value[len("postgresql://") :]
    return value


class Settings(BaseModel):
    app_name: str = "DEMA Dashboard API"
    app_env: str = "development"
    app_debug: bool = False
    log_level: str = "INFO"
    startup_checks_strict: bool = False
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    cors_origin_regex: str | None = None
    customers_store_mode: str = "demo_blob"
    demo_api_key_enabled: bool = False
    database_url: str = "sqlite:///./dema_phase6.db"
    database_echo: bool = False
    storage_provider: str = "local"
    storage_local_root: str = "./storage"
    storage_default_download_ttl_seconds: int = 900
    storage_container_raw: str = "customer-raw"
    storage_container_derived: str = "customer-derived"
    azure_blob_account_url: str | None = None
    azure_blob_connection_string: str | None = None
    azure_blob_container_raw: str = "customer-raw"
    azure_blob_container_derived: str = "customer-derived"
    azure_blob_sas_upload_enabled: bool = False


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    demo_api_key = (os.environ.get("DEMO_API_KEY") or "").strip()
    return Settings(
        app_env=_normalize_app_env(os.environ.get("APP_ENV")),
        app_debug=_as_bool(os.environ.get("APP_DEBUG"), default=False),
        log_level=(os.environ.get("LOG_LEVEL") or "INFO").strip().upper(),
        startup_checks_strict=_as_bool(os.environ.get("STARTUP_CHECKS_STRICT"), default=False),
        cors_origins=_as_csv_list(os.environ.get("CORS_ORIGINS"))
        or ["http://localhost:5173", "http://127.0.0.1:5173"],
        cors_origin_regex=(os.environ.get("CORS_ORIGIN_REGEX") or "").strip() or None,
        customers_store_mode=(os.environ.get("CUSTOMERS_STORE_MODE") or "demo_blob").strip().lower(),
        demo_api_key_enabled=bool(demo_api_key),
        database_url=_normalize_database_url(os.environ.get("DATABASE_URL")),
        database_echo=_as_bool(os.environ.get("DATABASE_ECHO"), default=False),
        storage_provider=(os.environ.get("STORAGE_PROVIDER") or "local").strip().lower(),
        storage_local_root=(os.environ.get("STORAGE_LOCAL_ROOT") or "./storage").strip(),
        storage_default_download_ttl_seconds=max(
            60,
            _as_int(os.environ.get("STORAGE_DEFAULT_DOWNLOAD_TTL_SECONDS"), default=900),
        ),
        storage_container_raw=(os.environ.get("STORAGE_CONTAINER_RAW") or "customer-raw").strip(),
        storage_container_derived=(os.environ.get("STORAGE_CONTAINER_DERIVED") or "customer-derived").strip(),
        azure_blob_account_url=(os.environ.get("AZURE_BLOB_ACCOUNT_URL") or "").strip() or None,
        azure_blob_connection_string=(os.environ.get("AZURE_BLOB_CONNECTION_STRING") or "").strip() or None,
        azure_blob_container_raw=(os.environ.get("AZURE_BLOB_CONTAINER_RAW") or "customer-raw").strip(),
        azure_blob_container_derived=(os.environ.get("AZURE_BLOB_CONTAINER_DERIVED") or "customer-derived").strip(),
        azure_blob_sas_upload_enabled=_as_bool(os.environ.get("AZURE_BLOB_SAS_UPLOAD_ENABLED"), default=False),
    )

