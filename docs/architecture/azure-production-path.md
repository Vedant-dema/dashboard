# Azure Production Path (Post-Deployment Hardening)

## Purpose

This document defines the **future Azure-oriented production architecture** while preserving the current
Vercel + Render deployment used for manager demos.

Current deployment remains valid and supported:

- Frontend: Vercel
- Backend: Render (FastAPI)
- Database: Render PostgreSQL

Future target deployment (production-grade direction):

- Frontend: Azure Static Web Apps (or equivalent Azure frontend hosting)
- Backend: Azure App Service or Azure Container Apps
- Database: Azure Database for PostgreSQL
- Object storage: Azure Blob Storage
- Secrets: Azure Key Vault
- Observability: Application Insights (+ OpenTelemetry path)

## Current vs Future Matrix

| Layer | Current | Future Azure target |
| --- | --- | --- |
| Frontend hosting | Vercel | Azure Static Web Apps (primary) or App Service static hosting |
| Backend hosting | Render Web Service | Azure App Service (simple) or Azure Container Apps (container-native) |
| Relational DB | Render Postgres | Azure Database for PostgreSQL Flexible Server |
| Documents | local filesystem fallback / Azure Blob-ready abstractions | Azure Blob Storage private containers |
| Secrets | host-managed env vars | Azure Key Vault + managed identity access |
| Telemetry | platform logs + app logs | Application Insights + OpenTelemetry exporters |

## Azure Component Architecture

### 1) Frontend Hosting (Azure Static Web Apps)

- Deploy `frontend/` build output as SPA.
- Route all client paths to `index.html` (same SPA rewrite model used in Vercel).
- Set build-time `VITE_API_BASE_URL` to Azure backend origin.
- Keep API keys out of frontend bundle.

Alternative (if needed): App Service static hosting or CDN front-door model.

### 2) Backend Hosting (App Service vs Container Apps)

**Option A: Azure App Service**

- Fastest migration path from current Render setup.
- Run `uvicorn app.main:app` with startup/health checks.
- Good default for small team operations.

**Option B: Azure Container Apps**

- Better fit for containerized scaling, revisions, and future background workers.
- Preferred if async processing and event-driven expansion become primary.

Shared requirements:

- Health endpoint `/api/health`
- Readiness endpoint `/api/v1/ready`
- CORS configured from frontend origins
- Runtime env configuration from central settings

### 3) Azure Database for PostgreSQL

- Use PostgreSQL Flexible Server for managed backups, HA options, and scaling.
- Continue Alembic migrations (`alembic upgrade head`) as source of truth.
- Enforce SSL/TLS connection and least-privilege DB credentials.

### 4) Blob Storage

- `customer-raw` and `customer-derived` private containers.
- Backend-only storage authorization.
- Database stores metadata pointers only (no large blob payloads in Postgres).
- Future direct-upload can use backend-issued short-lived SAS contracts.

### 5) Key Vault

- Store DB credentials, storage connection strings, API keys, and other secrets.
- Backend retrieves secrets via managed identity / federated identity.
- Keep local `.env` for local development only.

### 6) Application Insights and OpenTelemetry

- Structured logs include request correlation (`x-request-id`) and service metadata.
- Optional OTel instrumentation path enabled via env flags.
- Application Insights connection string can be used directly or via OTel exporter.
- Keep observability optional in dev, strict in production.

## Network and Security Baseline

- Private Blob containers only.
- No storage account keys in frontend.
- CORS restricted to known frontend origins.
- Secrets delivered via Key Vault, not hardcoded repo values.
- Service-to-service access via managed identity where possible.

## Rollout Strategy

1. Keep Vercel + Render as stable demo/transition environment.
2. Stand up Azure infra in parallel (`infra/azure`).
3. Deploy backend to Azure with same API contracts.
4. Point a staging frontend build to Azure backend.
5. Validate smoke checks and observability before production cutover.

## Non-goals for this milestone

- No forced migration away from Vercel/Render now.
- No full IaC production rollout in this pass.
- No big runtime redesign.

This milestone is architecture-first and compatibility-first.
