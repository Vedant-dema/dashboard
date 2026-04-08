# Release Checklist (Manager Demo)

## 1) Freeze and Version

- Confirm branch is `phase-8-deployment-vercel-render`.
- Confirm no unrelated refactors are included.
- Capture commit SHA for demo release note.

## 2) Backend (Render)

- Deploy succeeded with healthy status.
- `APP_ENV=production` set.
- `CUSTOMERS_STORE_MODE=db` set.
- `DATABASE_URL` set and reachable.
- `CORS_ORIGINS` and/or `CORS_ORIGIN_REGEX` includes demo frontend origin.
- Health check endpoint reports startup checks with `ok=true`.

## 3) Frontend (Vercel)

- Deployment build passed.
- `VITE_API_BASE_URL` points to current Render backend.
- `VITE_CUSTOMERS_SOURCE=api`.
- No console errors for missing API base configuration.

## 4) Data and Migrations

- `alembic upgrade head` applied on deployed backend environment.
- Core demo dataset available (or expected empty-state verified).
- History endpoint returns data for edited records.

## 5) Demo Flow Walkthrough

- Customer list loads.
- Create customer works.
- Edit customer works.
- Save conflict shows user-friendly message and reload path.
- History tab loads from backend endpoint.
- VAT check route returns expected success and error behavior.

## 6) Signoff

- Record deployment URLs (Vercel + Render).
- Record known caveats for the demo.
- Record rollback target deployment IDs.
