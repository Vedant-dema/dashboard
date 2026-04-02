# ADR-002: Customer API Strategy

- Status: Accepted
- Date: 2026-04-02

## Context

Customer UI logic is tightly coupled to local/demo storage behavior. This slows refactoring and blocks safe backend evolution.

## Decision

- Introduce a frontend customer repository abstraction first.
- Define resource-style customer endpoints in backend before full DB migration.
- Keep transitional storage compatibility while stabilizing API contracts.
- Use optimistic concurrency and centralized audit history as mandatory data safety controls.

Planned endpoint set:

- `GET /api/v1/customers`
- `GET /api/v1/customers/{id}`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/{id}`
- `GET /api/v1/customers/{id}/history`
- `GET /api/v1/customers/{id}/wash-profile`

## Consequences

- Frontend decouples from storage implementation details.
- Backend contracts stabilize before PostgreSQL cutover.
- History tab can rely on one official mechanism instead of scattered UI diffs.

