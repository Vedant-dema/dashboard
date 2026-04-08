# Deployment Guide (Vercel + Render)

## Scope

This guide deploys the current serious DEMA version with:

- Frontend: Vercel
- Backend: Render Web Service (FastAPI)
- Database: Render PostgreSQL (or compatible managed Postgres)

## Target Topology

- Browser -> Vercel-hosted SPA (`frontend`)
- SPA -> Render API (`/api/*`)
- Render API -> managed PostgreSQL
- Object storage remains backend-owned (local fallback now, Azure Blob production target path)

## Prerequisites

- Branch: `phase-8-deployment-vercel-render`
- Python dependencies from `backend/requirements.txt`
- Node dependencies from `frontend/package.json`
- Render + Vercel project access

## Backend Deployment (Render)

Preferred option: use root [`render.yaml`](../../render.yaml) blueprint.

Manual equivalent:

1. Create a new Render Web Service from this repo.
2. Set Root Directory to `backend`.
3. Build command: `pip install --upgrade pip && pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Health check path: `/api/health`
6. Set required env vars (see `docs/operations/env-vars.md`).
7. Attach managed Postgres and set `DATABASE_URL` to connection string.
8. Run migrations: `alembic upgrade head`.

Notes:

- Runtime now normalizes `postgres://...` and `postgresql://...` to `postgresql+psycopg://...`.
- In `APP_ENV=production`, startup checks are strict and fail fast for high-risk misconfigurations.

## Frontend Deployment (Vercel)

1. Import this repo into Vercel.
2. Either:
   - set Root Directory to `frontend`, or
   - keep repo root and use root [`vercel.json`](../../vercel.json).
3. Build command: `npm run build`
4. Output directory: `dist` (if root is `frontend`) or `frontend/dist` (if root is repo root config).
5. Add build-time env vars:
   - `VITE_API_BASE_URL=https://<your-render-service>.onrender.com`
   - `VITE_CUSTOMERS_SOURCE=api`
   - optional: `VITE_DEMO_API_KEY`
6. Deploy and verify the site calls the Render API origin.

## CORS and API Base URL

- Backend must allow Vercel origin via `CORS_ORIGINS` and/or `CORS_ORIGIN_REGEX`.
- Do not use `*` in production with credentials enabled.
- Frontend production build must set `VITE_API_BASE_URL`; otherwise API calls fall back to same-origin and fail on Vercel.

## Release and Smoke

- Manager demo release checklist: [`docs/operations/release-checklist-manager-demo.md`](release-checklist-manager-demo.md)
- Deployed environment smoke checklist: [`docs/operations/smoke-checklist-deployed.md`](smoke-checklist-deployed.md)

## Rollback

1. Roll back Vercel to previous successful deployment.
2. Roll back Render web service to previous image/deploy.
3. If schema changed, use a forward-fix migration; avoid destructive rollback on shared demo data.
4. Re-run smoke checklist before re-opening manager demo.
