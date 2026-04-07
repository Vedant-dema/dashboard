from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.legacy import legacy_main


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Reuse the legacy app lifespan so current VAT/demo behavior remains stable.
    legacy_ctx = legacy_main._lifespan(legacy_main.app)
    await legacy_ctx.__aenter__()
    try:
        yield
    finally:
        await legacy_ctx.__aexit__(None, None, None)


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    # Keep non-migrated endpoints active while the backend is split incrementally.
    app.mount("/", legacy_main.app)
    return app


app = create_app()

