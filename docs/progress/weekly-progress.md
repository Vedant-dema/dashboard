# Weekly Progress

## 2026-04-07 — Phase 4 (Customer REST on Transitional Store)

### Completed

- Added modular backend source files under `backend/app/**`.
- Implemented first customer REST endpoints:
  - `GET /api/v1/customers`
  - `GET /api/v1/customers/{id}`
  - `POST /api/v1/customers`
  - `PATCH /api/v1/customers/{id}`
  - `GET /api/v1/customers/{id}/history`
  - `GET /api/v1/customers/{id}/wash-profile`
- Added service/repository separation for customer and history flows.
- Kept `/api/v1/demo/customers-db` compatibility path untouched.
- Added docs:
  - `docs/api/customer-api.md`
  - `docs/architecture/overview.md`
  - this weekly progress update

### Verification Focus

- Backend startup with `uvicorn app.main:app`
- `GET /api/health`
- Endpoint sanity checks for new customer routes
- Frontend build check (`npm run build`)

### Notes

- Persistence remains transitional by design for this phase.
- PostgreSQL migration is planned for Phase 6.

### Next Branch Recommendation

- `phase-5-concurrency-audit`

