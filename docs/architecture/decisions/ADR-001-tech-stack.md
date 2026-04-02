# ADR-001: Core Tech Stack

- Status: Accepted
- Date: 2026-04-02

## Context

DEMA must evolve into an industry-standard web platform while keeping rapid demo velocity for leadership updates.

## Decision

- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI
- Validation and API schemas: Pydantic v2
- ORM and migrations: SQLAlchemy 2.0 + Alembic
- Database target: PostgreSQL
- Backend tests: pytest
- Backend quality tooling: Ruff + Black
- Temporary deployment: Vercel (frontend) + Render (backend)

## Consequences

- Enables fast current progress with clear migration path to stronger persistence and cloud ops.
- Supports incremental refactor from monolithic files to layered service/repository architecture.
- Keeps deployment simple now while preserving future production portability.

