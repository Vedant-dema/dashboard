# Customer domain — context hub (for engineers and coding agents)

This folder is the **curated entry point** for the DEMA customer module. Read these docs **in order** before changing customer UI, API, or persistence. Do not paste large source files into prompts; use paths from [module-map.md](module-map.md) and contracts from [contracts.md](contracts.md).

## Mandatory reading order

1. **This file** — boundaries and golden rules.
2. [contracts.md](contracts.md) — HTTP endpoints, errors, persistence matrix.
3. [glossary.md](glossary.md) — domain terms and JSON field names.
4. [module-map.md](module-map.md) — where logic lives (frontend/backend paths).
5. [capabilities.md](capabilities.md) — what is implemented vs deferred (avoid inventing features).
6. [ADR-0002-customer-api.md](../../adr/ADR-0002-customer-api.md) — API contract and concurrency decisions.
7. [customer-api.md](../../api/customer-api.md) — detailed API examples and history shape.
8. [customer-flow.md](../../product/customer-flow.md) — product-level UX and field rules.
9. [CustomersPage-Service-Spec.md](../../Detailed%20report/CustomersPage-Service-Spec.md) — full narrative spec (deep dive).
10. [changelog-bridge.md](changelog-bridge.md) — how to trace feature history via FEATURE-LOG.
11. [openapi-export.md](openapi-export.md) — optional OpenAPI JSON snapshot (local use).

## Golden rules

- **API vs local:** Frontend can run in **`VITE_CUSTOMERS_SOURCE=api`** (shared backend / demo blob) or local browser persistence. Behavior and URLs differ; see [contracts.md](contracts.md).
- **Authoritative history in API mode:** Use `GET /api/v1/customers/{id}/history`, not reconstructed local-only history when the API is available ([ADR-0002](../../adr/ADR-0002-customer-api.md)).
- **Stale writes (demo shared state):** `PUT /api/v1/demo/customers-db` uses optimistic concurrency; **`409`** with `detail.code === "customers_db_conflict"` requires a reload/resave flow.
- **Layering:** HTTP handlers call services; services call repositories; **no** business logic leaking into routers ([`.cursor/rules/dema-architecture.mdc`](../../../.cursor/rules/dema-architecture.mdc)).
- **i18n:** All user-visible UI strings go through `t()` and keys in `LanguageContext`; English fallbacks only ([`.cursor/rules/i18n-always.mdc`](../../../.cursor/rules/i18n-always.mdc)).
- **VAT:** Customer onboarding uses `POST /api/v1/vat/check`; timeouts and structured errors are documented in [vat-api.md](../../api/vat-api.md) and [contracts.md](contracts.md).

## Out of scope (do not assume without checking code)

- Full relational modeling of every sub-entity in Postgres for all features; some data remains JSON/blob transitional.
- WebSocket/SSE live multi-user sync (roadmap / service spec “target”).
- Customer document **file** APIs may evolve with storage provider work; see [object-storage.md](../../architecture/object-storage.md).
- Role-based department scoping beyond current route/context patterns.

## Machine-readable API contract (optional)

With the backend running locally:

```bash
curl -s http://127.0.0.1:8010/openapi.json
```

Use this JSON for tools that consume OpenAPI. Regenerate or snapshot when shipping breaking API changes; avoid committing secrets or environment-specific URLs into the repo.

Step-by-step: [openapi-export.md](openapi-export.md).

## Related architecture

- [overview.md](../../architecture/overview.md) — milestones (persistence, quality, deployment).
- [env-vars.md](../../operations/env-vars.md) — full environment matrix.
