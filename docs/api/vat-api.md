# VAT API (Current Contract)

Status:

- Active and used by customer workflow
- Implemented in backend FastAPI service

## Health Endpoint

- `GET /api/health`

Example response:

```json
{
  "status": "ok",
  "cors_origins": ["http://localhost:5173"]
}
```

## VAT Endpoints

### `GET /api/v1/vat/status`

Returns member-state availability/status information from VIES proxy logic.

### `POST /api/v1/vat/check-test`

Runs VAT test-service flow.

### `POST /api/v1/vat/check`

Runs live VAT validation flow.

## Notes

- Backend proxy handles normalization and fallback behavior.
- Frontend customer flow depends on this route family and must remain compatible during refactors.
- Environment settings are documented in `docs/operations/env-vars.md`.

