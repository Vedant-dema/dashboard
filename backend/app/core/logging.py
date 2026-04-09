"""Shared logging setup for modular routes/services."""

from __future__ import annotations

import datetime as dt
import json
import logging

from app.core.config import get_settings
from app.core.observability import get_request_id

_LOGGING_CONFIGURED = False


class _ContextEnrichmentFilter(logging.Filter):
    def __init__(self, *, service_name: str, service_version: str, environment: str) -> None:
        super().__init__()
        self._service_name = service_name
        self._service_version = service_version
        self._environment = environment

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = get_request_id()
        record.service_name = self._service_name
        record.service_version = self._service_version
        record.environment = self._environment
        return True


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
            "service": getattr(record, "service_name", None),
            "service_version": getattr(record, "service_version", None),
            "environment": getattr(record, "environment", None),
        }
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True)


def configure_logging() -> None:
    global _LOGGING_CONFIGURED
    if _LOGGING_CONFIGURED:
        return

    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()

    handler = logging.StreamHandler()
    if settings.log_format == "json":
        formatter: logging.Formatter = _JsonFormatter()
    else:
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)s %(name)s [req=%(request_id)s] :: %(message)s"
        )
    handler.setFormatter(formatter)
    handler.addFilter(
        _ContextEnrichmentFilter(
            service_name=settings.service_name,
            service_version=settings.service_version,
            environment=settings.app_env,
        )
    )
    root.addHandler(handler)
    _LOGGING_CONFIGURED = True


def get_logger(name: str) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name)

