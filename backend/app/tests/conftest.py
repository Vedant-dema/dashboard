from __future__ import annotations

import os
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(autouse=True)
def _isolated_demo_store(monkeypatch: pytest.MonkeyPatch) -> None:
    sandbox_dir = Path.cwd() / ".pytest-sandbox"
    sandbox_dir.mkdir(parents=True, exist_ok=True)
    demo_db = sandbox_dir / f"demo_shared_{uuid4().hex}.db"
    monkeypatch.setenv("DEMO_CUSTOMERS_DB_PATH", str(demo_db))
    monkeypatch.setenv("CUSTOMERS_STORE_MODE", "demo_blob")

    # Ensure config/settings reflect test overrides.
    from app.core.config import get_settings

    get_settings.cache_clear()

    import main as legacy_main

    legacy_main._init_demo_store()
    yield
    try:
        demo_db.unlink(missing_ok=True)
    except OSError:
        pass
    get_settings.cache_clear()


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def demo_headers() -> dict[str, str]:
    key = (os.environ.get("DEMO_API_KEY") or "").strip()
    return {"x-demo-key": key} if key else {}
