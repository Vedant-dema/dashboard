# Master Backlog

Single source of truth for all planned work.

## Status legend
`todo` | `in_progress` | `blocked` | `done` | `dropped`

## Prioritized backlog
| Priority | ID | Item | Type | Sprint/Milestone | Impact | Estimate | Owner | Deadline | Status | Requirement Ref | Evidence Ref | Release Decision | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P1 | BL-001 | Stabilize production deployment pipeline | platform | M1 | High | 2d | you |  | todo | PRD-001 |  | pending | CI/CD + rollback checks |
| P1 | BL-002 | Complete release monitoring baseline | ops | M1 | High | 1d | you |  | todo | PRD-002 |  | pending | Sentry + uptime + alerts |
| P1 | BL-003 | Define MVP feature acceptance criteria | product | M1 | High | 1d | you |  | todo | PRD-003 |  | pending | Scope lock for launch |
| P2 | BL-004 | Automate weekly stakeholder report | automation | M2 | Medium | 1d | agent |  | todo | PRD-004 |  | pending | n8n summary flow |
| P2 | BL-005 | Security hardening baseline | security | M2 | Medium | 1d | you |  | todo | PRD-005 |  | pending | Secrets + dep scan |

## Backlog hygiene checklist (weekly)
- Remove duplicate tasks.
- Split tasks larger than 1 day.
- Ensure each task has deadline and owner.
- Mark blocked items with next action.
- Ensure Requirement Ref and Evidence Ref are updated for completed items.
- Mark release decision (`approved`/`deferred`/`rolled_back`) for release tasks.
