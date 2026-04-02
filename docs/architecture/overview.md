# DEMA Architecture Overview

## Purpose

This document describes the current architecture baseline and the target direction for milestone-based modernization.

## Current Runtime Shape

- Frontend (`frontend/`): React + TypeScript + Vite SPA
- Backend (`backend/main.py`): FastAPI service with VAT/VIES and demo customer state support
- Persistence (current): local storage + demo shared state path
- Deployment (current): Vercel frontend + Render backend

## Target Runtime Shape

- Frontend:
  - feature-based modules
  - repository layer for customer data access
  - clear separation between UI, mappers, validators, and form hooks
- Backend:
  - `app/main.py`, `api`, `schemas`, `services`, `repositories`, `models`, `core`
  - resource-style customer endpoints
  - centralized history/audit generation
  - optimistic concurrency control
- Data:
  - PostgreSQL + SQLAlchemy 2.0 + Alembic
  - customer domain migrated first

## Architectural Principles

- Keep app runnable after every milestone.
- Prefer safe, incremental refactors over rewrites.
- Keep routes thin and push logic to services/repositories.
- Keep business logic out of large JSX render blocks.
- Keep docs and quality gates in the same milestone as code changes.

## Milestone Map

1. Phase 0: Hygiene and docs baseline
2. Phase 1A: UI stabilization
3. Phase 1B: UI redesign
4. Phase 2: Frontend architecture and repository layer
5. Phase 3: Python backend restructuring
6. Phase 4: Customer REST API
7. Phase 5: Concurrency and audit/history
8. Phase 6: PostgreSQL migration
9. Phase 7: Tests, linting, docs, CI
10. Phase 8: Deployment to Vercel + Render
11. Phase 9: Optional AI v1

## Source Of Truth

- Execution process: `docs/operations/agent-playbook.md`
- Environment variables: `docs/operations/env-vars.md`
- Customer flow: `docs/product/customer-flow.md`

