# DEMA Dashboard

DEMA is a modernization project for legacy customer and operations workflows.

Current stack:

- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI
- Temporary deployment: Vercel (frontend) + Render (backend)

Target backend direction:

- FastAPI + Pydantic v2
- SQLAlchemy 2.0 + Alembic
- PostgreSQL
- pytest + Ruff + Black

## Repository Structure

- `frontend/`: React application
- `backend/`: FastAPI API service
- `database/`: SQL schema artifacts
- `docs/`: architecture, API, operations, product, and progress docs

## Prerequisites

- Node.js 18+ and npm
- Python 3.11+ (3.10+ works for most local tasks)

## Local Setup

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Health endpoint:

- `http://127.0.0.1:8000/api/health`

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Default app URL:

- `http://127.0.0.1:5173`

## Environment Variables

- Frontend variables: `frontend/.env.example`
- Backend variables: `backend/.env.example`
- Consolidated guide: `docs/operations/env-vars.md`

For local development, keep `VITE_API_BASE_URL` empty so Vite proxy handles `/api/*`.

## Quality Gates

Frontend:

```powershell
cd frontend
npm run build
```

Backend:

```powershell
cd backend
pytest
```

If backend tests are not available yet, run backend smoke startup and hit `/api/health`.

## Manual Smoke Checklist

Use:

- `docs/operations/smoke-checklist.md`

## Milestone Execution Model

- One branch per phase
- One PR per milestone
- One primary agent per branch
- Small commits inside each branch

Full playbook:

- `docs/operations/agent-playbook.md`

## Deployment (Current)

- Frontend: Vercel
- Backend: Render
- Guide: `docs/operations/deployment-vercel-render.md`

