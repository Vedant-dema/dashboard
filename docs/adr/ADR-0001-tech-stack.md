# ADR-0001: DEMA Core Technology Stack

- Status: Accepted
- Date: 2026-04-08
- Owner: DEMA Engineering

## Context

DEMA needs a stack that is easy to operate for a solo engineering team while still supporting
enterprise-facing requirements (auditability, API evolution, object storage, CI quality gates).

## Decision

Use the following core stack:

- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI
- Persistence: PostgreSQL target with SQLite transitional/local mode
- Migrations: Alembic
- Test baseline:
  - backend: pytest
  - frontend: vitest
- Backend lint/format baseline:
  - Ruff
  - Black
- CI: GitHub Actions workflow with frontend + backend quality jobs

## Rationale

- Fast iteration speed and low operational overhead.
- Strong ecosystem support for typed APIs and incremental architecture.
- Suitable for phased migration from transitional demo/blob mode to SQL-backed production mode.
- Quality tools are practical to run locally and in CI without heavy platform investment.

## Consequences

- Existing legacy/runtime coupling remains during transition and must be reduced in later milestones.
- Black full-repo enforcement is intentionally deferred to avoid high-noise churn; current scope focuses
  on quality-critical paths.
- Team can add stricter lint/format rules over time as technical debt is reduced.
