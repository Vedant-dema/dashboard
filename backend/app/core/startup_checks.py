"""Startup validation and readiness snapshot helpers."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import Settings, get_settings, is_production_env

_log = logging.getLogger("dema.startup")

_VALID_CUSTOMER_MODES: frozenset[str] = frozenset(
    {"demo_blob", "db", "database", "postgres", "postgresql", "sqlalchemy"}
)
_DB_MODES: frozenset[str] = frozenset({"db", "database", "postgres", "postgresql", "sqlalchemy"})
_VALID_STORAGE_PROVIDERS: frozenset[str] = frozenset({"local", "azure_blob"})

_LAST_STARTUP_REPORT: dict[str, Any] | None = None


def _is_local_origin(origin: str) -> bool:
    trimmed = origin.strip().lower()
    return trimmed.startswith("http://localhost") or trimmed.startswith("http://127.0.0.1")


def _record_issue(
    issues: list[dict[str, str]],
    *,
    code: str,
    message: str,
) -> None:
    issues.append({"code": code, "message": message})


def _validate_database_connectivity(
    *,
    settings: Settings,
    strict: bool,
    issues: list[dict[str, str]],
    warnings: list[dict[str, str]],
) -> None:
    mode = (settings.customers_store_mode or "").strip().lower()
    if mode not in _DB_MODES:
        return
    database_url = (settings.database_url or "").strip()
    if strict and database_url.startswith("sqlite"):
        _record_issue(
            issues,
            code="database_url_sqlite_in_production",
            message="Production mode with CUSTOMERS_STORE_MODE=db requires PostgreSQL, not sqlite.",
        )
    if not database_url:
        _record_issue(
            issues,
            code="database_url_missing",
            message="DATABASE_URL is required when CUSTOMERS_STORE_MODE=db.",
        )
        return

    try:
        from sqlalchemy import text
    except ModuleNotFoundError:
        target = issues if strict else warnings
        target.append(
            {
                "code": "sqlalchemy_missing",
                "message": "SQLAlchemy is not installed, so DB mode cannot be validated.",
            }
        )
        return

    try:
        from app.core.database import get_engine

        with get_engine().connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover - depends on runtime infrastructure
        target = issues if strict else warnings
        target.append(
            {
                "code": "database_connectivity_failed",
                "message": f"Database connectivity check failed: {exc!s}",
            }
        )


def collect_startup_report(*, settings: Settings | None = None, strict: bool | None = None) -> dict[str, Any]:
    runtime = settings or get_settings()
    strict_mode = bool(strict) if strict is not None else (
        runtime.startup_checks_strict or is_production_env(runtime.app_env)
    )

    issues: list[dict[str, str]] = []
    warnings: list[dict[str, str]] = []

    customer_mode = (runtime.customers_store_mode or "").strip().lower()
    if customer_mode not in _VALID_CUSTOMER_MODES:
        _record_issue(
            issues,
            code="customers_store_mode_invalid",
            message=f"Unsupported CUSTOMERS_STORE_MODE={runtime.customers_store_mode!r}.",
        )

    storage_provider = (runtime.storage_provider or "").strip().lower()
    if storage_provider not in _VALID_STORAGE_PROVIDERS:
        _record_issue(
            issues,
            code="storage_provider_invalid",
            message=f"Unsupported STORAGE_PROVIDER={runtime.storage_provider!r}.",
        )

    if storage_provider == "azure_blob" and not (runtime.azure_blob_account_url or "").strip():
        _record_issue(
            issues,
            code="azure_blob_account_url_missing",
            message="AZURE_BLOB_ACCOUNT_URL is required when STORAGE_PROVIDER=azure_blob.",
        )

    if storage_provider == "local" and not (runtime.storage_local_root or "").strip():
        _record_issue(
            issues,
            code="storage_local_root_missing",
            message="STORAGE_LOCAL_ROOT is required when STORAGE_PROVIDER=local.",
        )

    origins = list(runtime.cors_origins or [])
    origin_regex = (runtime.cors_origin_regex or "").strip()
    wildcard = any(origin.strip() == "*" for origin in origins)
    non_local_origins = [origin for origin in origins if not _is_local_origin(origin)]
    if strict_mode:
        if not origins and not origin_regex:
            _record_issue(
                issues,
                code="cors_missing",
                message="Production requires CORS_ORIGINS and/or CORS_ORIGIN_REGEX.",
            )
        if wildcard:
            _record_issue(
                issues,
                code="cors_wildcard_disallowed",
                message="Do not use CORS_ORIGINS=* with credentialed cookies/headers.",
            )
        if not non_local_origins and not origin_regex:
            _record_issue(
                issues,
                code="cors_local_only",
                message="Production CORS still points only to localhost origins.",
            )
    elif not origins and not origin_regex:
        warnings.append(
            {
                "code": "cors_defaulting_localhost",
                "message": "No CORS settings provided; defaults are localhost-only.",
            }
        )

    _validate_database_connectivity(settings=runtime, strict=strict_mode, issues=issues, warnings=warnings)

    report = {
        "ok": not issues,
        "strict_mode": strict_mode,
        "environment": runtime.app_env,
        "customers_store_mode": customer_mode,
        "storage_provider": storage_provider,
        "cors": {
            "origins": origins,
            "origin_regex": origin_regex or None,
        },
        "issues": issues,
        "warnings": warnings,
    }
    return report


def run_startup_checks(*, settings: Settings | None = None) -> dict[str, Any]:
    report = collect_startup_report(settings=settings)
    global _LAST_STARTUP_REPORT
    _LAST_STARTUP_REPORT = report
    if report["strict_mode"] and not report["ok"]:
        codes = ", ".join(issue["code"] for issue in report["issues"])
        raise RuntimeError(f"Startup checks failed: {codes}")
    if report["warnings"]:
        _log.warning("Startup checks reported warnings: %s", report["warnings"])
    if report["issues"] and not report["strict_mode"]:
        _log.warning("Startup checks reported non-blocking issues: %s", report["issues"])
    return report


def get_startup_report() -> dict[str, Any]:
    global _LAST_STARTUP_REPORT
    if _LAST_STARTUP_REPORT is None:
        _LAST_STARTUP_REPORT = collect_startup_report()
    return dict(_LAST_STARTUP_REPORT)

