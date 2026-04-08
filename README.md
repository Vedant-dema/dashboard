# DEMA Dashboard

DEMA Dashboard is a React + TypeScript + Vite frontend with a Python FastAPI backend.
This branch (`phase-8-deployment-vercel-render`) focuses on deployment readiness for:

- Frontend on Vercel
- Backend on Render
- PostgreSQL on Render (or compatible managed Postgres)

## Milestone Status

- Milestone: 8 (deployment foundation)
- Goal: reproducible, stable manager-demo environment
- Scope: deployment/runbook/config hardening, not a UI redesign

## Repository Layout

- `frontend/` - React + TypeScript + Vite client
- `backend/` - FastAPI backend, SQLAlchemy models, Alembic migrations
- `docs/` - architecture, API, operations runbooks, progress
- `render.yaml` - Render blueprint for backend + managed Postgres

## Local Setup

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

## Quality Commands

### Frontend

```powershell
cd frontend
npm run build
```

### Backend

```powershell
cd backend
python -m pytest app/tests -q
```

### Migrations

```powershell
cd backend
alembic current
alembic heads
alembic upgrade head
```

## Deployment (Vercel + Render)

### Frontend -> Vercel

- Build command: `npm run build`
- Output: `dist` (if project root is `frontend`) or `frontend/dist` (if root `vercel.json` is used)
- Required env: `VITE_API_BASE_URL`, recommended `VITE_CUSTOMERS_SOURCE=api`

### Backend -> Render

- Root directory: `backend`
- Build command: `pip install --upgrade pip && pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/api/health`
- Required env: `APP_ENV=production`, `CUSTOMERS_STORE_MODE=db`, `DATABASE_URL`, CORS settings

Use [`render.yaml`](render.yaml) for reproducible setup.

## Environment Overview

### Frontend

- `VITE_API_BASE_URL` - backend API origin (required for production)
- `VITE_CUSTOMERS_SOURCE` - `api` for shared backend mode, `local` for browser-only mode
- `VITE_DEMO_API_KEY` - optional demo header

### Backend

- `APP_ENV` - runtime profile (`development`, `staging`, `production`)
- `STARTUP_CHECKS_STRICT` - force strict startup checks in non-production
- `CUSTOMERS_STORE_MODE` - `demo_blob` or `db`
- `DATABASE_URL` - SQLAlchemy connection URL (Render URLs normalized automatically)
- `CORS_ORIGINS` / `CORS_ORIGIN_REGEX` - allowed frontend origins

### Object storage

- `STORAGE_PROVIDER` - `local` or `azure_blob`
- `STORAGE_LOCAL_ROOT` - local fallback root
- `AZURE_BLOB_*` - Azure Blob production settings

## Docs Index

- Architecture overview: [`docs/architecture/overview.md`](docs/architecture/overview.md)
- Object storage design: [`docs/architecture/object-storage.md`](docs/architecture/object-storage.md)
- Deployment runbook: [`docs/operations/deployment-vercel-render.md`](docs/operations/deployment-vercel-render.md)
- Environment variables: [`docs/operations/env-vars.md`](docs/operations/env-vars.md)
- Manager demo release checklist: [`docs/operations/release-checklist-manager-demo.md`](docs/operations/release-checklist-manager-demo.md)
- Deployed smoke checklist: [`docs/operations/smoke-checklist-deployed.md`](docs/operations/smoke-checklist-deployed.md)
- Customer API: [`docs/api/customer-api.md`](docs/api/customer-api.md)
