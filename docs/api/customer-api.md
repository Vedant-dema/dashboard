# Customer API

## Milestone 5: Data Safety and Official History

### Optimistic Concurrency

Shared customer writes now support an optimistic concurrency token.

Endpoint:
- `PUT /api/v1/demo/customers-db`

Request shape:

```json
{
  "state": { "...": "KundenDbState" },
  "expected_updated_at": "2026-04-07T12:00:00+00:00",
  "source": "frontend.customers-page"
}
```

If `expected_updated_at` does not match current backend `updated_at`, backend rejects the write.

### Conflict Response

Status:
- `409 Conflict`

Response shape:

```json
{
  "detail": {
    "code": "customers_db_conflict",
    "message": "Shared customers data has changed since your last load.",
    "expected_updated_at": "2026-04-07T12:00:00+00:00",
    "actual_updated_at": "2026-04-07T12:03:00+00:00"
  }
}
```

### Official History Endpoint

Endpoint:
- `GET /api/v1/customers/{customer_id}/history`

Response shape:

```json
{
  "items": [
    {
      "id": 42,
      "kunden_id": 10001,
      "timestamp": "2026-04-07T12:03:00+00:00",
      "action": "updated",
      "editor_name": "Anna Schmidt",
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
          "source": "frontend.customers-page"
        }
      ]
    }
  ],
  "total": 1,
  "updated_at": "2026-04-07T12:03:00+00:00"
}
```

The backend now generates this audit trail centrally by diffing previous and incoming state.

