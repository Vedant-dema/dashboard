# Architecture Overview

## Milestone 6: PostgreSQL Foundation for Customer Domain

### Persistence Modes

Customer persistence now supports two runtime modes:

- `CUSTOMERS_STORE_MODE=demo_blob` (default transitional mode)
- `CUSTOMERS_STORE_MODE=db` (SQLAlchemy-backed mode, ready for PostgreSQL)

In both modes, the API contracts remain stable for:

- `GET /api/v1/customers`
- `GET /api/v1/customers/{id}`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/{id}`
- `GET /api/v1/customers/{id}/history`
- `GET /api/v1/customers/{id}/wash-profile`

### SQL Customer Domain

The backend now includes SQLAlchemy models and Alembic baseline migration for:

- `customers`
- `customer_addresses`
- `customer_contacts`
- `customer_wash_profiles`
- `customer_history`

The customer repository selects blob or DB behavior based on runtime mode, so frontend behavior stays unchanged during migration.

### Transitional Import Path

A dedicated import path is available to move existing demo/blob state into SQL tables:

- script: `backend/app/scripts/import_customers_from_transitional.py`
- entry point: `CustomerRepository.import_transitional_state_to_db(...)`

This allows gradual migration while preserving the current demo endpoint compatibility.

### Milestone 5 Safety Guarantees (Still Active)

- Optimistic concurrency on shared demo writes remains active on `/api/v1/demo/customers-db`.
- History remains centralized and available through `GET /api/v1/customers/{customer_id}/history`.
- Frontend API mode now shows explicit stale-write conflict notices, reloads latest shared state after conflict, and retries via user-driven resave flow.
- Frontend local mode continues to use local storage and local history snapshots without backend conflict semantics.

### Object Storage Foundation (Phase 6)

- Storage abstraction is now defined in backend services (local + Azure Blob backends).
- Customer document payloads are designed for object storage, while SQL stores metadata pointers only.
- Detailed design and rollout plan: `docs/architecture/object-storage.md`.

## Milestone 7: Quality Foundation

### Quality goals

- Add high-risk-path tests for customer and VAT behavior.
- Add practical lint/format checks for a solo team.
- Add CI checks that keep the main branch reviewable.

### Testing baseline

Backend (`pytest`):

- customer create/update contract behavior
- stale-write conflict response (`customers_db_conflict`)
- history generation after create/update
- VAT route basic behavior (`/api/v1/vat/info`, `/api/v1/vat/status` stubbed upstream path)

Frontend (`vitest`):

- customer form mapper behavior
- customer save validation
- customer repository delegation behavior

### Lint/format baseline

- Ruff static checks (`E/F`) for backend code quality.
- Black format checks for backend test surface (phase-scoped, low-noise baseline).
- Frontend `typecheck`, `test:run`, and `build` scripts standardized in `package.json`.

### CI foundation

Workflow: `.github/workflows/quality-foundation.yml`

- frontend job: install, typecheck, tests, build
- backend job: install, ruff, black check, pytest

This keeps quality gates realistic for a single-engineer team without forcing a massive formatting refactor.

## Milestone 8: Deployment Foundation (Vercel + Render)

### Runtime topology

- Frontend SPA deploys to Vercel.
- FastAPI backend deploys to Render.
- PostgreSQL runs on Render managed Postgres (or compatible managed Postgres).

### Production guardrails

- Backend startup checks validate runtime configuration and expose readiness details.
- `APP_ENV=production` enables strict startup checks (CORS, storage/provider, DB mode/connectivity).
- Render-style `postgres://` URLs are normalized to SQLAlchemy `postgresql+psycopg://` at runtime.

### Operations references

- Deployment runbook: `docs/operations/deployment-vercel-render.md`
- Environment variables: `docs/operations/env-vars.md`
- Demo release checklist: `docs/operations/release-checklist-manager-demo.md`
- Deployed smoke checklist: `docs/operations/smoke-checklist-deployed.md`

## Post-Deployment Hardening: Azure Production Path

### Objective

- Keep current Vercel + Render deployment stable.
- Add a credible, enterprise-grade Azure production path without forced immediate migration.

### Architectural direction

- Frontend: Azure Static Web Apps (or equivalent Azure frontend hosting)
- Backend: Azure App Service or Azure Container Apps
- Database: Azure Database for PostgreSQL
- Storage: Azure Blob Storage (private containers)
- Secrets: Azure Key Vault
- Observability: Application Insights + OpenTelemetry-compatible hooks

### References

- Azure production architecture: `docs/architecture/azure-production-path.md`
- Current vs future deployment mapping: `docs/operations/deployment-current-vs-azure.md`
- Infra starter skeleton: `infra/azure/`
