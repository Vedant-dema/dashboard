from __future__ import annotations

import os
from dataclasses import dataclass


def _csv_values(raw: str, *, fallback: list[str]) -> tuple[str, ...]:
    values = tuple(part.strip() for part in raw.split(",") if part.strip())
    return values or tuple(fallback)


@dataclass(frozen=True)
class Settings:
    app_name: str = os.environ.get("APP_NAME", "Dema Dashboard API")
    app_version: str = os.environ.get("APP_VERSION", "0.3.0")
    environment: str = os.environ.get("ENV", "development")
    cors_origins: tuple[str, ...] = _csv_values(
        os.environ.get("CORS_ORIGINS", ""),
        fallback=["http://localhost:5173", "http://127.0.0.1:5173"],
    )
    database_url: str | None = os.environ.get("DATABASE_URL")


settings = Settings()

