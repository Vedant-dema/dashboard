# Customer domain — API and persistence contracts

Compact reference for agents and reviewers. Examples and narrative live in [customer-api.md](../../api/customer-api.md).

## Official customer API (`/api/v1/customers`)

Base path: `/api/v1/customers` (modular router). Demo key header may apply when backend `DEMO_API_KEY` is set: `x-demo-key`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/customers` | List customers (`include_deleted` query optional) |
| GET | `/api/v1/customers/{customer_id}` | Customer detail |
| POST | `/api/v1/customers` | Create |
| PATCH | `/api/v1/customers/{customer_id}` | Partial update |
| GET | `/api/v1/customers/{customer_id}/history` | **Authoritative** history in API mode |
| GET | `/api/v1/customers/{customer_id}/wash-profile` | Wash profile |

Backend store mode: `CUSTOMERS_STORE_MODE=demo_blob|db` (see [env-vars.md](../../operations/env-vars.md)).

## Transitional demo shared state

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/demo/customers-db` | Read full shared JSON blob + `updated_at` |
| PUT | `/api/v1/demo/customers-db` | Write shared blob; supports optimistic concurrency |

### Conflict contract (`PUT /api/v1/demo/customers-db`)

| HTTP | Condition |
|------|------------|
| 409 | Stale write: body should include `detail` with `code: "customers_db_conflict"` |

Clients must reload latest state and let the user retry.

## VAT (customer onboarding)

Used heavily from **New customer** flow (frontend `fetch` to API).

| Method | Path | Notes |
|--------|------|------|
| POST | `/api/v1/vat/check` | Live check; hard asyncio deadline ≈ `VIES_CHECK_ENDPOINT_MAX_TOTAL_SEC + 1.5s` → **504** `vat_check_deadline_exceeded` |
| GET | `/api/v1/vat/info` | Service metadata |
| GET | `/api/v1/vat/status` | VIES status proxy |
| POST | `/api/v1/vat/check-test` | Test service |

Structured error bodies often use `detail: { code, message }` (FastAPI). See [vat-api.md](../../api/vat-api.md).

## Frontend persistence matrix

| `VITE_CUSTOMERS_SOURCE` | Behavior (simplified) |
|-------------------------|----------------------|
| `api` (or equivalent flag in your env) | Uses backend: REST v1 + demo blob PUT/GET as wired in repository |
| unset / local default | Browser `localStorage` customer DB; no shared multi-user sync |

Exact wiring: [customerRepository.ts](../../../frontend/src/features/customers/repository/customerRepository.ts).

## Backend persistence matrix

| `CUSTOMERS_STORE_MODE` | Behavior (simplified) |
|------------------------|----------------------|
| `demo_blob` | Transitional blob / shared demo paths |
| `db` | SQLAlchemy + Alembic customer tables |

## Health (ops)

| Path | Use |
|------|-----|
| GET `/api/health` | Liveness / summary |
| GET `/api/v1/health` | Includes `version: "v1"` |
| GET `/api/v1/ready` | **503** if startup checks fail |

## OpenAPI

Runtime contract: `GET /openapi.json` on the running app (same host/port as uvicorn). See [README.md](README.md#machine-readable-api-contract-optional).
