# Azure Infrastructure Starter

This folder is a **starter structure** for future Azure production deployment.

It is intentionally lightweight in this milestone and does not force immediate migration.

## Layout

- `main.bicep` - top-level composition placeholder for Azure resources.
- `modules/` - reusable Bicep modules (networking, app, db, storage, observability).
- `environments/` - example parameter files per environment.

## Intended resource groups

- Application hosting (frontend/backend)
- Data (PostgreSQL, storage)
- Security (Key Vault)
- Observability (Application Insights)

## Next implementation steps

1. Define naming convention + tags.
2. Add module files (`appservice.bicep`, `containerapps.bicep`, `postgresql.bicep`, `storage.bicep`, `keyvault.bicep`, `monitoring.bicep`).
3. Add CI validation (`az bicep build`) and dry-run (`what-if`) for PR checks.
4. Add environment-specific parameter files for dev/staging/prod.

See architecture guidance:

- `docs/architecture/azure-production-path.md`
