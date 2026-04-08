# Deployment Notes (Solo-Team Baseline)

## Target topology

- Frontend: static build (Vite) hosted on Vercel or equivalent CDN/static host
- Backend: FastAPI service hosted on Render/Railway or equivalent container platform
- Database: PostgreSQL (production target)
- Object storage: Azure Blob (production target), local storage for dev fallback

## Pre-deploy checklist

1. Frontend:
   - `npm run typecheck`
   - `npm run test:run`
   - `npm run build`
2. Backend:
   - `python -m ruff check app main.py`
   - `python -m black --check app/tests`
   - `python -m pytest -p no:cacheprovider --basetemp=.pytest-sandbox/tmp`
3. DB migration:
   - `alembic current`
   - `alembic heads`
   - `alembic upgrade head`

## Environment setup

- Define all required variables from `docs/operations/env-vars.md`.
- Set `CUSTOMERS_STORE_MODE=db` in production.
- Set a production `DATABASE_URL` (PostgreSQL).
- Keep object storage containers private and backend-managed.

## Release flow

1. Open PR with updated tests/docs and passing CI.
2. Validate `quality-foundation` workflow passes.
3. Merge to target branch.
4. Run migration on deployment environment.
5. Perform API smoke:
   - `/api/v1/health`
   - `/api/v1/customers`
   - `/api/v1/customers/{id}`
   - `/api/v1/customers/{id}/history`
   - `/api/v1/vat/info`

## Rollback

- Code rollback: revert release commit.
- DB rollback: Alembic downgrade only when migration is reversible and data-safe.
- Runtime fallback:
  - revert to prior image/build
  - keep `CUSTOMERS_STORE_MODE` consistent with active schema state
