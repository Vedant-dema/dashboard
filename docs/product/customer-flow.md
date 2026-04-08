# Customer flow (product notes)

## Edit / save

- Customer master data is edited in the unified customer modal (create and edit). Saving merges the payload into the stored customer record and appends history for tracked fields.
- **Website (`internet_adr`)**: Users type a URL as text; the UI shows a **safe http(s) link** in the same block when the value is non-empty. The stored string is not rewritten on input.
- **Removed fields**: Industry registration number (`branchen_nr`) and tax country/type code (`tax_country_type_code`) are no longer collected. Loading an existing customer clears them in the form so the **next save** removes them from persistence. They are **not** included in future history diffs.

## Documents (customer files)

- Files can be added via **Choose file** or **drag and drop** on the dashed upload area (same size limits and handler as before).
- Drop behavior is protected against browser default file-open/navigation while the document modal is open.
- Multi-file drop is supported; oversized files are skipped with user feedback.

## Risk analysis (document dates)

- **Ausweis gültig bis** (`ausw_gueltig_bis`) uses **expiry proximity** (expired / critical / warning / valid / missing) and is the **only** row that drives **list and modal risk alerts**.
- Other document date rows show **Recorded** when a date is present, **Not entered** when empty (no expiry-based colouring).
- **ID holder name** (`ausw_gueltig_bis_owner_name`) is optional and only applies to the Ausweis row; it appears under the date in read mode.

## Milestone 7 quality gates for customer flow

- Frontend mapper/validation/repository tests cover core customer form behaviors.
- Backend customer API tests cover create/update/history/conflict paths.
- CI verifies customer flow changes with typecheck/tests/build and backend lint/tests before merge.
