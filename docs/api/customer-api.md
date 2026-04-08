# Customer API

## Scope

Milestone 6+ customer domain API contracts that remain stable across:

- transitional mode (`CUSTOMERS_STORE_MODE=demo_blob`)
- SQL mode (`CUSTOMERS_STORE_MODE=db`)

## Endpoints

- `GET /api/v1/customers`
- `GET /api/v1/customers/{customer_id}`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/{customer_id}`
- `GET /api/v1/customers/{customer_id}/history`
- `GET /api/v1/customers/{customer_id}/wash-profile`

Transitional shared-state compatibility endpoint:

- `GET /api/v1/demo/customers-db`
- `PUT /api/v1/demo/customers-db`

## List response (example)

```json
{
  "items": [
    {
      "id": 10001,
      "kunden_nr": "10001",
      "firmenname": "Muster GmbH",
      "branche": "KFZ",
      "strasse": "Hafenstr. 1",
      "plz": "20095",
      "ort": "Hamburg",
      "land_code": "DE",
      "deleted": false,
      "updated_at": "2026-04-07T12:03:00+00:00"
    }
  ],
  "total": 1,
  "updated_at": "2026-04-07T12:03:00+00:00"
}
```

## History response (example)

```json
{
  "items": [
    {
      "id": 42,
      "kunden_id": 10001,
      "timestamp": "2026-04-07T12:03:00+00:00",
      "action": "updated",
      "editor_name": "Anna Schmidt",
      "editor_email": "anna@example.com",
      "changes": [
        {
          "field": "customer.firmenname",
          "from": "Old Name GmbH",
          "to": "New Name GmbH",
          "entityType": "customer",
          "entityId": 10001,
          "oldValue": "Old Name GmbH",
          "newValue": "New Name GmbH",
          "changedBy": "Anna Schmidt",
          "changedAt": "2026-04-07T12:03:00+00:00",
          "source": "api.v1.customers.patch"
        }
      ]
    }
  ],
  "total": 1,
  "updated_at": "2026-04-07T12:03:00+00:00"
}
```

## Conflict behavior (transitional shared mode)

For `PUT /api/v1/demo/customers-db`:

- request may send `expected_updated_at`
- if stale, server returns:
  - status `409`
  - `detail.code = "customers_db_conflict"`

This is required for optimistic concurrency and stale-write protection.

## History source guarantee

In API mode, frontend history views should use:

- `GET /api/v1/customers/{customer_id}/history`

Local fallback is only acceptable when the official endpoint is temporarily unavailable.

## Milestone 7 quality checks

Backend tests cover:

- customer create/update contract behavior
- stale-write conflict response
- history creation after mutations
