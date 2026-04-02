# Weekly Progress

Use this file for milestone-level progress reporting and manager updates.

## 2026-04-02 - Phase 0 Baseline Started

### Completed

- Added root `README.md` with local setup, quality gates, and deployment references.
- Added `docs/operations/agent-playbook.md` as milestone execution source of truth.
- Added docs scaffold:
  - `docs/architecture/overview.md`
  - `docs/architecture/decisions/ADR-001-tech-stack.md`
  - `docs/architecture/decisions/ADR-002-customer-api.md`
  - `docs/api/customer-api.md`
  - `docs/api/vat-api.md`
  - `docs/product/customer-flow.md`
  - `docs/operations/deployment-vercel-render.md`
  - `docs/operations/env-vars.md`
  - `docs/operations/smoke-checklist.md`
- Improved `.gitignore` for runtime artifacts, caches, logs, and local env files.

### Untrack Candidates (if tracked in future)

- `frontend/node_modules/`
- `frontend/dist/`
- `backend/.venv/`
- `backend/__pycache__/`
- `*.db`, `*.sqlite`, `*.sqlite3`
- `*.log`, `.cursor/debug-*.log`

### Risks / Notes

- Frontend and backend currently include active in-progress feature edits in customer files; Phase 0 did not modify business logic.
- Backend test suite is not yet present as a complete quality gate; use smoke start + health endpoint for now.

### Manager Demo Note

- What changed: project now has an execution playbook, baseline architecture/API/ops docs, and standardized smoke checklist.
- Risk reduced: lower execution ambiguity and cleaner phase-by-phase delivery control.
- Next milestone: Phase 1A customer UI stabilization (duplicate shell/header/tab and modal behavior fixes).

## 2026-04-03 — Phase 1A (slice 1): duplicate customer modal chrome

### Completed

- **Root cause:** `CustomersPage` mounted two `NewCustomerModal` instances (edit + create). If both `selectedRowId` and `showAddCustomer` were true, both overlays could render at `z-50`, producing stacked modal chrome (duplicate shell/header/tabs) and confusing overlay behavior.
- **Fix:** Render the edit modal only when `!showAddCustomer`; call `setShowAddCustomer(false)` when opening a row so the create flow cannot overlap an active edit selection path.
- **Files:** `frontend/src/pages/CustomersPage.tsx`

### Verification

- Frontend gate: `npm run build` (passed).
- Backend gate: run `uvicorn main:app --host 127.0.0.1 --port 8000` from `backend/`, then `GET /api/health` (not run in agent session if server stopped).

### Manual smoke (owner)

- [ ] Customers page → select row → edit modal: single header/tab row.
- [ ] Open “Add customer” with no row conflict: only create modal.
- [ ] After create save: returns to edit for new customer; no double stack.
- [ ] Documents overlay from edit: still above customer modal (`z-[60]`).
- [ ] VAT / save / history unchanged.

### Leftovers / next

- Full Phase 1A may still need scroll/sticky tweaks inside `NewCustomerModal` if reported on devices; no redesign in this slice.

