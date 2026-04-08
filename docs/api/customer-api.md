# Customer API

## Milestone 6: PostgreSQL-Ready Customer API

### Runtime Compatibility

Customer endpoints keep the same public contract in both persistence modes:

- Transitional mode (`CUSTOMERS_STORE_MODE=demo_blob`)
- SQL mode (`CUSTOMERS_STORE_MODE=db`)

Supported endpoints:

- `GET /api/v1/customers`
- `GET /api/v1/customers/{customer_id}`
- `POST /api/v1/customers`
- `PATCH /api/v1/customers/{customer_id}`
- `GET /api/v1/customers/{customer_id}/history`
- `GET /api/v1/customers/{customer_id}/wash-profile`

### List Customers Example

`GET /api/v1/customers`

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

### History Entry Shape

`GET /api/v1/customers/{customer_id}/history`

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

### Transitional Write Endpoint (Still Available)

Milestone 5 compatibility endpoint remains available:

- `PUT /api/v1/demo/customers-db`

It still supports optimistic concurrency via `expected_updated_at` and returns `409 customers_db_conflict` on stale writes.
