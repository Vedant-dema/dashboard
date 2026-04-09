"""Observability hooks and request correlation helpers.

Designed to be cloud-portable:
- Works with no telemetry SDKs installed.
- Adds request-id correlation for logs by default.
- Optionally enables OpenTelemetry when dependencies and env vars are present.
"""

from __future__ import annotations

import contextvars
import logging
import uuid
from typing import Any

from fastapi import FastAPI, Request

from app.core.config import Settings, get_settings

_log = logging.getLogger("dema.observability")

_REQUEST_ID_CTX: contextvars.ContextVar[str] = contextvars.ContextVar(
    "dema_request_id",
    default="-",
)


def get_request_id() -> str:
    return _REQUEST_ID_CTX.get("-")


def set_request_id(value: str) -> contextvars.Token[str]:
    cleaned = (value or "").strip() or "-"
    return _REQUEST_ID_CTX.set(cleaned)


def reset_request_id(token: contextvars.Token[str]) -> None:
    _REQUEST_ID_CTX.reset(token)


def _new_request_id() -> str:
    return uuid.uuid4().hex


def attach_request_id_middleware(app: FastAPI, *, settings: Settings | None = None) -> None:
    runtime = settings or get_settings()
    header_name = (runtime.request_id_header_name or "x-request-id").strip().lower()
    if not header_name:
        header_name = "x-request-id"

    @app.middleware("http")
    async def _request_id_middleware(request: Request, call_next):  # type: ignore[override]
        incoming = (request.headers.get(header_name) or "").strip()
        request_id = incoming or _new_request_id()
        token = set_request_id(request_id)
        request.state.request_id = request_id
        try:
            response = await call_next(request)
        finally:
            reset_request_id(token)
        response.headers[header_name] = request_id
        return response


def _configure_otel_if_available(app: FastAPI, *, settings: Settings) -> bool:
    if not (settings.observability_enabled and settings.otel_enabled):
        return False
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ModuleNotFoundError:
        _log.info("OTEL enabled but OpenTelemetry packages are not installed; skipping instrumentation.")
        return False

    exporter: Any | None = None
    if settings.applicationinsights_connection_string:
        try:
            from azure.monitor.opentelemetry.exporter import AzureMonitorTraceExporter
        except ModuleNotFoundError:
            _log.info(
                "APPLICATIONINSIGHTS_CONNECTION_STRING is set, but azure monitor exporter is not installed."
            )
        else:
            exporter = AzureMonitorTraceExporter(
                connection_string=settings.applicationinsights_connection_string
            )
    if exporter is None and settings.otel_exporter_otlp_endpoint:
        try:
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        except ModuleNotFoundError:
            _log.info(
                "OTEL_EXPORTER_OTLP_ENDPOINT is set, but OTLP exporter package is not installed."
            )
            return False
        exporter = OTLPSpanExporter(endpoint=settings.otel_exporter_otlp_endpoint)
    if exporter is None:
        _log.info("OTEL enabled but no exporter endpoint/connection string is configured.")
        return False

    resource = Resource.create(
        {
            "service.name": settings.otel_service_name or settings.service_name,
            "service.version": settings.service_version,
            "deployment.environment": settings.app_env,
            "cloud.provider": settings.cloud_provider,
            "deployment.platform": settings.deployment_platform,
        }
    )
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    try:
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    except ModuleNotFoundError:
        _log.info("OTEL tracer configured, but FastAPI instrumentor package is not installed.")
        return False
    FastAPIInstrumentor.instrument_app(app)
    _log.info("OpenTelemetry instrumentation enabled.")
    return True


def configure_observability(app: FastAPI, *, settings: Settings | None = None) -> dict[str, Any]:
    runtime = settings or get_settings()
    attach_request_id_middleware(app, settings=runtime)
    otel_enabled = _configure_otel_if_available(app, settings=runtime)
    return {
        "request_id_header_name": runtime.request_id_header_name,
        "otel_enabled": otel_enabled,
        "applicationinsights_configured": bool(runtime.applicationinsights_connection_string),
    }

