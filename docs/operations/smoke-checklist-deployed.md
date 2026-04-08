# Deployed Smoke Checklist

Use this after each Render/Vercel deployment.

## Backend API

- `GET /api/health` -> `200` and `startup_checks.ok=true`
- `GET /api/v1/health` -> `200`
- `GET /api/v1/ready` -> `200`
- `GET /api/v1/customers` -> `200`
- `GET /api/v1/customers/{id}` -> `200` (for an existing customer)
- `GET /api/v1/customers/{id}/history` -> `200`
- `POST /api/v1/vat/check` basic payload returns expected success/error contract

## Frontend UX

- App loads on Vercel without blank screen.
- Customers page opens.
- Create customer works end-to-end.
- Edit + save customer works.
- Stale-write conflict displays clear message and reload path.
- History tab is visible and populated in API mode.
- Page reload keeps correct data (no stale local-only snapshot in API mode).

## Security and Routing

- Browser network tab shows requests sent to Render API origin (`VITE_API_BASE_URL`).
- No CORS failures for the deployed Vercel origin.
- No API secrets exposed in frontend bundle.

## Regression Spot Check

- VAT flow still operational.
- Geocode search still operational.
- No duplicate modal shell/header/tab regressions on customer screens.
