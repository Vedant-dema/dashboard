# VAT API

## Purpose

Expose VAT/VIES status and validation routes for customer onboarding and compliance checks.

## Endpoints

- `GET /api/v1/vat/info`
  - lightweight modular endpoint
  - returns service enablement and configured REST base URL
- `GET /api/v1/vat/status`
  - proxies VIES member-state availability (`check-status`)
- `POST /api/v1/vat/check-test`
  - VIES test-service proxy for synthetic checks
- `POST /api/v1/vat/check`
  - live VAT validation proxy with timeout budget protection

## Basic response shape (`/api/v1/vat/info`)

```json
{
  "enabled": true,
  "rest_api_base": "https://ec.europa.eu/taxation_customs/vies/rest-api"
}
```

## Runtime safety controls

- `VIES_CHECK_ENDPOINT_MAX_TOTAL_SEC`
- `VIES_ENRICH_FALLBACK_ENABLED`
- `VIES_REST_API_BASE`
- `VIES_STATUS_URL`
- `VIES_TEST_SERVICE_URL`
- `VIES_CHECK_URL`

See full environment matrix in `docs/operations/env-vars.md`.

## Milestone 7 quality checks

Backend tests include:

- VAT info endpoint behavior check
- VAT status endpoint basic behavior with upstream call stub
