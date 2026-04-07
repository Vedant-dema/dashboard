# DEMA Architecture Overview

## Backend (Phase 3 v2)

The backend now uses a modular FastAPI structure under `backend/app`:

- `app/main.py`: app factory, middleware, router composition
- `app/core/`: config, logging, and database helpers
- `app/api/v1/endpoints/`: thin HTTP handlers (`health`, `vat`, `customers`)
- `app/schemas/`: request/response models
- `app/services/`: business logic layer
- `app/repositories/`: persistence adapter layer
- `app/models/`: reserved for SQLAlchemy models
- `app/tests/`: backend test package

## Compatibility Strategy

- Legacy monolith was preserved in `app/legacy/legacy_main.py`.
- VAT service delegates to legacy VAT handlers to preserve current VAT/VIES behavior.
- `app/main.py` mounts the legacy app so non-migrated endpoints keep working.

## Why This Split

- Reduces risk from a single giant backend file.
- Keeps behavior stable while enabling future REST hardening and PostgreSQL migration.
- Establishes clean layering for customer APIs and audit/concurrency work in later phases.

