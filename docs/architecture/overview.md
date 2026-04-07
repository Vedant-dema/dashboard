# Architecture Overview

## Milestone 5: Data Safety + Official History

### Shared Customer Write Path

- Frontend still writes transitional state through `/api/v1/demo/customers-db`.
- Backend now enforces optimistic concurrency using `expected_updated_at`.
- Stale updates are rejected with `409 customers_db_conflict`.

### Canonical Audit Mechanism

Customer history is now generated in one backend mechanism.

For each customer write, backend computes field-level diffs and stores:

- entity type
- entity id
- field
- old value
- new value
- changed by
- changed at
- source

### History Read Path

- Frontend History tab uses official endpoint in API mode:
  - `GET /api/v1/customers/{customer_id}/history`
- Local fallback remains for non-API mode.

