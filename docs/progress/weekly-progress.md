# Weekly Progress

## 2026-04-07 - Phase 3 Backend Structure v2

### Completed

- Split backend from monolithic `backend/main.py` into modular `backend/app` layers.
- Added thin endpoint modules for:
  - health
  - vat
  - customers
- Added schema, service, and repository layers.
- Preserved VAT/VIES behavior by delegating VAT calls to legacy logic.
- Kept backward-compatible startup path:
  - `uvicorn main:app`
  - `uvicorn app.main:app`

### Risk Reduced

- Lower coupling and clearer backend ownership boundaries.
- Better readiness for upcoming customer REST hardening and PostgreSQL migration phases.

### Remaining Risk

- Legacy module is still large and mounted for compatibility.
- Full extraction of non-customer legacy endpoints will continue in future milestones.

### Next Recommended Branch

- `phase-4-customer-rest`

