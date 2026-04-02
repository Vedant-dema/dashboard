# Customer Flow

This document captures the baseline customer workflow that must be preserved while refactoring, and the **Phase 1B Customer 360** layout expectations.

## Core User Flow

1. Open customers page.
2. Open create or edit customer modal (`NewCustomerModal`).
3. Enter or update customer master data (and addresses, contacts, operational tabs as needed).
4. Optionally run VAT validation (dedicated tab; summary in edit reflects last check when available).
5. Save customer.
6. Review history and related sections.
7. Reload and confirm data persistence behavior.

## Phase 1B — Customer 360 (edit mode)

The same modal shell is used for create and edit. **Edit mode** adds a **summary strip** under the title bar (above tabs) for at-a-glance context:

| Area | Source / meaning |
|------|------------------|
| Customer number | From loaded record |
| Status | Active / inactive / blocked |
| VAT | Derived from last VIES check result in session (valid / invalid / not verified) |
| Profile completion | Heuristic % from filled core fields |
| Risk | Flags: blocked account, payment blocked, incomplete billing (e.g. missing IBAN+BIC), else “no flags” |
| Last saved | Timestamp from customer record when present |

**Grouping (Customer & Address tab):**

- **Master data** — company identity, type, status, industry, names, acquisition, profile vs operational notes.
- **Addresses & tax** — repeatable address blocks, tax identifiers, website on address.
- **Contacts** — repeatable contact blocks.
- **Related & operational** (edit column) — existing side content: relationships, appointments, risk-oriented widgets; unchanged capabilities, clearer heading.

**History tab:**

- Intro copy explains the list is an **activity timeline** (newest first).
- Each change row uses a readable grid: field name, before, after (responsive labels on small screens).

**Save / dirty / errors:**

- **Unsaved changes** — footer highlights when the form differs from the baseline captured on open (edit only).
- **Validation** — e.g. missing required company name shows an inline message above the action row (no blocking `alert` for that path).
- **Save** — existing save behavior preserved; user should see clear distinction between “dirty”, “error”, and “saved”.

## Non-Negotiable Behaviors

- create customer works
- edit customer works
- VAT flow works
- save flow is reliable
- history remains visible
- no duplicate modal shell/header/tab behavior (Phase 1A)

## UX Direction

- Phase 1A: stabilization only
- Phase 1B: hierarchy and Customer 360 clarity improvements (summary strip, grouping, timeline, dirty/error affordances) without flashy chrome

## Implementation Note

Primary UI: `frontend/src/components/NewCustomerModal.tsx`.  
Modal exclusivity on the list page: `frontend/src/pages/CustomersPage.tsx` (edit vs create overlap guard).

## Test Source

- Manual smoke checklist: `docs/operations/smoke-checklist.md`
