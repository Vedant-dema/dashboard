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


def _first_nonempty(*values: str | None) -> str | None:
    for value in values:
        if value is None:
            continue
        cleaned = value.strip()
        if cleaned:
            return cleaned
    return None


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


def _normalize_log_format(raw: str | None) -> str:
    value = (raw or "text").strip().lower()
    if value in {"json", "structured"}:
        return "json"
    return "text"


class Settings(BaseModel):
    app_name: str = "DEMA Dashboard API"
    app_env: str = "development"
    app_debug: bool = False
    log_level: str = "INFO"
    log_format: str = "text"
    deployment_platform: str = "local"
    cloud_provider: str = "generic"
    service_name: str = "dema-backend"
    service_version: str = "dev"
    request_id_header_name: str = "x-request-id"
    observability_enabled: bool = True
    otel_enabled: bool = False
    otel_service_name: str = "dema-backend"
    otel_exporter_otlp_endpoint: str | None = None
    applicationinsights_connection_string: str | None = None
    key_vault_uri: str | None = None
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
    service_name = _first_nonempty(
        os.environ.get("SERVICE_NAME"),
        os.environ.get("WEBSITE_SITE_NAME"),
        os.environ.get("RENDER_SERVICE_NAME"),
        "dema-backend",
    )
    service_version = _first_nonempty(
        os.environ.get("SERVICE_VERSION"),
        os.environ.get("RENDER_GIT_COMMIT"),
        os.environ.get("SOURCE_VERSION"),
        "dev",
    )
    deployment_platform = _first_nonempty(
        os.environ.get("DEPLOYMENT_PLATFORM"),
        "render" if _first_nonempty(os.environ.get("RENDER"), os.environ.get("RENDER_SERVICE_ID")) else None,
        "azure" if _first_nonempty(os.environ.get("WEBSITE_SITE_NAME"), os.environ.get("CONTAINER_APP_NAME")) else None,
        "local",
    )
    cloud_provider = _first_nonempty(
        os.environ.get("CLOUD_PROVIDER"),
        "azure" if _first_nonempty(os.environ.get("AZURE_SUBSCRIPTION_ID"), os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING")) else None,
        "generic",
    )
    ai_connection_string = _first_nonempty(
        os.environ.get("APPLICATIONINSIGHTS_CONNECTION_STRING"),
        os.environ.get("APPINSIGHTS_CONNECTIONSTRING"),
    )
    otel_endpoint = _first_nonempty(
        os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"),
        os.environ.get("APPLICATIONINSIGHTS_OTEL_ENDPOINT"),
    )
    key_vault_uri = _first_nonempty(
        os.environ.get("KEY_VAULT_URI"),
        os.environ.get("AZURE_KEY_VAULT_URI"),
    )
    return Settings(
        app_env=_normalize_app_env(os.environ.get("APP_ENV")),
        app_debug=_as_bool(os.environ.get("APP_DEBUG"), default=False),
        log_level=(os.environ.get("LOG_LEVEL") or "INFO").strip().upper(),
        log_format=_normalize_log_format(os.environ.get("LOG_FORMAT")),
        deployment_platform=(deployment_platform or "local").strip().lower(),
        cloud_provider=(cloud_provider or "generic").strip().lower(),
        service_name=(service_name or "dema-backend").strip(),
        service_version=(service_version or "dev").strip(),
        request_id_header_name=(
            _first_nonempty(os.environ.get("REQUEST_ID_HEADER_NAME"), "x-request-id") or "x-request-id"
        ).strip().lower(),
        observability_enabled=_as_bool(os.environ.get("OBSERVABILITY_ENABLED"), default=True),
        otel_enabled=_as_bool(os.environ.get("OTEL_ENABLED"), default=False),
        otel_service_name=(
            _first_nonempty(os.environ.get("OTEL_SERVICE_NAME"), service_name, "dema-backend") or "dema-backend"
        ).strip(),
        otel_exporter_otlp_endpoint=otel_endpoint,
        applicationinsights_connection_string=ai_connection_string,
        key_vault_uri=key_vault_uri,
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

