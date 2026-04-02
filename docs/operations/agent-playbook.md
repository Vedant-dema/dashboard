# DEMA Agent Playbook

This file is the single source of truth for milestone execution in this repository.

## Core Workflow

- One branch per phase.
- One PR per milestone.
- One primary agent per branch.
- Small commits inside each branch.
- Do not run two agents as equal writers on the same branch at the same time.

## Branch Base Rule

- Create every phase branch from the latest `main` after the previous phase is merged.
- Standard sequence:
  - `git checkout main`
  - `git pull`
  - `git checkout -b phase-x-...`

## Phase Order

1. Phase 0: Hygiene and docs baseline
2. Phase 1A: UI stabilization
3. Phase 1B: UI redesign
4. Phase 2: Frontend architecture and repository layer
5. Phase 3: Python backend restructuring
6. Phase 4: Customer REST API
7. Phase 5: Concurrency and audit/history
8. Phase 6: PostgreSQL migration
9. Phase 7: Tests, linting, docs, CI
10. Phase 8: Deployment to Vercel + Render
11. Phase 9: Optional AI v1 after deployment

## Timeboxes

- Phase 0: 1-2 days
- Phase 1A: 2-3 days
- Phase 1B: 3-5 days
- Phase 2: 3-5 days
- Phase 3: 3-5 days
- Phase 4: 3-5 days
- Phase 5: 2-4 days
- Phase 6: 4-7 days
- Phase 7: 3-5 days
- Phase 8: 2-3 days
- Phase 9: 2-4 days

## Hard Quality Gates For Every Phase

### Frontend

- Run from `frontend/`: `npm run build`

### Backend

- Run from `backend/`: `pytest`
- If tests are not available yet, run backend smoke start and verify health endpoint:
  - startup: `uvicorn main:app --host 127.0.0.1 --port 8000`
  - health: `GET /api/health`

### Manual Smoke Checklist

- customers page opens
- create customer works
- edit customer works
- VAT flow works
- save works
- history is visible
- reload still shows correct data
- no duplicate modal shell/header/tab behavior

## Definition Of Done (Per Phase)

A phase is done only when all checks pass:

1. Phase PR is merged.
2. Frontend and backend hard gates pass.
3. Manual smoke checklist passes.
4. `docs/progress/weekly-progress.md` is updated.
5. Weekly progress contains a short manager demo note:
   - what changed
   - what risk was reduced
   - what is next

## Rollback Rule

If smoke checks fail and recovery is not a small fix:

1. Revert the milestone branch.
2. Split the scope into smaller slices.
3. Re-implement safely.

## Documentation Rule

Every milestone must update:

- `docs/progress/weekly-progress.md`
- `docs/architecture/overview.md` if architecture changed
- `docs/api/*.md` if API changed
- `README.md` if setup/run/deploy flow changed

## Branch Names

Use this naming pattern:

- `phase-0-hygiene-docs`
- `phase-1a-ui-stabilize`
- `phase-1b-ui-redesign`
- `phase-2-frontend-repository`
- `phase-3-backend-structure`
- `phase-4-customer-rest`
- `phase-5-concurrency-audit`
- `phase-6-postgres`
- `phase-7-quality-docs-ci`
- `phase-8-deployment-vercel-render`
- `phase-9-ai-customer-summary`

## PR Title Format

- `[Phase 1A] Stabilize customer modal shell and render behavior`
- `[Phase 2] Add customer repository and split customer feature`
- `[Phase 4] Add customer REST API on transitional storage`

## Tool Ownership Guidance

- Codex primary: Phase 0, 3, 4, 5, 6, 7, 8, 9
- Composer primary: Phase 1A, 1B, 2
- Never let both tools write to the same branch at once.
