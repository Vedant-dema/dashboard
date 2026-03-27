# DEMA Dashboard — Feature Log Index

> **This index is maintained automatically by Cursor AI.**
> All feature entries live in `docs/feature-logs/` as daily files named `YYYY-MM-DD.md`.
> A new file is created automatically each day a feature is added.
> Do NOT edit this index manually — it is updated by the AI after every feature entry.

---

## Daily Log Files

| Date | File | Features Logged |
|------|------|-----------------|
| 2026-03-23 | [2026-03-23.md](feature-logs/2026-03-23.md) | FEATURE-001, FEATURE-007 |
| 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) | FEATURE-002, FEATURE-003, FEATURE-004, FEATURE-005, FEATURE-006, FEATURE-008, FEATURE-009, FEATURE-010, FEATURE-013 |
| 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) | FEATURE-014, FEATURE-015, FEATURE-016, FEATURE-017, FEATURE-018, FEATURE-019, FEATURE-019b, FEATURE-020, FEATURE-021, FEATURE-022, FEATURE-022b, FEATURE-023, FEATURE-024 |

---

## Full Feature Index

| # | Feature | Status | Date | Daily File |
|---|---------|--------|------|------------|
| FEATURE-001 | Dynamic Dashboard Shell | Added | 2026-03-23 | [2026-03-23.md](feature-logs/2026-03-23.md) |
| FEATURE-002 | Dashboard Layout Persistence Store | Added | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-003 | Task Notifications Store | Added | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-004 | TasksWidget — Full Task Management UI | Added | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-005 | TaskContextFields — Sub-task Context Panel | Added | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-006 | CalendarWidget — Dynamic Event Calendar | Added | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-007 | Backend VAT / VIES Proxy API | Added | 2026-03-23 | [2026-03-23.md](feature-logs/2026-03-23.md) |
| FEATURE-008 | i18n Multi-Language System (12 languages) | Added | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-009 | Header Component | Added | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-010 | Dynamic Widget Lists / Presets | Added | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-013 | VAT Check Cloud Timeout & Error Handling Fix | Modified | 2026-03-25 | [2026-03-25.md](feature-logs/2026-03-25.md) |
| FEATURE-014 | Default VIES Requester Fallback | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-015 | VIES Trader Match Fields + Customer Form Fallback | Modified | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-016 | Persist Requester Context for VIES Checks | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-017 | VIES SOAP Approx Fallback for Real Trader Data | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-018 | Strict VIES Timeout Budget Enforcement | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-019 | Website-Style VIES ms Lookup Enrichment | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-019b | VAT Response Fallback from Submitted Trader Details | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-020 | Non-null VAT Identity Fallback Strings | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-021 | Mandatory-Only VAT Request and Raw JSON Display | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-022 | Simplified One-Shot Live VAT Check | Modified | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-022b | Merge Kunde & Adresse Tabs in NewCustomerModal | Modified | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-023 | VIES Auto-Enrichment Loop and Match Cleanup | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |
| FEATURE-024 | Always-Run ms Lookup When Details Missing | Extended | 2026-03-26 | [2026-03-26.md](feature-logs/2026-03-26.md) |

<!-- NEW ROWS ARE ADDED HERE BY CURSOR AI WHEN A NEW FEATURE IS LOGGED -->

---

## [FEATURE-025] Solo IT Delivery Operating System
**Date:** 2026-03-27 
**Author/Agent:** Cursor AI 
**Status:** Added 

### What Was Added
A complete solo-delivery operating system was added to guide end-to-end execution for a one-person IT team, including a persistent time-management rule, daily execution templates, backlog governance, a daily learning workflow, and a production-readiness operating model that ties software delivery, cloud operations, AI automation, and learning into one repeatable process.

### Where It Was Added
List every file touched or created:
- `.cursor/rules/time-management-ops.mdc` — always-applied governance rule for daily planning, backlog control, and release gates
- `todo/README.md` — usage model and daily execution conventions
- `todo/templates/daily-task-template.md` — standardized daily task template
- `todo/backlog.md` — master backlog source of truth with status model
- `todo/2026-03-27.md` — initial seeded day plan
- `learner/README.md` — learning system guidance tied to backlog execution
- `learner/templates/daily-learning-template.md` — standardized daily learning template
- `learner/learning-roadmap.md` — staged learning roadmap linked to backlog IDs
- `learner/2026-03-27.md` — initial seeded day learning plan with resources
- `docs/solo-it-operating-model.md` — complete operating model, gates, metrics, and cadence
- `docs/FEATURE-LOG.md` — feature log entry for this feature

### What It Does (Technical)
Step-by-step description of the logic flow:
1. Enforces session-start discipline through an always-applied Cursor rule that requires priorities, risks, blockers, and backlog delta.
2. Standardizes daily execution with a single template for mission, priorities, do/don't rules, time blocks, blockers, and end-of-day carry-forward.
3. Centralizes backlog tracking in `todo/backlog.md` with explicit status states and weekly hygiene requirements.
4. Adds a parallel learning system that maps each learning session to active backlog work and requires applied outputs.
5. Defines production-readiness gates and operational review cadence in a dedicated operating model document.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|----|---|----|----|
| date | string (YYYY-MM-DD) | Yes | Daily file identity for `todo` and `learner` records |
| taskId | string | Yes | Unique task identifier within daily plans/backlog |
| priority | string | Yes | Task criticality level (P1/P2/etc.) |
| status | enum | Yes | `todo`, `in_progress`, `blocked`, `done`, `dropped` |
| owner | string | Yes | Responsible actor (`you` or `agent`) |
| estimate | string | Yes | Time estimate (e.g., `2h`, `1d`) |
| blocker | string | No | Active dependency or issue preventing progress |
| learningObjective | string | Yes | Daily learning target linked to backlog |
| resourceUrl | string | No | Learning reference URL used in the daily learner file |

### Database
- **Engine:** None
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|-----|---|---|----|----|
| N/A | N/A | N/A | N/A | N/A |

### State / Store (if applicable)
- **Store file:** N/A
- **Actions/Selectors added:** None
- **Persisted:** No

### i18n Keys Added
None.

### Dependencies Added
None.

### Notes / Known Limitations
The system provides structure and templates, but daily quality still depends on consistent execution discipline. Metrics logging is manual at this stage and can be automated later through scripts or dashboard tooling.
