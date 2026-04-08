# ADR-0002: Customer API Contract and Concurrency Direction

- Status: Accepted
- Date: 2026-04-08
- Owner: DEMA Engineering

## Context

Customer data currently supports transitional and SQL-backed modes. The project requires stable API
contracts across both modes, plus safe multi-user write behavior during shared/demo operation.

## Decision

Adopt and maintain the customer API contract under `/api/v1/customers` for list/detail/create/patch/history/wash-profile.

Keep the transitional shared-state endpoint (`/api/v1/demo/customers-db`) during migration, with:

- optimistic concurrency using `expected_updated_at`
- stale-write response `409` with `detail.code = customers_db_conflict`
- frontend conflict resolution path that reloads latest shared state before user resave

In API mode, the customer history UI must prefer the official backend history endpoint:

- `GET /api/v1/customers/{customer_id}/history`

## Rationale

- Stable contracts allow frontend behavior to remain consistent while persistence mode evolves.
- Conflict signaling prevents silent overwrites and supports auditable user actions.
- Backend-owned history endpoint is the authoritative source for timeline data.

## Consequences

- Transitional demo endpoint remains temporarily and must be retired once full DB-native flows are complete.
- Clients must handle `customers_db_conflict` explicitly.
- API docs and tests must stay in sync with these guarantees.
