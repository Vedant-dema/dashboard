# DEMA Digital Core — Owner & Stakeholder Master Report

**Purpose:** Single narrative from **business intent → product capabilities → technology → delivery → deployment → operations**, for owners, sponsors, and leadership.  
**Detail level:** High; authoritative technical depth lives in linked documents.  
**Version:** 1.0 · **Status:** Living document  

| Item | Value |
|------|--------|
| Product | DEMA Dashboard / DEMA Digital Core |
| Repository | `Dema-Dashboard` |
| Canonical docs | [README.md](./README.md) |

**Related documents:** [Project-Report-Technical-Requirements.md](./Project-Report-Technical-Requirements.md) (TRD/TRS), [HLD.md](./HLD.md), [LLD.md](./LLD.md), [erd.md](./erd.md).

---

## Table of contents

1. [Executive summary](#1-executive-summary)  
2. [Why we are doing this](#2-why-we-are-doing-this)  
3. [What you get — product capabilities](#3-what-you-get--product-capabilities)  
4. [Technology stack (consolidated)](#4-technology-stack-consolidated)  
5. [Architecture — how it fits together](#5-architecture--how-it-fits-together)  
6. [Data and integrations](#6-data-and-integrations)  
7. [Delivery roadmap — start to production](#7-delivery-roadmap--start-to-production)  
8. [Deployment and hosting](#8-deployment-and-hosting)  
9. [Quality, security, and compliance](#9-quality-security-and-compliance)  
10. [AI and automation (roadmap)](#10-ai-and-automation-roadmap)  
11. [Success criteria and KPIs](#11-success-criteria-and-kpis)  
12. [Risks, dependencies, and open decisions](#12-risks-dependencies-and-open-decisions)  
13. [Appendix — document map and glossary](#appendix--document-map-and-glossary)  

---

## 1. Executive summary

**DEMA Digital Core** modernises how DEMA runs day-to-day operations by moving from **Microsoft Access + SQL Server** as the primary day-to-day UI pattern to a **secure web application** backed by **server-side APIs** and a **managed database** (PostgreSQL recommended, EU region).

**Today in the repository:** a rich **React (TypeScript)** single-page application with department-based navigation (Sales, Purchase, Workshop, Car wash, HRM, On-ground team), multilingual UI, dynamic dashboard, and many domain screens. Much of the **business data** in the prototype is still **local/demo** until the **Python (FastAPI)** API and PostgreSQL are wired as the system of record.

**Target operating model:** all authoritative business rules and data mutations go through **FastAPI** → **PostgreSQL** (plus optional **Redis**, **object storage**, and **workers** for async jobs). Users access only the browser app; **no database credentials** in the frontend.

**Delivery:** phased releases from UX stabilisation through API vertical slices, module migration off Access, hardening, and optional **AI** features (server-side only, governed).

---

## 2. Why we are doing this

| Driver | Explanation |
|--------|-------------|
| **Maintainability** | Access-bound clients are hard to scale, test, and deploy; a web stack fits modern DevOps. |
| **Security & compliance** | Centralised auth (e.g. Microsoft Entra), RBAC on the server, audit-friendly APIs, EU-centric hosting. |
| **User experience** | One coherent UI across Sales, Purchase, Workshop, Wash, HRM with language and role-appropriate access. |
| **Future capability** | API-first design enables mobile, integrations, reporting, and controlled AI without rewriting core domains. |

**Non-goal for early phases:** full accounting/legal certification (e.g. GoBD) or native mobile apps unless explicitly added to scope (see TRD charter).

---

## 3. What you get — product capabilities

### 3.1 Cross-cutting

| Capability | Description |
|------------|-------------|
| **Authentication** | Login (and optional signup/demo); production targets OIDC / JWT per LLD. |
| **Navigation** | Sidebar by area: Sales, Purchase, Workshop (Werkstatt), Car wash (Waschanlage), HRM, B2B portal entry, Settings, Dashboard. |
| **Dashboard** | Configurable widget grid (add/remove/resize) with charts and KPI-style widgets (Recharts). |
| **Internationalisation** | Central catalogue (e.g. DE, EN, FR); user-selectable language and theme in Settings. |
| **B2B** | Dedicated B2B portal route; production must enforce scoped auth and tenant isolation. |

### 3.2 Sales & Purchase (mirrored routes)

Many screens are **shared** between Sales and Purchase with **department context** (same components, different policy/labels where applicable). Representative areas:

| Area | User-facing focus | Example hash routes |
|------|-------------------|---------------------|
| **Customers** | Search, filters, detail drawer, stammdaten; wash profile where applicable | `#/sales/kunden`, `#/purchase/kunden` |
| **Duplicate customers** | Dedupe / merge support (UX) | `#/sales/doppelte-kunden`, … |
| **Offers** | List, filters, new offer flows | `#/sales/angebote`, … |
| **Inquiries** | Pipeline / list / create | `#/sales/anfragen`, … |
| **Inventory** | Bestand views (placeholder → API-backed) | `#/sales/bestand`, … |
| **Sold stock** | Verkaufter Bestand | `#/sales/verkaufter-bestand`, … |
| **Pickup orders** | Abholaufträge | `#/sales/abholauftraege`, … |
| **Plate search** | Kennzeichen | `#/sales/kennzeichen-suchen`, … |
| **Invoices** | List, filters, detail; new invoice placeholder until full posting API | `#/sales/rechnungen`, … |
| **Reporting** | Auswertungen placeholder / future `/reports` | `#/sales/auswertungen`, … |

### 3.3 Workshop (Werkstatt)

Extended sidebar groups (core, stock/catalogs, billing, planning) with routes overlapping Sales for shared entities (e.g. Kunden, Angebote) where the product design intends shared UX.

### 3.4 Car wash (Waschanlage)

Customer management and wash-specific extensions; routes include `waschanlage/kunden`, `waschanlage/kundenverwaltung`, `waschanlage/doppelte-kunden`, `waschanlage/rechnungen`.

### 3.5 Human resources (HRM)

| Section | Routes |
|---------|--------|
| Employees | `#/hrm/mitarbeiter` |
| Attendance | `#/hrm/anwesenheit` |
| Salary | `#/hrm/gehalt` |
| Roles & rights | `#/hrm/rollen-rechte` |

### 3.6 On-ground team (OGT)

Operational UI: team, drivers, tasks, checklists, schedule, reports (`#/on-ground-team/...`).

### 3.7 Module map (engineering IDs)

For planning and contracts, domains align with **HLD §9** (excerpt):

| Module ID | Business meaning |
|-----------|------------------|
| CORE-AUTH / CORE-ADMIN | Login, roles, settings |
| DASH | Dynamic dashboard |
| B2B | Partner portal |
| SALES-CUST, SALES-INV, SALES-OFF, SALES-LEAD, … | Sales/customer/stock/offers/leads/invoices/reporting |
| PUR-* | Purchase mirrors with stricter RBAC |
| WS-* | Workshop orders, parts, catalogs, cash, suppliers |
| WASH | Wash lane + `kunden_wash` |
| HRM | HR screens and future payroll integration |
| OGT | On-ground logistics and checklists |

---

## 4. Technology stack (consolidated)

### 4.1 Frontend (current repository)

| Layer | Technology |
|-------|------------|
| UI | **React 18**, **TypeScript** |
| Build | **Vite 6** |
| Styling | **Tailwind CSS 3**, **PostCSS** |
| Charts / dashboard | **Recharts**; **react-grid-layout**, **react-resizable** |
| Icons | **lucide-react** |
| Routing | **Hash-based** (`#/…`) |
| HTTP | **fetch** (thin API client to be standardised) |
| State | **React Context** (auth, i18n); **TanStack Query** recommended for server state |

### 4.2 Backend (target)

| Layer | Technology |
|-------|------------|
| Runtime | **Python 3.12+** |
| API | **FastAPI**, **Uvicorn** (dev), **Gunicorn + Uvicorn workers** (prod option) |
| Validation / settings | **Pydantic v2**, **pydantic-settings** |
| ORM / SQL | **SQLAlchemy 2.x** |
| Migrations | **Alembic** |
| Auth | **Microsoft Entra ID (OIDC)** preferred; or **JWT** + refresh if IdP deferred |
| Async work | **Celery** / **RQ** / **Arq** + **Redis** |
| Observability | **OpenTelemetry** → APM (e.g. Azure Monitor, Grafana) |
| Tests | **pytest**, **httpx** AsyncClient |

### 4.3 Data and platform

| Component | Technology |
|-----------|------------|
| Primary database | **PostgreSQL 15+** (managed, EU); optional **Azure SQL** per ADR |
| Cache / queue | **Redis** |
| Files / exports | **Object storage** (S3-compatible / Azure Blob) |
| Containers | **Docker**; local **Docker Compose** |
| IaC | **Terraform** or **Bicep** (Azure) |
| CI/CD | **GitHub Actions** |
| Secrets | **Key Vault** / cloud secret manager — never in Git or client bundle |

---

## 5. Architecture — how it fits together

**Logical flow:**

1. User opens the **SPA** (static assets from CDN or static host).  
2. Browser calls **HTTPS JSON APIs** under `/api/v1/…`.  
3. **FastAPI** validates authZ, runs domain services, reads/writes **PostgreSQL**.  
4. Optional: **Redis** (cache, rate limits, job queue); **workers** for PDF, email, OCR, embeddings.  
5. Optional: **LLM provider** called **only from backend** (never from the Vite bundle).

A sequence diagram and technology strips are in **HLD §11**. API groups (auth, users, kunden, anfrage, angebot, bestand, rechnung, werkstatt, wash, hrm, b2b, reports, ai) are defined in **HLD §6**.

**Rule:** Business invariants and authorisation **must** live in **Python** (and DB constraints), not only in the React app.

---

## 6. Data and integrations

- **Canonical schema:** `database/schema.sql` and narrative **erd.md** (entities: `kunden`, `anfrage`, `bestand`, `angebot`, `rechnung`, `abholauftrag`, roles, wash extension, etc.).  
- **Migration:** legacy **SQL Server** read-only during transition; ETL via Python or enterprise tools (ADF/SSIS).  
- **Integrations (typical):** email, identity provider, optional ERP/export, government APIs for plate search if licensed, future webhooks.

---

## 7. Delivery roadmap — start to production

### 7.1 Outcome phases (strategic)

| Phase | Outcome |
|-------|---------|
| **O1 — UX foundation** | Navigable SPA, i18n, auth shell, representative pages (demo data). |
| **O2 — API foundation** | FastAPI + Postgres; first vertical slice (e.g. full **kunden** API). |
| **O3 — Module migration** | Repeat per domain; retire Access for those modules. |
| **O4 — Hardening** | Security review, performance tests, DR drill, SLOs in production. |
| **O5 — AI (optional)** | Controlled AI behind feature flags. |

### 7.2 Release plan (indicative)

| Release | Window | Theme |
|---------|--------|--------|
| **R0** | T+0–4 weeks | Stabilise frontend, CI, docs |
| **R1** | T+1–3 months | API skeleton + **kunden** read/write + frontend wired |
| **R2** | T+3–6 months | Core sales flows APIs (Angebote, Anfragen, Rechnungen) |
| **R3** | T+6–9 months | Workshop + wash APIs |
| **R4** | T+9–12 months | HRM + reporting / exports |
| **R5** | T+12+ months | AI phase 1 (e.g. FAQ/RAG) |

*Calendar is indicative — adjust with Product Owner and capacity (full detail in TRD §5).*

### 7.3 Delivery artefacts (each release)

Container images (API/worker), DB migrations, static SPA build, OpenAPI snapshot, release notes, updated requirements where scope changes (TRD §15).

---

## 8. Deployment and hosting

- **Region:** EU primary (e.g. Germany West Central, `eu-central-1`, `europe-west3`).  
- **Pattern:** static SPA + containerised API + managed PostgreSQL + private networking; WAF/CDN at edge (see **HLD §7** for Azure/AWS/GCP examples).  
- **Rollback:** versioned images and SPA assets; DB changes prefer backward-compatible migrations; feature flags for risky features (TRD §15).  
- **Operations:** runbooks for deploy, backup/restore, secrets, incidents, scaling (TRD §14.2, §16).  
- **SLO baseline (production examples):** monthly availability target **≥ 99.5%**; API p95 and error-rate targets per environment table in **TRD §3.2.1**.

---

## 9. Quality, security, and compliance

| Area | Summary |
|------|---------|
| **Testing** | Unit, integration, component tests; E2E recommended (Playwright/Cypress); UAT scripts (TRD §11–12). |
| **Security** | TLS, OIDC/JWT, server-side RBAC, OWASP ASVS-oriented API hardening, dependency scanning, container scanning (HLD §10, TRD §17). |
| **Privacy** | EU residency default, PII minimisation in logs, retention policies, DPA for subprocessors including optional AI (TRD §17). |
| **Accessibility** | Target **WCAG 2.1 AA** for critical flows (iterative). |

---

## 10. AI and automation (roadmap)

- **Principle:** No LLM keys or direct model calls in the browser; all generative/embedding use **Python** services with quotas, audit, and RBAC (**HLD §8**).  
- **Examples of planned capabilities:** natural-language inventory/FAQ, semantic customer search, document OCR/extraction, draft replies/offers (human confirmation), duplicate customer hints.  
- **Phased:** foundations → read-only assist → domain integration → drafting (HLD §8.10).

---

## 11. Success criteria and KPIs

Aligned with **TRD §8** and charter:

| # | Criterion | Typical measurement |
|---|-----------|---------------------|
| S1 | Functional coverage vs legacy journeys | % of critical journeys on web + API per module |
| S2 | Quality | CI green; post-UAT defect density |
| S3 | Security | No critical/high open at go-live; pen-test remediated |
| S4 | Performance | API p95 and LCP within agreed budgets |
| S5 | Adoption | Active users on web vs Access (per module) |
| S6 | Data integrity | Reconciliation vs legacy after cutover |
| S7 | Operability | Successful backup/restore and incident drills |

---

## 12. Risks, dependencies, and open decisions

| Type | Examples |
|------|----------|
| **Dependencies** | SQL Server access for ETL; Entra app registration; cloud subscription; legal DPA if external AI. |
| **Risks** | Migration complexity; data quality; cutover order; third-party API availability. |
| **Open decisions** | Final IdP configuration; module cutover order; external reporting tool (TRD §7.4). |

Architecture decisions should be recorded as **ADRs** (`docs/adr/`, template in `adr/000-template.md`).

---

## Appendix — document map and glossary

### A. Where to read more

| Document | Audience | Content |
|----------|----------|---------|
| [README.md](./README.md) | Everyone | Index of canonical docs |
| **This report** | Owners, sponsors | End-to-end narrative |
| [Project-Report-Technical-Requirements.md](./Project-Report-Technical-Requirements.md) | PO, engineering, QA, ops | Full FR/NFR, delivery, SLAs, compliance, traceability |
| [HLD.md](./HLD.md) | Architects, leads | Stack, modules, cloud, AI depth |
| [LLD.md](./LLD.md) | Developers | REST, errors, DTOs, security implementation |
| [erd.md](./erd.md) | Data / backend | Entity model and relationships |

### B. Glossary (short)

| Term | Meaning |
|------|--------|
| **SPA** | Single-page application (one web app, client-side navigation). |
| **API** | Backend HTTP JSON services (`/api/v1/…`). |
| **RBAC** | Role-based access control (enforced on server). |
| **OIDC** | OpenID Connect (modern SSO with Entra etc.). |
| **ETL** | Extract–transform–load (legacy → new database). |
| **SLO / SLA** | Service level objective / agreement (uptime, latency). |
| **ADR** | Architecture Decision Record. |

---

## Document control

| Version | Date | Notes |
|---------|------|--------|
| 1.0 | 2026-03-20 | Initial owner master report consolidating TRD, HLD, LLD, ERD, and codebase routes |

*For formal approval workflow, see TRD §0.*
