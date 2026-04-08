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
