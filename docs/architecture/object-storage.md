# Object Storage Architecture (Phase 6 Foundation)

## Purpose

Customer and operations document files can grow quickly and should not be stored as large blobs in relational tables.
Object storage gives better scalability, lifecycle control, and secure access patterns than database blob columns.

## Responsibility split

Database responsibilities:

- store document metadata
- track ownership (`customer_id`), status, checksums, lifecycle state
- audit upload/delete events

Object storage responsibilities:

- store raw and derived file payloads
- provide durable, private container/object storage
- support controlled download and future direct-upload strategies

## Production target

- Provider: Azure Blob Storage
- Container model:
  - raw container for original uploads
  - derived container for OCR/previews/transcoded outputs
- All production containers remain private (no public anonymous access).

## Local/dev fallback

- Provider: local filesystem (`STORAGE_PROVIDER=local`)
- Root path: `STORAGE_LOCAL_ROOT`
- Same metadata model and service interface as production backend.

## Security model

- Frontend never receives storage account keys.
- Backend is the only component that talks to storage providers.
- Download access is backend-mediated (proxy or short-lived signed strategy).
- Future direct upload must use short-lived backend-issued contract only.

## Upload/download pattern

Current Phase 6 foundation:

1. Client sends file to backend upload endpoint (future endpoint integration phase).
2. Backend stores object through `StorageService`.
3. Backend writes metadata row in `customer_documents`.
4. Client retrieves metadata and requests download via backend-controlled access strategy.

Future direct-upload path (not fully rolled out in Phase 6):

- Backend may issue short-lived upload contract/SAS for direct browser upload.
- Backend finalizes metadata only after upload verification.

## Metadata model

Table: `customer_documents`

- `id`
- `customer_id`
- `storage_provider`
- `container_name`
- `object_key`
- `original_filename`
- `content_type`
- `size_bytes`
- `checksum_sha256`
- `status`
- `uploaded_by`
- `uploaded_at`
- `deleted_at` (soft delete marker)
- `metadata_json` (extensible attributes)

Important rule: metadata in DB, payload in object storage.

## Retention, versioning, lifecycle expectations

- Soft delete in DB (`deleted_at`) before physical object purge.
- Provider lifecycle rules should be environment-managed (retention tiers, archive windows).
- Versioning policy should be enabled at container level in production where required by compliance.
- Derived files can be regenerated; raw uploads are the retention source of truth.

## Future async processing path

Planned flow after upload foundation:

1. Upload completed -> enqueue async job.
2. Worker performs OCR/extraction/preview generation.
3. Derived artifacts stored in derived container.
4. `customer_documents` status transitions track processing lifecycle.

## Environment variables

Core provider selection:

- `STORAGE_PROVIDER=local|azure_blob`
- `STORAGE_LOCAL_ROOT=./storage`
- `STORAGE_DEFAULT_DOWNLOAD_TTL_SECONDS=900`

Container naming:

- `STORAGE_CONTAINER_RAW=customer-raw`
- `STORAGE_CONTAINER_DERIVED=customer-derived`

Azure-specific:

- `AZURE_BLOB_ACCOUNT_URL`
- `AZURE_BLOB_CONNECTION_STRING` (optional for local/dev)
- `AZURE_BLOB_CONTAINER_RAW`
- `AZURE_BLOB_CONTAINER_DERIVED`
- `AZURE_BLOB_SAS_UPLOAD_ENABLED` (future direct upload switch)

## Rollout plan

1. Phase 6 (current): add docs, backend abstraction, config, metadata table migration.
2. Phase 7: add upload/download API endpoints using `StorageService`, keep frontend scope minimal.
3. Phase 8: add async processing pipeline, retention automation, observability and operational runbooks.
