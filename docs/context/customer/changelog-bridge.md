# Customer module — changelog bridge

Feature-level history is **not** duplicated here. Use the project feature log as the audit trail for what shipped and when.

## Primary index

- **[FEATURE-LOG.md](../../FEATURE-LOG.md)** — master table and links to daily logs under `docs/feature-logs/`.

## How to find customer-related work

In `FEATURE-LOG.md` (and daily files), search keywords:

- `customer`, `customers`, `Kunden`, `kunden`
- `VAT`, `VIES`, `vat`
- `NewCustomerModal`, `CustomersPage`
- `history`, `conflict`, `demo/customers-db`
- `Waschanlage`, `wash`, `risk`, `Unterlage`, `document`

Each entry lists touched paths, APIs, and i18n keys—useful for agents without opening huge diffs.

## Cursor / repo rules

- Feature documentation rule: `.cursor/rules/feature-docs-always.mdc` (FEATURE-NNN template).
- Architecture: `.cursor/rules/dema-architecture.mdc`.

## Last reviewed

- **Date:** 2026-04-09 (context pack created). Update this line when you materially change [capabilities.md](capabilities.md) or [contracts.md](contracts.md).
