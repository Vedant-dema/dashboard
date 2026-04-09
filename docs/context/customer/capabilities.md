# Customer module — capabilities (implemented vs deferred)

Use this file to **avoid inventing** features when assisting with design or code. “Implemented” means present in the repo in some form; “deferred” matches gaps called out in the deep service spec target state unless code proves otherwise.

## Implemented (current repository)

- **Customer list** with search, filters, department route context (`CustomersPage`).
- **Detail drawer** with tabs; edit opens unified create/edit modal.
- **Create/edit modal** (`NewCustomerModal`): VAT tab with VIES check, Kunde/Adresse, Art/Buchungskonto, Waschanlage (when applicable), Zusatz.
- **Dual persistence:** browser `localStorage` customer DB and optional **API mode** (`VITE_CUSTOMERS_SOURCE`); shared demo blob via `GET/PUT /api/v1/demo/customers-db`.
- **REST v1 customers** CRUD + history + wash profile (`/api/v1/customers/...`) with `demo_blob` / `db` backend modes.
- **Optimistic concurrency** on demo shared PUT with **`409` / `customers_db_conflict`** handling in the client repository layer.
- **History:** tracked-field diffs in local mode; API mode should prefer `GET /api/v1/customers/{id}/history`.
- **Documents:** upload (file + drag/drop), size limits, metadata in customer state; object-storage architecture documented separately.
- **Risk / Unterlagen UI:** expiry-style alerts **only** for `ausw_gueltig_bis`; other dates as “Recorded” / “Not entered”; optional `ausw_gueltig_bis_owner_name`.
- **Website field:** safe external link for `internet_adr` (http/https only).
- **Removed fields:** `branchen_nr`, `tax_country_type_code` no longer in UI; cleared on load/save path for legacy data.
- **Relationships** between customers (bidirectional mirror rows in store).
- **Appointments** on customer record (local/API as wired).
- **Duplicate detection** page reusing store (`DoppelteKundenPage`).
- **Tests:** backend customer smoke + conflict; frontend vitest for mapper/validation/repository (see CI workflow).

## Deferred / roadmap (do not assume shipped)

- Full **real-time** multi-user sync (WebSocket/SSE) for all fields.
- **Strict RBAC** per department beyond current routing/context patterns.
- **Every** sub-entity split into normalized relational tables for all features (some JSON/transitional shapes remain).
- **Customer document** download/upload via finalized production object-storage API surface for all deploys (foundation exists; wire per env).
- Automated **retention lifecycle** for documents (phase-style roadmap items in older playbooks—verify `docs/operations/agent-playbook.md` and HLD for current phase goals).

## Verification

After substantive changes, run:

- Frontend: `npm run typecheck`, `npm run test:run`, `npm run build`
- Backend: `pytest` (at least `app/tests/test_customers_api_smoke.py`, `test_health.py`)
