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

## 2026-04-01 — Phase 1B: Customer 360 modal redesign

### Completed

- **Customer 360 edit summary strip:** customer number, lifecycle status, VAT check snapshot, profile completion %, risk hints (blocked / payment / billing incomplete), last-saved line.
- **Clearer hierarchy** on Customer & Address: section headings for master data, addresses & tax, contacts; edit column labeled “Related & operational” with short hints.
- **History tab** framed as an activity timeline; change rows use a responsive before/after grid.
- **Dirty / validation UX:** baseline-based dirty state in edit mode; inline footer messaging for validation instead of a blocking alert for missing company name; distinct styling for unsaved vs error rows.
- **Docs:** `docs/product/customer-flow.md`, `docs/architecture/overview.md` (Customer UI subsection), this weekly entry.
- **i18n:** `customer360*` and `historyTimeline*` / `historyCol*` keys in `LanguageContext.tsx` (de / en / fr).

### Files

- `frontend/src/components/NewCustomerModal.tsx` — layout, summary, dirty baseline, history grid, footer states.
- `frontend/src/contexts/LanguageContext.tsx` — translation keys for new copy (if not already present on branch).

### Verification

- Frontend: `npm run build` (passed in agent session).
- Backend: no `pytest` suite yet; `uvicorn` + `GET http://127.0.0.1:8765/api/health` returned `{"status":"ok",...}`.

### Manual smoke (owner)

- [ ] Edit customer: summary strip matches record; switching tabs does not duplicate chrome.
- [ ] Change a field: footer shows unsaved state; save clears it; reload persists.
- [ ] Clear company name and save: inline error visible; no duplicate modals.
- [ ] VAT tab: check still works; summary VAT chip reflects outcome when applicable.
- [ ] History: newest first; before/after readable on narrow and wide viewports.
- [ ] Create flow: no summary strip regression; save still works.

### Risks / follow-ups

- Risk and completion % are **heuristic** (UI-only); tune with product if false positives.
- `dirtyBaselineRef` reset on close/open — watch for edge cases if `open` toggles without unmount.
- **Next milestone:** Phase 2 (frontend architecture / repository layer) per `docs/architecture/overview.md`.

## 2026-04-01 — Phase 2 (slice): frontend customer repository & feature folder

### Completed

- **Customer feature module** under `frontend/src/features/customers/`: `customerRepository` facade over `kundenStore`, form/VAT mappers, `customerValidation`, `useCustomerForm`, persisted/API type aliases, `CustomerHistoryTimeline` (modal history tab composition).
- **Customers page** uses `customerRepository` for load/save, CRUD, appointments, documents, relationships, risk, and expiry helpers instead of calling store functions directly.
- **New customer modal** imports repository-exported DTO types; history tab delegates to `CustomerHistoryTimeline` (removes duplicated inline timeline JSX and duplicate `formatHistoryValueDisplay`).
- **Docs:** `docs/architecture/overview.md` (Phase 2 subsection), this weekly entry; feature log **FEATURE-140**.

### Files (representative)

- `frontend/src/features/customers/**` — new/ongoing feature layer
- `frontend/src/pages/CustomersPage.tsx` — repository-first data access
- `frontend/src/components/NewCustomerModal.tsx` — repository types + history component

### Verification

- Frontend gate: `npm run build` (run after pull; required for phase close).
- Backend gate: `uvicorn main:app --host 127.0.0.1 --port 8000` from `backend/`, then `GET /api/health` (or project’s configured port).

### Manual smoke (owner)

- [ ] Customers list loads; search/sort unchanged.
- [ ] Open edit: save, delete/restore flows if used; documents/appointments/relationships still persist.
- [ ] History tab: same timeline content and i18n as before Phase 2 refactor.
- [ ] Create customer: save and handoff to edit still work.
- [ ] VAT tab: check still runs; no import/runtime errors in console.

### Risks / follow-ups

- **Large modal file:** Phase 2 reduces duplication (history) and store coupling; further splits (tabs/sections into feature components) are a good **Phase 2b** or **Phase 3** frontend slice.
- **Repository vs store:** Other widgets still importing `kundenStore` directly can be migrated incrementally to `customerRepository` for consistency.
- **Next milestone:** Phase 3 (Python backend restructuring) per architecture map, or a small Phase 2b to wire `useCustomerForm` + mapper end-to-end in the modal.

