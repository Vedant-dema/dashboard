# Customer API (Phase 4)

Date: 2026-04-07  
Status: Transitional storage (demo/blob-compatible), REST contract active

## Base URL

- Local backend: `http://127.0.0.1:8000`
- API prefix used here: `/api/v1/customers`

If `DEMO_API_KEY` is configured on the backend, send header:

- `x-demo-key: <your-key>`

## Endpoints

### GET `/api/v1/customers`

List customer summaries for table/list view.

Query params:

- `include_deleted` (optional, default `false`)

Response:

```json
{
  "items": [
    {
      "id": 1,
      "kunden_nr": "10001",
      "firmenname": "Muster GmbH",
      "branche": "KFZ",
      "strasse": "Hafenstr. 1",
      "plz": "20095",
      "ort": "Hamburg",
      "land_code": "DE",
      "deleted": false,
      "updated_at": "2026-04-07T10:12:00+00:00"
    }
  ],
  "total": 1,
  "updated_at": "2026-04-07T10:12:00+00:00"
}
```

### GET `/api/v1/customers/{id}`

Load full customer detail for edit modal/screen.

Response:

```json
{
  "customer": {
    "id": 1,
    "kunden_nr": "10001",
    "firmenname": "Muster GmbH"
  },
  "wash_profile": {
    "id": 1,
    "kunden_id": 1
  },
  "roles": []
}
```

### POST `/api/v1/customers`

Create customer in transitional store.

Request accepts either:

1. Clean wrapped DTO
2. Raw customer fields at top level (auto-wrapped internally)

Wrapped request example:

```json
{
  "customer": {
    "firmenname": "Neue Firma GmbH",
    "branche": "Logistik"
  },
  "wash_profile": {
    "limit_betrag": 2500
  },
  "roles": []
}
```

Response:

```json
{
  "item": {
    "customer": {
      "id": 16,
      "kunden_nr": "00016",
      "firmenname": "Neue Firma GmbH"
    },
    "wash_profile": {
      "id": 2,
      "kunden_id": 16
    },
    "roles": []
  },
  "updated_at": "2026-04-07T10:13:00+00:00"
}
```

### PATCH `/api/v1/customers/{id}`

Patch customer and optional wash/roles in transitional store.

Request example:

```json
{
  "customer": {
    "firmenname": "Neue Firma GmbH (Updated)",
    "telefonnummer": "+49 40 999999"
  }
}
```

Response shape equals POST response.

### GET `/api/v1/customers/{id}/history`

Returns customer history entries from the shared transitional state.

Response:

```json
{
  "items": [
    {
      "id": 3,
      "kunden_id": 16,
      "timestamp": "2026-04-07T10:14:00+00:00",
      "action": "updated",
      "editor_name": "User",
      "editor_email": "user@example.com",
      "changes": []
    }
  ],
  "total": 1,
  "updated_at": "2026-04-07T10:14:00+00:00"
}
```

### GET `/api/v1/customers/{id}/wash-profile`

Returns wash profile (if present).

Response:

```json
{
  "customer_id": 16,
  "wash_profile": {
    "id": 2,
    "kunden_id": 16
  },
  "updated_at": "2026-04-07T10:14:00+00:00"
}
```

## Compatibility Notes

- Existing endpoint `/api/v1/demo/customers-db` remains unchanged and usable.
- New customer REST endpoints are layered on top of the same transitional state.
- PostgreSQL migration is intentionally deferred to Phase 6.

