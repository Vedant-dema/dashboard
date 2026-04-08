import pytest

from app.core.config import get_settings
from app.core.startup_checks import collect_startup_report


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_render_database_url_is_normalized_to_psycopg(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgres://user:pass@localhost:5432/dema")
    settings = get_settings()
    assert settings.database_url == "postgresql+psycopg://user:pass@localhost:5432/dema"


def test_production_startup_report_flags_localhost_only_cors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CUSTOMERS_STORE_MODE", "demo_blob")
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    monkeypatch.delenv("CORS_ORIGIN_REGEX", raising=False)
    report = collect_startup_report()
    assert report["strict_mode"] is True
    assert report["ok"] is False
    codes = {issue["code"] for issue in report["issues"]}
    assert "cors_local_only" in codes


def test_development_startup_report_allows_local_defaults(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    monkeypatch.delenv("CORS_ORIGIN_REGEX", raising=False)
    monkeypatch.setenv("CUSTOMERS_STORE_MODE", "demo_blob")
    report = collect_startup_report()
    assert report["strict_mode"] is False
    assert report["ok"] is True
