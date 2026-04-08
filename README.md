# DEMA Dashboard

DEMA Dashboard is a React + TypeScript + Vite frontend with a Python FastAPI backend.

This repository includes **Milestone 7** quality foundation work (tests, lint/format, CI) and **Milestone 8**
deployment readiness (Vercel + Render + Postgres).

## Milestone status

- **Milestone 7 (quality foundation)** — Branch reference: `phase-7-quality-docs-ci`
  - High-value backend/frontend tests
  - Lint/format command baseline
  - Practical CI validation (`quality-foundation.yml`)
  - Documentation alignment

- **Milestone 8 (deployment foundation)** — Branch: `phase-8-deployment-vercel-render`
  - Reproducible manager-demo environment
  - Deployment/runbook/config hardening (not a UI redesign)

### Deployment targets

- Frontend on Vercel
- Backend on Render
- PostgreSQL on Render (or compatible managed Postgres)

## Repository Layout

- `frontend/` - React + TypeScript + Vite client
- `backend/` - FastAPI backend, SQLAlchemy models, Alembic migrations
- `docs/` - architecture, API, operations runbooks, product, progress
- `.github/workflows/` - CI workflows (quality foundation, etc.)
- `render.yaml` - Render blueprint for backend + managed Postgres (when present)

## Local Setup

- Node.js 20+ and npm
- Python 3.11+ (3.12 recommended)
- PostgreSQL for production DB mode, SQLite for local/demo mode

### Frontend local setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend quality commands:

```powershell
cd frontend
npm run typecheck
npm run test:run
npm run build
```

### Backend local setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Backend quality commands:

```powershell
cd backend
python -m ruff check app main.py
python -m black --check app/tests
python -m pytest -p no:cacheprovider --basetemp=.pytest-sandbox/tmp
```

### Migrations

```powershell
cd backend
alembic current
alembic heads
alembic upgrade head
```

## CI quality workflow

GitHub Actions workflow:

- `.github/workflows/quality-foundation.yml`

It runs:

- frontend: install, typecheck, tests, build
- backend: install dev deps, ruff, black (tests scope), pytest

## Environment overview

Frontend (`frontend/.env` or shell env):

- `VITE_API_BASE_URL` - backend URL (for example `http://127.0.0.1:8010`)
- `VITE_CUSTOMERS_SOURCE` - `api` for shared backend mode, otherwise local mode
- `VITE_DEMO_API_KEY` - optional demo key header
- `VITE_DEV_PROXY_API` - local dev: must match your uvicorn port (see `frontend/.env.example`)

Backend (`backend/.env` or shell env):

- `CUSTOMERS_STORE_MODE` - `demo_blob` (default) or `db`
- `DATABASE_URL` - SQLAlchemy connection URL
- `DATABASE_ECHO` - SQL logging toggle (`0` or `1`)
- `DEMO_API_KEY` - optional demo/customer endpoint protection
- Storage settings: `STORAGE_PROVIDER`, `STORAGE_LOCAL_ROOT`, `STORAGE_DEFAULT_DOWNLOAD_TTL_SECONDS`,
  `STORAGE_CONTAINER_RAW`, `STORAGE_CONTAINER_DERIVED`, `AZURE_BLOB_*`

Full env catalog:

- `docs/operations/env-vars.md`

## Deployment (Vercel + Render)

### Frontend → Vercel

- Build command: `npm run build`
- Output: `dist` (if project root is `frontend`) or `frontend/dist` (if root `vercel.json` is used)
- Required env: `VITE_API_BASE_URL`, recommended `VITE_CUSTOMERS_SOURCE=api`

### Backend → Render

- Root directory: `backend`
- Build command: `pip install --upgrade pip && pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/api/health`
- Required env: `APP_ENV=production`, `CUSTOMERS_STORE_MODE=db`, `DATABASE_URL`, CORS settings

Use [`render.yaml`](render.yaml) for reproducible setup when available.

### Production-oriented variables

- `APP_ENV` - runtime profile (`development`, `staging`, `production`)
- `STARTUP_CHECKS_STRICT` - force strict startup checks in non-production
- `CORS_ORIGINS` / `CORS_ORIGIN_REGEX` - allowed frontend origins
- Object storage: `STORAGE_PROVIDER`, `STORAGE_LOCAL_ROOT`, `AZURE_BLOB_*`

## Docs index

- Architecture overview: [`docs/architecture/overview.md`](docs/architecture/overview.md)
- ADR tech stack: [`docs/adr/ADR-0001-tech-stack.md`](docs/adr/ADR-0001-tech-stack.md)
- ADR customer API: [`docs/adr/ADR-0002-customer-api.md`](docs/adr/ADR-0002-customer-api.md)
- Object storage: [`docs/architecture/object-storage.md`](docs/architecture/object-storage.md)
- Customer API: [`docs/api/customer-api.md`](docs/api/customer-api.md)
- VAT API: [`docs/api/vat-api.md`](docs/api/vat-api.md)
- Product flow: [`docs/product/customer-flow.md`](docs/product/customer-flow.md)
- Deployment (generic): [`docs/operations/deployment.md`](docs/operations/deployment.md)
- Deployment (Vercel + Render): [`docs/operations/deployment-vercel-render.md`](docs/operations/deployment-vercel-render.md)
- Environment variables: [`docs/operations/env-vars.md`](docs/operations/env-vars.md)
- Manager demo release checklist: [`docs/operations/release-checklist-manager-demo.md`](docs/operations/release-checklist-manager-demo.md)
- Deployed smoke checklist: [`docs/operations/smoke-checklist-deployed.md`](docs/operations/smoke-checklist-deployed.md)
- Weekly progress: [`docs/progress/weekly-progress.md`](docs/progress/weekly-progress.md)
