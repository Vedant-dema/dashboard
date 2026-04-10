# Weekly Progress

## 2026-04-10 - Customer UI Phase 2C (manager layout)

### Delivered

- Compact customer summary integrated into the modal header; removed the separate Customer 360 overview card.
- Documents action moved next to the tab row (edit mode); appointments moved under the contact column.
- Customer & Address tab reorganized into Kundenart | Stammdaten | Kontaktperson | Beziehungen & Risikoanalyse.
- New tab **Beziehungen zu FZG'e** with non-breaking placeholder content.
- i18n keys for new labels (de / en / fr); product/architecture docs updated.
- Restored **timetable** TypeScript surface from `feature/purchase-timetable-ui` so `npm run build` matches the checked-in timetable pages (branch had been in a broken intermediate state).

### Verification

- `npm run build` (frontend) — pass.
- `GET /api/health` — not run (API not started in this session); run when backend is up.

## 2026-04-08 - Milestone 7 (quality foundation)

### Delivered

- Added high-value backend tests for:
  - customer create/update behavior
  - stale-write conflict response
  - history creation
  - VAT route basic behavior
- Added frontend unit tests for:
  - customer mapper logic
  - customer validation
  - repository delegation behavior
- Added frontend scripts:
  - `typecheck`
  - `test:run`
  - updated `build` to include typecheck
- Added backend quality foundation files:
  - `requirements-dev.txt` (ruff + black)
  - `pyproject.toml` (ruff/black config)
  - `pytest.ini`
- Added CI workflow: `.github/workflows/quality-foundation.yml`
- Completed essential docs refresh (README, architecture, ADRs, API, deployment, env vars).

### Verification

- Frontend:
  - `npm run typecheck` - pass
  - `npm run test:run` - pass
  - `npm run build` - pass
- Backend (Python 3.12 isolated env):
  - `ruff check app main.py` - pass
  - `black --check app/tests` - pass
  - `pytest -p no:cacheprovider --basetemp=.pytest-sandbox/tmp` - pass

## 2026-04-08 - Customer UI (phase-6-merge-fixes)

### Delivered

- Website field: safe clickable http(s) link in the same block as the input (`safeWebsiteHref` helper).
- Removed Industry reg. no. and Tax country/type code from the customer UI; form load forces empty so the next save clears stored values; dropped these keys from customer history field tracking.
- Customer documents: drag-and-drop on the existing upload control with a light drag-over state.
- Risk analysis: only **Ausweis gültig bis** drives expiry alerts; other date rows use a simple Recorded / Not entered status; optional `ausw_gueltig_bis_owner_name` on the Ausweis row.

### Verification

- `npm run build` (frontend) — pass.
- `GET /api/health` — pass (local smoke).

## 2026-04-07 - Milestone 6

### Delivered

- Added SQLAlchemy 2.0 persistence foundation for customer domain.
- Added Alembic configuration and initial customer-domain migration.
- Added customer-domain SQL models and modular DB session setup.
- Rebuilt `CustomerRepository` to support dual mode:
  - transitional demo/blob mode
  - DB-backed mode (`CUSTOMERS_STORE_MODE=db`)
- Updated history repository to read from official DB audit table in DB mode.
- Added import path from transitional state into SQL tables:
  - `backend/app/scripts/import_customers_from_transitional.py`
- Removed legacy duplicate history route conflict so `/api/v1/customers/{id}/history` is served by the modular repository path.

### Outcome

- Customer REST endpoints can remain stable while persistence transitions to PostgreSQL.
- Transitional compatibility remains available during migration.
- Backend now has a safe path to switch customer APIs from blob-backed to DB-backed storage.

### Recommended next branch

- `phase-7-quality-docs-ci`

## 2026-04-07 - Milestone 5

### Delivered

- Added optimistic concurrency control for shared customer writes.
- Added stale-write conflict response (`409 customers_db_conflict`).
- Added centralized backend audit/history generation with field-level changes.
- Added official history endpoint for customer timeline:
  - `GET /api/v1/customers/{customer_id}/history`
- Updated frontend to:
  - send `expected_updated_at`
  - show a user-friendly conflict message
  - reload latest data on conflict
  - use official history endpoint in API mode
- Documented error shape and concurrency behavior.

### Outcome

- Silent overwrites are prevented.
- History is generated from one authoritative backend mechanism.
- History tab data is more trustworthy in API mode.
