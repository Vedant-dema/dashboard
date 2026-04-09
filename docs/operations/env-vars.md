# Environment Variables

This document covers the env matrix for **Milestone 7 (quality)** and **Milestone 8 (Vercel + Render deployment)**.

## Frontend (Vercel / Vite)

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes (prod) | `https://dema-backend.onrender.com` | Build-time API origin. No trailing slash. |
| `VITE_CUSTOMERS_SOURCE` | Recommended | `api` | `api` for shared backend mode, `local` for browser-only fallback. |
| `VITE_DEMO_API_KEY` | Optional | `demo-secret` | Only needed when backend `DEMO_API_KEY` is enabled. |
| `VITE_ENABLE_LIVE_UI_TRANSLATION` | Optional | `true` | Enables live translation API usage in UI. |
| `VITE_DEV_PROXY_API` | Local only | `http://127.0.0.1:8010` | Dev server proxy target. Not used in production bundle. |

References:

- [`frontend/.env.example`](../../frontend/.env.example)
- [`frontend/.env.production.example`](../../frontend/.env.production.example)

## Backend (Render / FastAPI)

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `APP_ENV` | Yes (prod) | `production` | Enables strict startup validation in production. |
| `APP_DEBUG` | No | `0` | Keep off in production. |
| `STARTUP_CHECKS_STRICT` | Optional | `1` | Forces strict checks outside production too. |
| `LOG_LEVEL` | Optional | `INFO` | Runtime log level. |
| `CUSTOMERS_STORE_MODE` | Yes (prod) | `db` | `db` uses SQLAlchemy/Alembic persistence. |
| `DATABASE_URL` | Yes (prod db mode) | `postgresql+psycopg://...` | `postgres://...` and plain `postgresql://...` are normalized. |
| `DATABASE_ECHO` | Optional | `0` | SQL debug logging. |
| `CORS_ORIGINS` | Yes (prod) | `https://your-app.vercel.app` | Comma-separated exact origins. |
| `CORS_ORIGIN_REGEX` | Optional | `https://.*\\.vercel\\.app` | Useful for preview deployments. |
| `DEMO_API_KEY` | Optional | `demo-secret` | Protects demo endpoints when enabled. |

## Cloud-portable runtime metadata

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `DEPLOYMENT_PLATFORM` | Optional | `render` / `azure` / `local` | Deployment target label for diagnostics/log metadata. |
| `CLOUD_PROVIDER` | Optional | `generic` / `azure` | Provider label independent from hosting vendor names. |
| `SERVICE_NAME` | Optional | `dema-backend` | Stable service identity for logs/traces. |
| `SERVICE_VERSION` | Optional | `2026.04.09+sha` | Version/revision label for release correlation. |
| `REQUEST_ID_HEADER_NAME` | Optional | `x-request-id` | Request correlation header returned in API responses. |

## Object Storage Variables

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `STORAGE_PROVIDER` | Yes | `local` or `azure_blob` | Current deployment can run with `local`. |
| `STORAGE_LOCAL_ROOT` | Required when local | `./storage` | Local filesystem fallback. |
| `STORAGE_DEFAULT_DOWNLOAD_TTL_SECONDS` | Optional | `900` | Signed/proxy access TTL. |
| `STORAGE_CONTAINER_RAW` | Optional | `customer-raw` | Logical raw container name. |
| `STORAGE_CONTAINER_DERIVED` | Optional | `customer-derived` | Logical derived container name. |
| `AZURE_BLOB_ACCOUNT_URL` | Required when azure | `https://<acct>.blob.core.windows.net` | Backend-only secret context. |
| `AZURE_BLOB_CONNECTION_STRING` | Optional | `<secret>` | Optional local/dev auth path. |
| `AZURE_BLOB_CONTAINER_RAW` | Optional | `customer-raw` | Azure raw container. |
| `AZURE_BLOB_CONTAINER_DERIVED` | Optional | `customer-derived` | Azure derived container. |
| `AZURE_BLOB_SAS_UPLOAD_ENABLED` | Optional | `0` | Future direct-upload path toggle. |

## Observability and telemetry hooks

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `LOG_FORMAT` | Optional | `text` or `json` | Structured JSON logs for centralized collectors. |
| `OBSERVABILITY_ENABLED` | Optional | `1` | Master toggle for observability middleware/hooks. |
| `OTEL_ENABLED` | Optional | `0` | Enables OpenTelemetry bootstrap when packages are installed. |
| `OTEL_SERVICE_NAME` | Optional | `dema-backend` | Service name emitted to traces. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Optional | `https://.../v1/traces` | Generic OTLP endpoint for future cloud exporters. |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Optional | `InstrumentationKey=...` | Azure Application Insights direct integration path. |
| `APPINSIGHTS_CONNECTIONSTRING` | Optional | `InstrumentationKey=...` | Legacy alias used by some Azure setups. |
| `KEY_VAULT_URI` | Optional | `https://<vault>.vault.azure.net/` | Future Key Vault URI reference. |
| `AZURE_KEY_VAULT_URI` | Optional | `https://<vault>.vault.azure.net/` | Alias for Key Vault URI. |

## Backend — VAT/VIES

- `VIES_REST_API_BASE`
- `VIES_STATUS_URL`
- `VIES_TEST_SERVICE_URL`
- `VIES_CHECK_URL`
- `VIES_CHECK_ENDPOINT_MAX_TOTAL_SEC`
- `VIES_ENRICH_FALLBACK_ENABLED`

## Optional Integrations

- Geocoding: `GEOCODING_PROVIDER`, `MAPBOX_ACCESS_TOKEN`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_GEOCODING_API_KEY`
- Name variants: `NAME_VARIANTS_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `NAME_VARIANTS_MODEL`
- UI translation: `GOOGLE_TRANSLATE_API_KEY`, `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_API_KEY`

Reference:

- [`backend/.env.example`](../../backend/.env.example)
