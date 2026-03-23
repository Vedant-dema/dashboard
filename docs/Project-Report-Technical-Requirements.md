# DEMA Digital Core — Project Report & Technical Requirements Document (TRD)

| Field | Value |
|-------|--------|
| Document type | Project report + technical requirements |
| Product | DEMA Dashboard / DEMA Digital Core (web client + target platform) |
| Repository | `Dema-Dashboard` |
| Related artefacts | [HLD.md](./HLD.md), [LLD.md](./LLD.md), [erd.md](./erd.md), [Architecture-Diagrams.md](./Architecture-Diagrams.md), [Blueprint-Azure-Complete.md](./Blueprint-Azure-Complete.md) |
| Version | 1.0 |
| Status | Living document — update on major scope or release changes |

---

## Table of contents

1. [Vision statement](#1-vision-statement)  
2. [Project charter](#2-project-charter)  
3. [Software requirements](#3-software-requirements)  
4. [Project management plan](#4-project-management-plan)  
5. [Release plan](#5-release-plan)  
6. [Iteration plan](#6-iteration-plan)  
7. [Note on understanding](#7-note-on-understanding)  
8. [Criteria for project success](#8-criteria-for-project-success)  
9. [Architecture and design](#9-architecture-and-design)  
10. [Coding standards](#10-coding-standards)  
11. [Test plan](#11-test-plan)  
12. [Test case specification](#12-test-case-specification)  
13. [User guide](#13-user-guide)  
14. [System documentation](#14-system-documentation)  

---

## 1. Vision statement

### 1.1 Purpose

**DEMA Digital Core** aims to modernise DEMA’s operational software landscape by replacing the **sole reliance on Microsoft Access clients and SQL Server** as the primary interactive pattern with a **secure, browser-based enterprise application** that:

- Preserves and improves **core business capabilities** (customers, offers, inquiries, inventory, invoices, workshop, car wash, HRM, B2B, reporting).
- Provides a **single coherent user experience** across departments (Sales, Purchase, Workshop, Car wash) with **role-appropriate access** and **multilingual** UI.
- Establishes a **maintainable technical foundation**: **React (TypeScript)** for the UI, **Python (FastAPI)** for authoritative APIs, and a **managed relational database** (PostgreSQL recommended), deployable on **cloud infrastructure** with **observability**, **security**, and a path to **AI-assisted** features under governance.

### 1.2 Strategic outcomes

| # | Outcome |
|---|---------|
| V1 | Users can perform day-to-day work in a **web dashboard** aligned with legacy screen families (Kunden, Angebote, Rechnungen, Werkstatt, etc.) without installing Access runtime for new workflows. |
| V2 | **Authoritative business data** is owned by **server-side services** and **database constraints**, not by browser-only logic. |
| V3 | The platform supports **incremental migration** from legacy SQL Server: bridge schemas, ETL, and cutover per module. |
| V4 | The architecture allows **optional AI** (RAG, document understanding, drafts) **only** through audited, server-side APIs. |

### 1.3 Vision alignment (non-goals for v1 UI prototype)

The current repository emphasises **frontend richness** and **local demo persistence** to validate UX and domain grouping. The vision explicitly requires that **production** behaviour follows **HLD/LLD**: APIs + PostgreSQL as system of record.

---

## 2. Project charter

### 2.1 Scope — in scope

| Area | Description |
|------|-------------|
| **Web application** | SPA: dashboard, department-specific pages (Sales, Purchase, Workshop, Car wash), HRM, settings, B2B portal entry, authentication screens. |
| **Domain coverage (target)** | Customers (`kunden`), inquiries (`anfragen`), offers (`angebote`), inventory (`bestand`), invoices (`rechnung`), pickup orders, plate search, duplicate customers, workshop menus, wash extension, on-ground team workflows, reports placeholders. |
| **Internationalisation** | Multiple languages via central message catalogue (e.g. DE, EN, FR, IT overrides). |
| **Documentation** | HLD, LLD, ERD, architecture diagrams, Azure blueprint, this TRD. |
| **Data model baseline** | `database/schema.sql` and `docs/erd.md` as canonical references for backend implementation. |

### 2.2 Scope — out of scope (unless added by change request)

| Item | Rationale |
|------|-----------|
| Full **production** FastAPI deployment in this repo (if absent) | May be delivered in separate service repo; TRD still defines requirements. |
| **Legacy Access** feature parity in one release | Phased module cutover. |
| **Accounting certification** (GoBD, etc.) | Requires legal/process sign-off beyond software scope. |
| **Mobile native apps** | Web-first; PWA optional later. |

### 2.3 Stakeholders (typical)

| Role | Interest |
|------|----------|
| Business owners | Correct processes, training cost, cutover risk. |
| End users (Sales, Workshop, Wash, HRM) | Usability, speed, reliability. |
| IT / operations | Hosting, security, backups, monitoring. |
| Development team | Clear requirements, testability, standards. |
| Compliance / security | Data residency, access control, audit. |

### 2.4 Authority and change control

- **Product owner** approves scope changes to this document and release objectives.
- **Technical lead** approves architecture deviations from HLD/LLD (documented as ADR).
- **Critical defects** in production may trigger **hotfix** releases outside the normal iteration cadence.

---

## 3. Software requirements

### 3.1 Functional requirements

Functional requirements are grouped by capability. IDs are stable for traceability (FR-xxx).

#### 3.1.1 Authentication and session

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | The system SHALL provide a **login** flow for authenticated access to the dashboard. | Must |
| FR-AUTH-02 | The system MAY provide **signup** and **demo account** for evaluation environments. | Should |
| FR-AUTH-03 | Unauthenticated users requesting protected routes SHALL be redirected to login (or equivalent). | Must |
| FR-AUTH-04 | Target production SHALL integrate **OIDC / JWT** per LLD; session invalidation and refresh SHALL be server-defined. | Must (prod) |

#### 3.1.2 Navigation and departments

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-NAV-01 | The system SHALL provide a **sidebar** grouped by **Sales**, **Purchase**, **Workshop**, **Car wash**, **HRM**, and global entries (dashboard, B2B portal, settings). | Must |
| FR-NAV-02 | Hash-based routes (e.g. `#/sales/kunden`) SHALL resolve to the correct page module. | Must |
| FR-NAV-03 | **Purchase** routes that mirror **Sales** SHALL open the **same page component** with **department context** set to Purchase where applicable. | Must |

#### 3.1.3 Customers (Kunden)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-KUN-01 | Users SHALL be able to **search and filter** customers (quick search, extended filters). | Must |
| FR-KUN-02 | Users SHALL be able to **open a detail drawer** and edit **stammdaten** (demo/local persistence acceptable until API exists). | Must (UX) |
| FR-KUN-03 | **Wash** profile (`kunden_wash`) SHALL be editable where designed in UI. | Should |
| FR-KUN-04 | Production SHALL persist customers via **`/api/v1/kunden`** per LLD. | Must (prod) |

#### 3.1.4 Offers, inquiries, inventory (Sales/Purchase)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-ANG-01 | Offers list with filters and **new offer** flow (demo acceptable pre-API). | Must (UX) |
| FR-ANF-01 | Inquiries list and creation flow. | Must (UX) |
| FR-BEST-01 | Inventory views placeholder or list until API wired. | Should |

#### 3.1.5 Invoices (Rechnungen)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-REC-01 | Invoice **list** with **filtering** and **row selection** for detail view. | Must |
| FR-REC-02 | **New invoice** SHALL show a **structured placeholder form** (legacy-style sections) until full API and posting exist. | Should |
| FR-REC-03 | Full **line items, tax, print, payment posting** SHALL be implemented with **backend rules** in a later release. | Must (roadmap) |

#### 3.1.6 Workshop, car wash, HRM, OGT

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-WS-01 | Workshop sidebar groups (core, stock/catalogs, billing, planning) with routes. | Must |
| FR-WASH-01 | Car wash–specific customer extension in customer UI where specified. | Should |
| FR-HRM-01 | HRM sections (employees, attendance, salary, roles) routed and displayed. | Must |
| FR-OGT-01 | On-ground team page with checklists / operational UI as designed. | Should |

#### 3.1.7 Dashboard and widgets

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-DASH-01 | Configurable **widget grid** with add/remove/resize (within constraints). | Must |
| FR-DASH-02 | Widget titles and groups SHALL respect **i18n** keys where defined. | Should |

#### 3.1.8 Settings and i18n

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-SET-01 | User can change **language**, **theme**, and related display settings; selection SHALL apply across the app. | Must |
| FR-I18N-01 | New UI strings SHOULD use the translation helper with keys in `LanguageContext` (or successor). | Should |

#### 3.1.9 B2B portal

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-B2B-01 | Public or partner-facing **B2B portal** route exists; production MUST enforce **scoped auth** and **data isolation**. | Must |

### 3.2 Non-functional requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-PERF-01 | Performance | Primary list screens SHOULD render initial frame < 2s on typical office hardware (excluding network); API p95 targets defined per LLD when live. |
| NFR-AVAIL-01 | Availability | Production target **99.5%** monthly (adjust per contract); maintenance windows communicated. |
| NFR-SEC-01 | Security | HTTPS only; **no secrets** in frontend bundle; OWASP ASVS alignment for auth and input validation on API. |
| NFR-SEC-02 | Authorisation | RBAC enforced **server-side**; UI hiding is not sufficient. |
| NFR-DATA-01 | Privacy | EU data residency default; PII minimisation in logs; retention policy documented. |
| NFR-ACC-01 | Accessibility | Target WCAG 2.1 Level AA for critical flows (iterative improvement). |
| NFR-I18N-01 | Locale | Date/number formatting consistent with selected language/region. |
| NFR-MAINT-01 | Maintainability | TypeScript `strict`; Python typed services; documented module boundaries. |
| NFR-OBS-01 | Observability | Correlation IDs, structured logs, metrics for API latency and errors. |
| NFR-PORT-01 | Portability | Application containers and DB abstraction allow **Azure or AWS** hosting (cloud ADR). |

### 3.3 Implementation requirements

| ID | Requirement |
|----|-------------|
| IMP-01 | Frontend: **React 18**, **TypeScript**, **Vite**, **Tailwind CSS** (versions per `frontend/package.json`). |
| IMP-02 | Backend (target): **Python 3.12+**, **FastAPI**, **Pydantic v2**, **SQLAlchemy 2.x**, **Alembic**. |
| IMP-03 | API base path **`/api/v1/`**; OpenAPI published; error model per LLD. |
| IMP-04 | Database: **PostgreSQL** canonical DDL in `database/schema.sql`; migrations via Alembic. |
| IMP-05 | CI: **GitHub Actions** — at minimum `npm ci && npm run build` for frontend; extend with API tests and IaC. |
| IMP-06 | IaC: **Terraform** (or Bicep) for cloud resources; state remote + locking. |
| IMP-07 | AI: any LLM calls **only** from backend; quotas and audit per HLD §8. |

---

## 4. Project management plan

### 4.1 Objectives (expected project outcome)

| Phase | Outcome |
|-------|---------|
| **O1 — UX foundation** | Navigable SPA with department routes, i18n, auth shell, representative pages for main domains (demo data). |
| **O2 — API foundation** | FastAPI service with auth, first vertical slice (e.g. `kunden` CRUD + search) backed by PostgreSQL. |
| **O3 — Module migration** | Repeat vertical slices per domain; deprecate Access for those modules. |
| **O4 — Hardening** | Security review, performance test, DR drill, production SLOs. |
| **O5 — AI (optional)** | Controlled AI endpoints behind feature flags. |

### 4.2 Roles and responsibilities (RACI summary)

| Activity | Dev team | Tech lead | PO | Ops |
|----------|----------|-----------|----|-----|
| Feature delivery | R | A | C | I |
| HLD/LLD updates | C | A | I | I |
| Production deploy | C | A | I | R |
| Security sign-off | C | A | I | C |

(R=Responsible, A=Accountable, C=Consulted, I=Informed)

### 4.3 Communication

- **Sprint review** demo every iteration.
- **Risk register** reviewed monthly (migration, data quality, third-party APIs).
- **Incident process**: severity levels, on-call rotation when production exists.

### 4.4 Dependencies

- Legacy **SQL Server** access for ETL.
- **Identity provider** (Entra or interim JWT).
- **Cloud subscription** and networking (private DB, secrets).
- Legal **DPA** if using external AI providers.

---

## 5. Release plan

Indicative **calendar** — adjust to team capacity and PO priorities.

| Release | Target window | Theme | Deliverables |
|---------|---------------|-------|--------------|
| **R0** | T+0–4 weeks | Stabilise frontend | Build green, lint, critical bugfixes, docs index. |
| **R1** | T+1–3 months | API slice 1 | FastAPI skeleton, Postgres, `kunden` read/write API, frontend wired with TanStack Query. |
| **R2** | T+3–6 months | Core sales flows | Angebote, Anfragen, Rechnungen list + detail APIs; reduce localStorage for those entities. |
| **R3** | T+6–9 months | Workshop + wash | Werkstatt APIs; wash extension APIs. |
| **R4** | T+9–12 months | HRM + reporting | HRM APIs; export/report jobs. |
| **R5** | T+12+ months | AI phase 1 | RAG/FAQ or document job pipeline behind flags. |

**Hotfix:** As needed for security or production outages.

---

## 6. Iteration plan

Assuming **2-week sprints**.

### 6.1 Standard iteration activities

| Day / phase | Activity |
|-------------|----------|
| Start | Sprint planning: goals, backlog pull, capacity |
| Daily | Stand-up; unblock; update board |
| Mid | Technical design for complex items; spike timeboxed |
| End | Code complete; PR review; merge to `main` |
| End | Sprint review + retrospective |
| Continuous | Update docs for behaviour-changing work |

### 6.2 Definition of Done (DoD)

- Code merged to `main` with **passing CI** (build + tests when present).
- **LLD/API** updated if contracts change.
- **User-visible** changes noted in changelog or release notes.
- No **known critical** defects open for the story.

### 6.3 Backlog hygiene

- Epics align with **module map** in HLD §9.
- Stories link to **FR-xxx** / **NFR-xxx** where possible.
- Spikes timeboxed (e.g. 2 days) with written outcome.

---

## 7. Note on understanding

### 7.1 Assumptions

1. **Business rules** from legacy Access remain authoritative until explicitly superseded by signed-off specifications.
2. **German** remains the primary business language; EN/FR/IT are UI translations, not legal text substitution without review.
3. **Demo mode** (localStorage, seed data) is **not** a substitute for production persistence.
4. Cloud provider may be **Azure or AWS**; reference blueprint in repo uses **Azure** as one deep example — not an exclusive mandate unless ADR says so.

### 7.2 Intentions

- **Single write path** through API (LLD).
- **Department context** (`sales` | `purchase` | `werkstatt` | `waschanlage`) drives labels and future row-level policy.
- **Purchase/Sales shared pages** intentionally avoid duplicated code paths for the same UX.

### 7.3 Verbal agreements (placeholder)

> *Record here any verbal agreements with dates and participants, e.g. “2026-03-01: PO confirmed invoice form v1 is list+detail only until Q3.”*

*(None recorded in this template — fill in as needed.)*

### 7.4 Open questions

- Final **IdP** (Entra tenant, app registration, B2B).
- **Cutover order** per module (customer-first vs invoice-first).
- **Reporting** tool (in-app only vs Power BI / external).

---

## 8. Criteria for project success

| # | Criterion | Measurement |
|---|-----------|-------------|
| S1 | **Functional coverage** | % of legacy-critical journeys available in web app with API backing (tracked per module). |
| S2 | **Quality** | CI green; defect density below agreed threshold post–UAT. |
| S3 | **Security** | No critical/high findings open at go-live; penetration test remediated. |
| S4 | **Performance** | API p95 and LCP within agreed budgets. |
| S5 | **Adoption** | % active users on web vs Access (per module). |
| S6 | **Data integrity** | Reconciliation reports between legacy and new DB within tolerance after cutover. |
| S7 | **Operability** | Runbooks executed: backup restore, incident response drill. |

**Minimum go-live bar:** S2, S3, S6 for in-scope modules; S1 agreed with PO.

---

## 9. Architecture and design

### 9.1 Logical architecture

```
[Browser] → HTTPS → [CDN / Static host] → React SPA
                 ↘ HTTPS → [FastAPI] → PostgreSQL
                                    → Redis (queue/cache)
                                    → Object storage
                                    → (optional) AI provider
```

### 9.2 Repository layout (current / target)

| Path | Responsibility |
|------|----------------|
| `frontend/src/App.tsx` | Hash routing, auth gate, page switcher |
| `frontend/src/pages/` | Screen-level modules |
| `frontend/src/components/` | Reusable UI (sidebar, header, modals) |
| `frontend/src/contexts/` | Auth, language |
| `frontend/src/store/` | Demo/local persistence (to be replaced by API client) |
| `frontend/src/widgets/` | Dashboard widgets |
| `frontend/src/types/` | Shared TS types |
| `database/schema.sql` | Canonical DDL reference |
| `docs/` | HLD, LLD, ERD, diagrams, TRD (this file) |
| `backend/app/` (target) | `api/v1/`, `core/`, `services/`, `repositories/`, `models/`, `schemas/` |

### 9.3 Key design decisions

- **Hash routing** for SPA simplicity; History API optional later.
- **Context** for cross-cutting UX state; **TanStack Query** recommended for server state when APIs exist.
- **Domain-driven** backend packages per LLD §4.
- **AI** only via dedicated service layer (HLD §8).

### 9.4 References

- [HLD.md](./HLD.md) — stack, modules, AI phases.  
- [LLD.md](./LLD.md) — REST, errors, DTOs, idempotency.  
- [Architecture-Diagrams.md](./Architecture-Diagrams.md) — C4-style diagrams.  
- [erd.md](./erd.md) — entity relationships.  

---

## 10. Coding standards

### 10.1 TypeScript / React

| Rule | Detail |
|------|--------|
| Language | TypeScript **strict**; avoid `any` except justified escape hatches. |
| Components | Prefer function components; hooks for state and effects. |
| Files | PascalCase for components; camelCase for utilities. |
| Styling | Tailwind utility classes; avoid inline styles except dynamic values. |
| i18n | Use `t("key", "fallback")` pattern; add keys to all primary languages or document partial override strategy. |
| Imports | Group: external → internal → relative; no circular dependencies. |
| Accessibility | Semantic HTML; labels for inputs; keyboard navigable controls. |

### 10.2 Python (backend)

| Rule | Detail |
|------|--------|
| Style | **ruff** + **black** (or ruff format); line length 100–120 per team choice. |
| Types | Annotate public functions; Pydantic models for I/O. |
| Layers | Routers thin; business logic in `services/`; DB in `repositories/`. |
| Async | Prefer async routes when I/O bound; document sync exceptions. |

### 10.3 Git

| Rule | Detail |
|------|--------|
| Branches | `main` protected; feature branches `feature/…`, fixes `fix/…`. |
| Commits | Conventional commits optional but recommended: `feat:`, `fix:`, `docs:`. |
| PRs | At least one review for `main`; CI must pass. |

### 10.4 Security

- No secrets in repository; use `.env` local only (gitignored).
- Dependency updates monthly or on CVE alert.

---

## 11. Test plan

### 11.1 Objectives

- Verify **functional requirements** (§3.1) for each release.
- Guard **non-functional** attributes (§3.2) where automatable.
- Prevent regressions on **critical paths** (auth, navigation, core CRUD).

### 11.2 Test levels

| Level | Scope | Tools |
|-------|--------|--------|
| Unit | Functions, hooks, pure reducers, service helpers | Vitest, pytest |
| Integration | API + DB, router + service | pytest + httpx, Testcontainers optional |
| Component | React components with RTL | Vitest + React Testing Library |
| E2E | Critical user journeys | Playwright or Cypress (recommended add) |
| Manual / UAT | Business acceptance | Test scripts from §12 |

### 11.3 Entry / exit criteria

- **Entry:** Story DoD met; build passes; feature behind flag if risky.
- **Exit:** No open **blocker** bugs; NFR spot-checks passed for release scope.

### 11.4 Environments

| Env | Purpose |
|-----|---------|
| Local | Developer machines |
| CI | Automated pipelines |
| Staging | Pre-prod integration |
| Production | Live users |

---

## 12. Test case specification

Sample **traceable** test cases (expand in test management tool).

### 12.1 Authentication

| TC-ID | Preconditions | Steps | Expected result |
|-------|-----------------|-------|-----------------|
| TC-AUTH-01 | Logged out | Open `#/sales/kunden` | Redirect to login or auth wall |
| TC-AUTH-02 | Valid demo user | Submit login | Land on dashboard or return URL |
| TC-AUTH-03 | Logged in | Click logout | Session cleared; protected routes blocked |

### 12.2 Navigation

| TC-ID | Preconditions | Steps | Expected result |
|-------|-----------------|-------|-----------------|
| TC-NAV-01 | Logged in | Click Sales → Kunden | `#/sales/kunden` loads Customers page |
| TC-NAV-02 | Logged in | Open Purchase → Kunden | Same Customers page with Purchase area label |

### 12.3 Customers

| TC-ID | Preconditions | Steps | Expected result |
|-------|-----------------|-------|-----------------|
| TC-KUN-01 | Customers page | Enter quick search text | List filters |
| TC-KUN-02 | List non-empty | Click row | Detail drawer opens |
| TC-KUN-03 | Drawer open | Edit field, save (when API live) | Persisted; toast or refresh confirms |

### 12.4 Invoices

| TC-ID | Preconditions | Steps | Expected result |
|-------|-----------------|-------|-----------------|
| TC-REC-01 | Rechnungen page | Apply date filter | Rows match filter |
| TC-REC-02 | Rechnungen page | Click Neue Rechnung | Drawer shows placeholder form + hint text |
| TC-REC-03 | Row selected | Open detail | Fields match row |

### 12.5 i18n

| TC-ID | Preconditions | Steps | Expected result |
|-------|-----------------|-------|-----------------|
| TC-I18N-01 | Settings | Change language to EN | Sidebar and main labels switch |

### 12.6 API (when live)

| TC-ID | Preconditions | Steps | Expected result |
|-------|-----------------|-------|-----------------|
| TC-API-01 | Valid JWT | `GET /api/v1/kunden` | `200` + JSON list schema per OpenAPI |
| TC-API-02 | No token | `GET /api/v1/kunden` | `401` |

---

## 13. User guide

### 13.1 Audience

Internal DEMA users (Sales, Purchase, Workshop, Car wash, HRM) and administrators.

### 13.2 Getting started

1. Open the **URL** provided by IT (e.g. `https://app.dema.example`).
2. **Log in** with company credentials (or demo account in training).
3. Use the **left sidebar** to choose your area: **Sales**, **Purchase**, **Werkstatt**, **Waschanlage**, or **HRM**.
4. Click **Dashboard** (`#/`) for the widget overview.

### 13.3 Common tasks

| Task | Steps |
|------|--------|
| Find a customer | Sales/Purchase/Werkstatt → **Kunden** → use quick search or filters → click row for details. |
| Create customer | **Kunden** → **Add customer** (or equivalent) → fill form → save. |
| Work with offers | **Angebote** → filter → open row or create new. |
| Invoices | **Rechnungen** → filter list → click row for detail; **Neue Rechnung** opens the placeholder until full posting is live. |
| Change language | **Settings** → **Language** → choose → apply. |
| B2B portal | **B2B Portal** from sidebar (may be public or partner login per deployment). |

### 13.4 Troubleshooting (users)

| Problem | Suggestion |
|---------|------------|
| Blank after login | Refresh; clear cache; contact IT if persists. |
| Wrong department labels | Confirm sidebar section; Purchase vs Sales uses same screens with different area tag. |
| Data “lost” after refresh (demo) | Demo may use browser storage; production will sync to server — report discrepancies to IT. |

### 13.5 Support escalation

L1: internal super-user → L2: IT helpdesk → L3: development team with **correlation ID** from error screen if shown.

---

## 14. System documentation

### 14.1 Document map

| Document | Purpose |
|----------|---------|
| [HLD.md](./HLD.md) | Technology stack, modules, cloud, AI strategy |
| [LLD.md](./LLD.md) | API contracts, errors, security implementation rules |
| [erd.md](./erd.md) | Data model narrative and diagrams |
| [Architecture-Diagrams.md](./Architecture-Diagrams.md) | C4-style and flow diagrams |
| [Blueprint-Azure-Complete.md](./Blueprint-Azure-Complete.md) | Azure-specific deployment blueprint |
| [database/schema.sql](../database/schema.sql) | SQL DDL |
| [database/README.md](../database/README.md) | DB usage notes (if present) |
| **This TRD** | Requirements, planning, testing, user guide index |

### 14.2 Operational runbooks (to maintain in ops wiki)

- Deployment procedure (GitHub Actions + Terraform apply order).
- Backup and restore PostgreSQL.
- Secret rotation (Key Vault / Secrets Manager).
- Incident response and escalation.
- Scaling playbook (Container Apps / ECS replicas).

### 14.3 API documentation

- **OpenAPI 3** served at `/docs` (development) or published static artefact (production).
- Postman/Insomnia collections generated from OpenAPI optional.

### 14.4 Versioning

- This document: **semantic** minor updates for scope/requirement changes; major for restructuring.
- Align **release tags** in Git with release plan (§5).

---

## Document history

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-03-20 | Project | Initial TRD + project report structure |

---

*End of document.*
