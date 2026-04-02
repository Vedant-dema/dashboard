# Environment Variables

This file summarizes runtime variables used by frontend and backend.

## Frontend (`frontend/.env.example`)

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | no (local), yes (deployed) | Backend base URL for API calls. Keep empty in local dev to use Vite proxy. |
| `VITE_DEV_PROXY_API` | no | Override local proxy target (default backend localhost). |
| `VITE_ENABLE_LIVE_UI_TRANSLATION` | no | Enables live UI translation workflow via backend endpoint. |

## Backend (`backend/.env.example`)

### Core

| Variable | Required | Purpose |
|---|---|---|
| `CORS_ORIGINS` | yes in deploy | Comma-separated allowlist for frontend origins. |
| `VIES_CHECK_URL` / `VIES_REST_API_BASE` | no | VAT/VIES proxy configuration. |
| `VIES_STATUS_URL` | no | VAT status endpoint override. |
| `VIES_TEST_SERVICE_URL` | no | VAT test service endpoint override. |

### Geocoding

| Variable | Required | Purpose |
|---|---|---|
| `GEOCODING_PROVIDER` | no | `osm` (default), `mapbox`, or `google`. |
| `MAPBOX_ACCESS_TOKEN` | when using mapbox | Mapbox geocoding token. |
| `GOOGLE_MAPS_API_KEY` | when using google | Google geocoding key. |
| `NOMINATIM_API_BASE` | no | OSM Nominatim endpoint override. |
| `PHOTON_API_BASE` | no | Photon endpoint override. |

### Optional AI and Translation

| Variable | Required | Purpose |
|---|---|---|
| `NAME_VARIANTS_API_KEY` | optional | Name variant feature API key. |
| `OPENAI_API_KEY` | optional | Fallback API key for name variants. |
| `OPENAI_BASE_URL` | optional | OpenAI-compatible API base URL. |
| `NAME_VARIANTS_MODEL` | optional | Model name for name variants. |
| `GOOGLE_TRANSLATE_API_KEY` | optional | Enables backend translation endpoint. |
| `LIBRETRANSLATE_URL` | optional | LibreTranslate base URL. |
| `LIBRETRANSLATE_API_KEY` | optional | LibreTranslate API key if required. |

## Local Setup Notes

- Never commit real secrets.
- Keep `.env.example` as the documented baseline.
- For Vite, `VITE_*` values are baked at build time.

