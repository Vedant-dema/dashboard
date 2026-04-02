# Deployment Guide (Vercel + Render)

This is the current deployment path for manager demos and short release cycles.

## Topology

- Frontend: Vercel
- Backend: Render web service
- Database: transitional now, PostgreSQL target in later phases

## Frontend Deployment (Vercel)

Project root:

- `frontend/`

Build settings:

- Install: `npm install`
- Build: `npm run build`
- Output: `dist`

Required frontend environment:

- `VITE_API_BASE_URL=https://<render-backend-host>`

## Backend Deployment (Render)

Project root:

- `backend/`

Runtime:

- Python

Build command:

- `pip install -r requirements.txt`

Start command:

- `uvicorn main:app --host 0.0.0.0 --port $PORT`

Health check path:

- `/api/health`

## CORS

- Set `CORS_ORIGINS` to include Vercel frontend domain(s).

## Release Checklist

1. Frontend build passes locally.
2. Backend tests pass, or backend smoke health passes if tests are not present yet.
3. Manual smoke checklist passes on deployed URLs.
4. Weekly progress log is updated with release summary.

