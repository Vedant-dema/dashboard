# DEMA Architecture Overview

Date: 2026-04-07

## Current Runtime (Phase 4)

- Frontend: React + TypeScript + Vite
- Backend: Python FastAPI
- Transitional persistence: shared `customers_db` state in SQLite (`demo_store`), blob/demo-compatible
- Deployment target (current): Vercel (frontend) + Render (backend)

## Backend Shape

Backend now exposes a modular app structure under `backend/app`:

```text
backend/app/
  main.py
  core/
    config.py
    logging.py
    database.py
  api/
    v1/
      router.py
      endpoints/
        health.py
        vat.py
        customers.py
  schemas/
    common.py
    vat.py
    customer.py
  services/
    vat_service.py
    customer_service.py
    history_service.py
  repositories/
    customer_repository.py
    history_repository.py
  models/
  tests/
```

## Transitional Strategy

- Legacy backend behavior (VAT/geocode/demo APIs) remains active.
- Modular `app.main` composes the legacy FastAPI app and adds new REST routers.
- `/api/v1/demo/customers-db` remains the compatibility path.
- New customer resource endpoints provide cleaner API contracts while still reading/writing the transitional store.

## Phase 4 Customer REST Endpoints

- `GET /api/v1/customers`
- `GET /api/v1/customers/{id}`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/{id}`
- `GET /api/v1/customers/{id}/history`
- `GET /api/v1/customers/{id}/wash-profile`

## Next Architectural Step

Phase 5 adds optimistic concurrency and centralized audit/history behavior before Phase 6 PostgreSQL migration.

