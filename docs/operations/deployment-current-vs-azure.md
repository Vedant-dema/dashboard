# Deployment Strategy: Current vs Future Azure

## Why this document exists

DEMA currently runs on Vercel + Render and should remain stable for manager demos and near-term delivery.

This document clarifies how that current deployment maps to a future Azure-oriented production setup.

## Current deployment (active)

- Frontend: Vercel
- Backend: Render Web Service
- Database: Render PostgreSQL
- Object storage: local fallback / Azure-ready abstraction

Primary runbook:

- `docs/operations/deployment-vercel-render.md`

## Future production target (planned)

- Frontend: Azure Static Web Apps
- Backend: Azure App Service or Azure Container Apps
- Database: Azure Database for PostgreSQL
- Object storage: Azure Blob Storage
- Secrets: Azure Key Vault
- Observability: Application Insights + OpenTelemetry

Primary architecture reference:

- `docs/architecture/azure-production-path.md`

## Compatibility principles

- Keep API contracts unchanged while changing hosting platform.
- Keep environment variable model cloud-portable (not vendor-locked naming only).
- Keep structured logging and correlation IDs independent of one host.
- Keep migration scripts (Alembic) as deployment-platform agnostic source of truth.

## Migration approach (non-disruptive)

1. Keep Vercel + Render production/demo as baseline.
2. Stand up Azure staging in parallel using `infra/azure/` starter structure.
3. Validate API parity and smoke checklist on Azure staging.
4. Cut over by environment, not by code fork.

## Not part of this milestone

- No forced cutover now.
- No full infrastructure rollout in this pass.
- No redesign of backend domain model.
