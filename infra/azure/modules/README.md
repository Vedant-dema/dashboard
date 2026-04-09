# Azure Bicep Modules

Planned module split:

- `frontend-static-webapp.bicep`
- `backend-appservice.bicep`
- `backend-containerapps.bicep`
- `postgresql-flexible-server.bicep`
- `blob-storage.bicep`
- `key-vault.bicep`
- `application-insights.bicep`

Each module should expose:

- clear input parameters
- minimal outputs used by composition
- tags and naming compatibility
- secure defaults (private endpoints / identity integration where applicable)
