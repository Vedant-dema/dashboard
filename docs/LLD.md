# DEMA Digital Core — Low-Level Design (LLD)

**Implementable contracts, patterns, and enforcement points**

| Field | Value |
|-------|--------|
| Document type | Low-Level Design |
| Companion | [HLD.md](./HLD.md) (technologies), [erd.md](./erd.md) (entity relationships), `database/schema.sql` (DDL) |
| Legacy | Microsoft Access + SQL Server (AS-IS); migration per Section 15 below |

**PDF export:** Use Pandoc (`pandoc docs/LLD.md -o LLD.pdf`) or a Markdown preview that supports Mermaid/code blocks.

---

## 1. LLD scope and normative rules

- **Normative:** **MUST** / **MUST NOT** are binding; **SHOULD** is strong guidance.
- **Single write path:** All authoritative mutations go through **Python API** → **PostgreSQL** (or Azure SQL per ADR). The React app **MUST NOT** connect to the database.
- **Business rules:** Encoded in **domain services** and **DB constraints**; HTTP routers **MUST** stay thin.
- **Contract first:** Behaviour is defined by **OpenAPI** + automated tests; UI conforms to the API.

---

## 2. REST conventions and HTTP semantics

| Method | Use | Idempotent | Typical success codes |
|--------|-----|------------|------------------------|
| `GET` | Read resource or collection | Yes | `200`, `304` |
| `POST` | Create or action (e.g. merge) | No* | `201`, `200`/`202` |
| `PUT` | Full replace (rare) | Yes | `200` |
| `PATCH` | Partial update | Yes* | `200` |
| `DELETE` | Delete / soft-delete | Yes | `204`, `200` |

\*Use **Idempotency-Key** (Section 6) for POST that must not double-create.

**Naming**

- Collections: `/api/v1/kunden`, `/api/v1/anfragen`.
- Sub-resources: `/api/v1/kunden/{id}/rollen`.
- Actions when needed: `POST /api/v1/kunden/{id}/merge`.

**Content**

- `Content-Type: application/json; charset=utf-8`.
- Timestamps in JSON: ISO-8601 **UTC** with `Z`. Database: `TIMESTAMPTZ`.

---

## 3. Pydantic DTO layers

| Layer | Naming | Purpose |
|-------|--------|---------|
| Create | `XCreate` | Insert-only fields; no server-generated ids |
| Update | `XUpdate` | PATCH; optional fields |
| Read | `XRead`, `XListItem` | Stable API shape for clients |
| Internal | SQLAlchemy models | Never serialized directly to HTTP |

Align `Field(max_length=…)` with `VARCHAR` in `database/schema.sql`. Use `StrEnum` aligned with `CHECK` / lookup tables.

---

## 4. Error model and HTTP status mapping

Example body (problem-detail style):

```json
{
  "type": "https://api.dema.example/problems/validation-error",
  "title": "Validation failed",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "One or more fields are invalid.",
  "instance": "/api/v1/kunden",
  "trace_id": "a1b2c3d4",
  "errors": [
    { "field": "firmenname", "message": "Must not be empty", "code": "blank" }
  ]
}
```

| HTTP | `code` examples | When |
|------|-----------------|------|
| `400` | `BAD_REQUEST`, `INVALID_QUERY` | Bad query/body |
| `401` | `UNAUTHORIZED` | Missing/invalid auth |
| `403` | `FORBIDDEN` | No permission |
| `404` | `NOT_FOUND` | Missing resource |
| `409` | `CONFLICT`, `OPTIMISTIC_LOCK`, `DUPLICATE_KUNDEN_NR` | Business conflict |
| `422` | `VALIDATION_ERROR` | Validation |
| `429` | `RATE_LIMITED` | Throttling |
| `500` | `INTERNAL_ERROR` | Server error (no stack in prod) |

Log `5xx` with stack + `trace_id`; clients never see stack traces in production.

---

## 5. Pagination, filtering, sorting

**Cursor pagination** (recommended for large tables):

- Query: `limit` (default 50, max 200), `cursor` (opaque).
- Response:

```json
{
  "items": [{ "id": 1, "kunden_nr": "K-001", "firmenname": "…" }],
  "next_cursor": "eyJpZCI6MTIzfQ==",
  "has_more": true
}
```

**Filtering:** e.g. `q`, `plz`, `ort`, `rolle`, `created_after` — each documented in OpenAPI.

**Sorting:** `sort=firmenname` or `sort=-created_at`. **Whitelist** sort fields to avoid injection.

---

## 6. Optimistic concurrency and idempotency

- **ETag / `If-Match`:** On conflict return `409` with `code: OPTIMISTIC_LOCK`.
- **Idempotency-Key:** UUID on critical `POST`; server stores `(key, route, user) → response` (Redis or DB, TTL ~24h).

---

## 7. OpenAPI, versioning, deprecation

- **OpenAPI 3.1** from FastAPI; publish `openapi.json` in CI.
- Breaking changes: `/api/v2/`; deprecate `v1` with `Sunset` header and documented window.
- Optional: `openapi-typescript` for the SPA.

---

## 8. Authentication — flows

**Option A — Microsoft Entra ID (OIDC + PKCE)**

1. Authorize redirect with `scope=openid profile email`.
2. Exchange `code` at **backend** (keep `client_secret` off the SPA).
3. Issue internal session (httpOnly cookie) or short-lived **access JWT** with `sub`, `mitarbeiter_id`, `permissions[]`, `exp`.
4. Refresh rotation; server-side revoke on logout.

**Option B — Username / password**

- `POST /api/v1/auth/login` → `access_token`, `refresh_token`, `expires_in`.
- Access TTL ~15m; refresh ~7d with rotation and token family for reuse detection.
- **argon2id** for password hashes; lockout via Redis after N failures.

**JWT validation:** `iss`, `aud`, `exp`, signature (JWKS for Entra). Map groups → permissions; cache permission set in Redis.

---

## 9. Authorisation — enforcement

| Layer | Role |
|-------|------|
| `get_current_user` | JWT/cookie → user; `401` |
| `require_permission("sales.kunden.read")` | `403` if missing |
| **Service** | Department / row scope |
| **Repository** | Optional filters from service |

**Permission format:** `{area}.{resource}.{action}` (e.g. `sales.kunden.write`).

**Tests:** Each mutating route SHOULD include a **403** test without permission.

---

## 10. Backend package layout

```
backend/
  app/
    main.py
    core/config.py, security.py, deps.py
    db/session.py, base.py
    models/
    schemas/
    repositories/
    services/
    api/v1/router.py, kunden.py, …
  alembic/
  tests/api/, tests/services/
```

---

## 11. Persistence — Session and repositories

- **One SQLAlchemy `Session` per request** (`Depends(get_db)`).
- **Commit** after successful use-case; **rollback** on exception.
- Avoid **N+1** with `selectinload` / `joinedload` on hot list endpoints.
- **Repositories** per aggregate: `get_by_id`, `list_page`, `add`, `update` — no cross-aggregate business rules.

---

## 12. Physical data and Alembic

- **Alembic** is the canonical DDL evolution path in production (ADR may keep `schema.sql` as bootstrap snapshot).
- **legacy_id_map** example:

```sql
CREATE TABLE legacy_id_map (
  entity_type VARCHAR(64) NOT NULL,
  legacy_key  VARCHAR(128) NOT NULL,
  new_id      BIGINT NOT NULL,
  PRIMARY KEY (entity_type, legacy_key)
);
```

---

## 13. File upload and object storage

1. `POST /api/v1/documents` — `multipart/form-data` (`file`, `kind`, optional `kunden_id`).
2. Validate MIME allowlist and max size (e.g. 25 MB).
3. Stream to object storage; row in `documents`.
4. Response: presigned URL or proxied `GET …/content`.

---

## 14. Background jobs

- **Redis** + RQ / Celery / Arq.
- `202 Accepted` + `{ "job_id", "status_url": "/api/v1/jobs/{id}" }`.
- States: `queued`, `running`, `succeeded`, `failed` (sanitised errors).

---

## 15. Legacy migration — phases

| Phase | Output |
|-------|--------|
| Analysis | SQL Server ERD, triggers, Agent jobs |
| Mapping | Column-level spreadsheet SQL Server → target |
| Staging | `stg_*` tables |
| Transform | Cleansing; `stg_quarantine` for bad rows |
| Reconcile | Counts and financial totals vs legacy — **fail pipeline** if over threshold |
| Delta | Timestamp or CDC during parallel run |
| Cutover | Freeze Access; final delta; switch reads/writes |

ETL: Python (SQLAlchemy/pandas) or ADF/SSIS — record in ADR.

---

## 16. Observability

**Log fields (JSON):** `timestamp`, `level`, `trace_id`, `span_id`, `method`, `path`, `status_code`, `duration_ms`, `user_id` (if any).

**Metrics examples:** HTTP latency histograms, DB pool usage, `business_events_total`.

**Alerts:** p95 latency, 5xx rate, SLO burn.

---

## 17. Security implementation

- **CORS:** allowlist; never `*` with credentials.
- **Cookies:** `Secure`, `HttpOnly`, `SameSite`.
- **Headers:** `nosniff`, CSP / `X-Frame-Options`.
- **Rate limits** on `/auth/*` and heavy reports.
- **DB role:** DML only on app schema; no DDL at runtime.
- **GDPR:** PII classification; export/delete runbooks.

---

## 18. Frontend alignment

- `VITE_API_BASE_URL` (no trailing slash).
- `Authorization: Bearer …` or `credentials: 'include'` for cookies.
- **TanStack Query:** keys like `['kunden','list', { cursor, filters }]`.
- Map API `code` / `errors[]` to UI.

---

## 19. Reference exemplar: `Kunden`

| Operation | Request | Response |
|-----------|---------|----------|
| `GET /api/v1/kunden` | Query: cursor, limit, filters | `200` + cursor envelope |
| `GET /api/v1/kunden/{id}` | — | `200` / `404` |
| `POST /api/v1/kunden` | `KundenCreate` | `201` + `Location` |
| `PATCH /api/v1/kunden/{id}` | `KundenUpdate`, optional `If-Match` | `200` / `409` |
| `POST /api/v1/kunden/{id}/merge` | `{ "other_id": 99 }` | `200` + survivor |

Permissions: `sales.kunden.read` / `sales.kunden.write` (plus purchase/werkstatt/wash per policy).

---

## 20. Testing

| Layer | Tools |
|-------|--------|
| Unit | `pytest` |
| API | `httpx.AsyncClient`, ephemeral Postgres in CI |
| Contract | Optional Schemathesis (staging / pinned CI) |
| UI | Vitest + React Testing Library |

---

## 21. Domain state transitions

For `anfrage`, `angebot`, `rechnung` (posting), etc.:

- Document states, transition matrix, required **permission**, side effects.
- Implement in **domain service** (e.g. `transition_anfrage(…)`) before flush.

---

## 22. Soft delete and audit

- `deleted_at` on applicable entities; default list filters exclude deleted.
- Optional **audit_log** (append-only): `entity_type`, `entity_id`, `action`, `diff_json`, `actor_id`, `created_at`.

---

## 23. Rate limiting — HTTP behaviour

- `429` + `code: RATE_LIMITED`.
- **`Retry-After`** (seconds).
- Optional: `X-RateLimit-Limit`, `Remaining`, `Reset`.

---

## 24. Webhooks (outbound)

- Signed body: `X-DEMA-Signature: sha256=<HMAC>` with per-subscriber secret rotation.
- Retries with backoff; dead-letter after max attempts.
- Payload includes unique `event_id` for idempotent processing at receiver.

---

## 25. Environment variables (reference)

| Variable | Used by |
|----------|---------|
| `DATABASE_URL` | API |
| `JWT_*` / OIDC client settings | Auth |
| `CORS_ORIGINS` | API |
| `REDIS_URL` | Rate limit, jobs, idempotency |
| `STORAGE_*` | Documents |
| `ENV` | Log level, feature flags |

Never put secrets in `VITE_*` (except public OIDC client id).

---

## Document history

| Version | Notes |
|---------|--------|
| 1.0 | Standalone LLD aligned with master plan `e2e_python_to_cloud` |

*Master copy may be extended in `.cursor/plans/e2e_python_to_cloud_6a580df9.plan.md` Section 6.*
