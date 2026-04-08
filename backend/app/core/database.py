"""Database wiring for Phase 6 (SQLAlchemy 2.0)."""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Generator

try:
    from sqlalchemy import Engine, create_engine
    from sqlalchemy.orm import Session, sessionmaker

    SQLALCHEMY_AVAILABLE = True
except ModuleNotFoundError:
    Engine = Any  # type: ignore[assignment]
    Session = Any  # type: ignore[assignment]
    sessionmaker = Any  # type: ignore[assignment]
    create_engine = None  # type: ignore[assignment]
    SQLALCHEMY_AVAILABLE = False

from app.core.config import get_settings

_ENGINE: Engine | None = None
_SESSION_FACTORY: sessionmaker[Session] | None = None


def get_persistence_mode() -> str:
    """Returns current persistence mode label for diagnostics."""
    mode = get_settings().customers_store_mode
    if mode in {"db", "database", "postgres", "postgresql", "sqlalchemy"} and not SQLALCHEMY_AVAILABLE:
        return "demo_blob"
    return mode


def get_database_url() -> str:
    return get_settings().database_url


def get_database_health_summary() -> dict[str, str]:
    """Safe connection summary for health checks (no credentials)."""
    raw = get_settings().database_url
    try:
        from sqlalchemy.engine.url import make_url

        u = make_url(raw)
        out: dict[str, str] = {"driver": u.drivername}
        if u.host:
            out["host"] = u.host
        if u.database:
            out["database"] = u.database
        if u.port:
            out["port"] = str(u.port)
        return out
    except Exception:
        return {"driver": "unknown"}


def get_engine() -> Engine:
    if not SQLALCHEMY_AVAILABLE:
        raise RuntimeError("SQLAlchemy is not installed. Install backend requirements for DB mode.")
    global _ENGINE
    if _ENGINE is None:
        settings = get_settings()
        connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
        _ENGINE = create_engine(
            settings.database_url,
            echo=settings.database_echo,
            future=True,
            pool_pre_ping=True,
            connect_args=connect_args,
        )
    return _ENGINE


def get_session_factory() -> sessionmaker[Session]:
    if not SQLALCHEMY_AVAILABLE:
        raise RuntimeError("SQLAlchemy is not installed. Install backend requirements for DB mode.")
    global _SESSION_FACTORY
    if _SESSION_FACTORY is None:
        _SESSION_FACTORY = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
            future=True,
        )
    return _SESSION_FACTORY


@contextmanager
def get_session() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

