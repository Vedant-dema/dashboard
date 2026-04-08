# DEMA Agent Playbook

This playbook governs branch workflow and quality gates for phase-based delivery.

## 1. Branch per phase rule

- Every phase must run on its own dedicated branch.
- Naming format: `phase-<n>-<scope>`, for example `phase-6-merge-fixes`.
- No direct implementation work on `main`.
- Merge only after phase acceptance gates are met and reviewed.

## 2. One primary agent per branch rule

- Each branch has one primary implementation agent at a time.
- Secondary support agents may assist, but the primary agent owns:
  - final change scope,
  - integration decisions,
  - merge-readiness report updates.
- Ownership transfer must be explicit in the branch notes or handoff comment.

## 3. Quality gates

Minimum required before merge review:

1. Frontend build passes (`npm run build`).
2. Backend tests pass (`pytest`) or documented smoke substitute when unavailable.
3. Alembic checks pass (`alembic current`, `alembic heads`, `alembic upgrade head`).
4. API smoke passes for health + customer list/detail/history.
5. Merge readiness report updated with blockers, verdict, and next action.
6. Working tree is commit-clean for review.

## 4. Rollback rule

- Every phase change must be reversible by commit rollback or feature-flag/config rollback.
- No destructive schema/data actions without a rollback plan in the same phase.
- If a post-merge issue appears, first action is to revert phase commits or switch runtime mode to the known-good path.

## 5. Smoke checklist

Manual or indirect verification checklist:

- Customers page opens.
- Create customer works.
- Edit customer works.
- VAT check flow works.
- Save flow works.
- History is visible and correct.
- Reload preserves correct customer state.
- No duplicate modal shell/header/tab regression.

## 6. Roadmap through Phase 8

- Phase 6 (current): PostgreSQL foundation, merge blocker closure, storage architecture seam.
- Phase 7: object storage integration in customer document workflows (service-first rollout, controlled upload/download paths).
- Phase 8: async document pipeline (OCR/previews/derived artifacts), retention lifecycle automation, operational hardening.

Each phase must end with an updated readiness report and explicit go/no-go verdict.
