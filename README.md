# DEMA Dashboard

DEMA Dashboard is a React + TypeScript + Vite frontend with a Python FastAPI backend.
This branch is focused on Phase 6 merge fixes and PostgreSQL/storage foundations.

## Current phase status

- Branch: `phase-6-merge-fixes`
- Focus: close merge blockers from Phase 0 and Phase 5, keep Phase 6 PostgreSQL work merge-reviewable
- Status target: move from `NOT READY TO MERGE` to `READY TO MERGE WITH CAVEATS` or better

## Repository layout

- `frontend/` - React + TypeScript + Vite client
- `backend/` - FastAPI backend, SQLAlchemy models, Alembic migrations
- `docs/` - architecture, API docs, progress logs, readiness reports

## Prerequisites

- Node.js 20+ and npm
- Python 3.11+ (3.12 also works)
- PostgreSQL (for DB mode) or SQLite (default transitional mode)

## Frontend local setup

```powershell
cd frontend
npm install
npm run dev
```

Build check:

```powershell
cd frontend
npm run build
```

## Backend local setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Backend test check:

```powershell
cd backend
python -m pytest
```

## Environment overview

Frontend (`frontend/.env` or shell env):

- `VITE_API_BASE_URL` - backend base URL, for example `http://127.0.0.1:8010`
- `VITE_CUSTOMERS_SOURCE` - `api` to use shared/demo backend source; otherwise local mode
- `VITE_DEMO_API_KEY` - optional demo API key header

Backend (`backend/.env` or shell env):

- On startup, `backend/.env` is loaded automatically (via `python-dotenv` when `app.core.config` is imported). Shell-exported variables still win if both are set.
- `CUSTOMERS_STORE_MODE` - `demo_blob` (default) or `db`
- `DATABASE_URL` - SQLAlchemy database URL (SQLite or PostgreSQL)
- `DATABASE_ECHO` - SQL logging toggle (`0` or `1`)
- `DEMO_API_KEY` - optional protection for demo/customer endpoints

Object storage foundation (Phase 6):

- `STORAGE_PROVIDER` - `local` or `azure_blob`
- `STORAGE_LOCAL_ROOT` - local object root path for dev fallback
- `AZURE_BLOB_ACCOUNT_URL` - Azure Blob account endpoint URL
- `AZURE_BLOB_CONNECTION_STRING` - optional local/dev auth path
- `AZURE_BLOB_CONTAINER_RAW` - private raw uploads container
- `AZURE_BLOB_CONTAINER_DERIVED` - private derived files container
- `STORAGE_DEFAULT_DOWNLOAD_TTL_SECONDS` - signed/proxied access TTL

## Customers mode behavior (local vs API)

- Local mode (`VITE_CUSTOMERS_SOURCE` not set to `api`):
  - Reads and writes customer state from browser local storage only.
  - History tab uses local `db.history` entries.
  - No shared stale-write conflict handling is needed.
- API mode (`VITE_CUSTOMERS_SOURCE=api`):
  - Loads/saves shared demo customer state through `/api/v1/demo/customers-db`.
  - Handles stale-write conflicts (`customers_db_conflict`) with a user-visible notice and a safe reload of latest shared data.
  - History tab prefers the official backend endpoint `/api/v1/customers/{id}/history`; falls back to local snapshot only if the endpoint is unavailable.

## Migrations

```powershell
cd backend
alembic current
alembic heads
alembic upgrade head
```

## Key docs

- Architecture overview: `docs/architecture/overview.md`
- Object storage design: `docs/architecture/object-storage.md`
- Customer API: `docs/api/customer-api.md`
- Latest merge readiness report: `docs/reviews/phase-6-merge-readiness-report.md`
