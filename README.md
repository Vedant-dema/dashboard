# DEMA Dashboard

DEMA Dashboard is a React + TypeScript + Vite frontend with a Python FastAPI backend.
This branch delivers Milestone 7 quality foundation work for a solo team: targeted
tests, lint/format baseline, CI checks, and essential documentation alignment.

## Current phase status

- Branch: `phase-7-quality-docs-ci`
- Milestone: 7 (quality foundation)
- Focus:
  - high-value backend/frontend tests
  - lint/format command baseline
  - practical CI validation
  - professional docs completion

## Repository layout

- `frontend/` - React + TypeScript + Vite client
- `backend/` - FastAPI backend, SQLAlchemy models, Alembic migrations
- `docs/` - architecture/API/operations/product/progress documentation
- `.github/workflows/` - CI workflows

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+ (3.12 recommended)
- PostgreSQL for production DB mode, SQLite for local/demo mode

## Frontend local setup

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

## Backend local setup

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

Backend (`backend/.env` or shell env):

- `CUSTOMERS_STORE_MODE` - `demo_blob` (default) or `db`
- `DATABASE_URL` - SQLAlchemy connection URL
- `DATABASE_ECHO` - SQL logging toggle (`0` or `1`)
- `DEMO_API_KEY` - optional demo/customer endpoint protection
- Storage settings:
  - `STORAGE_PROVIDER` (`local` or `azure_blob`)
  - `STORAGE_LOCAL_ROOT`
  - `STORAGE_DEFAULT_DOWNLOAD_TTL_SECONDS`
  - `STORAGE_CONTAINER_RAW`
  - `STORAGE_CONTAINER_DERIVED`
  - `AZURE_BLOB_ACCOUNT_URL`
  - `AZURE_BLOB_CONNECTION_STRING`
  - `AZURE_BLOB_CONTAINER_RAW`
  - `AZURE_BLOB_CONTAINER_DERIVED`
  - `AZURE_BLOB_SAS_UPLOAD_ENABLED`

Full env catalog:

- `docs/operations/env-vars.md`

## Key docs

- Architecture overview: `docs/architecture/overview.md`
- ADR tech stack: `docs/adr/ADR-0001-tech-stack.md`
- ADR customer API: `docs/adr/ADR-0002-customer-api.md`
- Customer API: `docs/api/customer-api.md`
- VAT API: `docs/api/vat-api.md`
- Product flow: `docs/product/customer-flow.md`
- Deployment: `docs/operations/deployment.md`
- Object storage: `docs/architecture/object-storage.md`
- Weekly progress: `docs/progress/weekly-progress.md`
