# Customer API (Planned Contract)

Status:

- Phase 0 baseline document
- Current app still uses transitional local/demo storage paths
- Resource-style customer API is planned for Phases 4-6

## Base Path

- `/api/v1/customers`

## Endpoints

### `GET /api/v1/customers`

Returns a list of customer records.

### `GET /api/v1/customers/{id}`

Returns one customer by numeric identifier.

### `POST /api/v1/customers`

Creates a customer record.

### `PATCH /api/v1/customers/{id}`

Partially updates a customer record.

Planned concurrency behavior:

- Request includes expected `updated_at` (or version token)
- stale write returns conflict

### `GET /api/v1/customers/{id}/history`

Returns audit/history entries for one customer.

### `GET /api/v1/customers/{id}/wash-profile`

Returns wash profile for one customer.

## Planned Response Shape Notes

- All responses should be typed and stable.
- Error responses should include machine-readable `code`.
- Timestamps should use ISO-8601 UTC.

## Planned Error Codes

- `400 BAD_REQUEST`
- `404 NOT_FOUND`
- `409 CONFLICT` (stale update / optimistic lock)
- `422 VALIDATION_ERROR`
- `500 INTERNAL_ERROR`

