# Environment Variables

## Frontend (Vercel / Vite)

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Yes (prod) | `https://dema-backend.onrender.com` | Build-time API origin. No trailing slash. |
| `VITE_CUSTOMERS_SOURCE` | Recommended | `api` | `api` for shared backend mode, `local` for browser-only fallback. |
| `VITE_DEMO_API_KEY` | Optional | `demo-secret` | Only needed when backend `DEMO_API_KEY` is enabled. |
| `VITE_ENABLE_LIVE_UI_TRANSLATION` | Optional | `true` | Enables live translation API usage in UI. |
| `VITE_DEV_PROXY_API` | Local only | `http://127.0.0.1:8000` | Dev server proxy target. Not used in production bundle. |

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

## Optional Integrations

- Geocoding: `GEOCODING_PROVIDER`, `MAPBOX_ACCESS_TOKEN`, `GOOGLE_MAPS_API_KEY`
- Name variants: `NAME_VARIANTS_API_KEY`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `NAME_VARIANTS_MODEL`
- UI translation: `GOOGLE_TRANSLATE_API_KEY`, `LIBRETRANSLATE_URL`, `LIBRETRANSLATE_API_KEY`
- VAT safety: `VIES_CHECK_ENDPOINT_MAX_TOTAL_SEC`, `VIES_ENRICH_FALLBACK_ENABLED`

Reference:

- [`backend/.env.example`](../../backend/.env.example)
