# DEMA Digital Core — Architecture Diagrams Pack

Professional diagram set for frontend, backend, APIs, database, cloud runtime, and Terraform/IaC.

**Single-cloud deep dive (Azure + logos + provisioning checklist):** [Blueprint-Azure-Complete.md](./Blueprint-Azure-Complete.md).

## 1) Visual legend and service logos

Use these names consistently in slides and docs:

| Layer | Service name | Suggested logo/brand |
|------|---------------|----------------------|
| Frontend | React SPA (Vite) | React, TypeScript, Vite, Tailwind |
| API | FastAPI Gateway | FastAPI, Python |
| Data | PostgreSQL | PostgreSQL |
| Cache/Queue | Redis | Redis |
| Workers | Celery/RQ Workers | Python, Celery |
| AI (phase) | AI Orchestrator | OpenAI / Azure OpenAI / Anthropic (provider choice) |
| IaC | Terraform | Terraform |
| CI/CD | GitHub Actions | GitHub |
| Cloud edge | CDN + WAF + LB | Azure Front Door / CloudFront / Cloud CDN |
| Secret management | Key Vault / Secret Manager | Azure Key Vault / AWS Secrets Manager / GCP Secret Manager |

Note: Mermaid does not reliably embed official product logos in all renderers. Keep logos in exported PNG/SVG (draw.io/Figma) and keep these diagrams as architecture source-of-truth.

---

## 2) System context diagram (C4-L1)

```mermaid
flowchart LR
  U1[Sales User]
  U2[Purchase User]
  U3[Workshop User]
  U4[HRM User]
  U5[B2B Partner]

  SPA[DEMA React Web App]
  API[DEMA FastAPI Platform]
  DB[(PostgreSQL)]
  OBJ[(Object Storage)]
  EXT1[Email/SMS Provider]
  EXT2[Identity Provider OIDC]
  EXT3[Accounting/ERP Export]

  U1 --> SPA
  U2 --> SPA
  U3 --> SPA
  U4 --> SPA
  U5 --> SPA

  SPA --> API
  API --> DB
  API --> OBJ
  API --> EXT1
  API --> EXT2
  API --> EXT3
```

---

## 3) Container diagram (C4-L2)

```mermaid
flowchart TB
  subgraph Client["Client Tier"]
    Browser[Browser]
    SPA[React SPA + Vite build]
  end

  subgraph Edge["Edge Tier"]
    CDN[CDN Static Hosting]
    WAF[WAF + TLS]
    LB[Load Balancer / Ingress]
  end

  subgraph App["Application Tier"]
    API[FastAPI App]
    Auth[Auth/RBAC Middleware]
    Domain[Domain Services]
    Repos[Repository Layer]
    Jobs[Job Producer]
  end

  subgraph Async["Async Tier"]
    Redis[(Redis Queue/Cache)]
    Worker[Celery/RQ Workers]
  end

  subgraph Data["Data Tier"]
    PG[(PostgreSQL)]
    Blob[(Object Storage)]
  end

  Browser --> SPA --> CDN --> WAF --> LB --> API
  API --> Auth --> Domain --> Repos --> PG
  API --> Blob
  API --> Jobs --> Redis --> Worker
  Worker --> PG
  Worker --> Blob
```

---

## 4) Frontend module architecture

```mermaid
flowchart LR
  subgraph Frontend["frontend/src"]
    App[App.tsx Route Resolver]
    Ctx1[AuthContext]
    Ctx2[LanguageContext]
    UI[components/*]
    Pages[pages/*]
    Widgets[widgets/*]
    Store[store/* local demo stores]
    Types[types/*]
  end

  App --> Ctx1
  App --> Ctx2
  App --> UI
  App --> Pages
  Pages --> Widgets
  Pages --> Store
  Pages --> Types
  UI --> Ctx2
```

### Frontend route-to-module map

| Route pattern | Page module | Domain |
|--------------|-------------|--------|
| `#/sales/kunden`, `#/purchase/kunden` | `CustomersPage` | Customer master |
| `#/sales/angebote`, `#/purchase/angebote` | `AngebotePage` | Offers |
| `#/sales/anfragen`, `#/purchase/anfragen` | `AnfragenPage` | Inquiries |
| `#/sales/verkaufter-bestand`, `#/purchase/verkaufter-bestand` | `VerkaufterBestandPage` | Sold inventory |
| `#/sales/abholauftraege`, `#/purchase/abholauftraege` | `AbholauftraegePage` | Pickup orders |
| `#/sales/kennzeichen-suchen`, `#/purchase/kennzeichen-suchen` | `KennzeichenSuchePage` | Plate search |
| `#/sales/rechnungen`, `#/purchase/rechnungen` | `RechnungenPage` | Invoices |
| `#/hrm/*` | `HrmPage` | HRM |
| `#/settings` | `SettingsPage` | System settings |
| unmatched routes | `DynamicDashboard` | Dashboard workspace |

---

## 5) Backend module architecture (target)

```mermaid
flowchart TB
  subgraph Backend["backend/app (target)"]
    Main[main.py]
    APIv1[api/v1 routers]
    Core[core config + security]
    Schemas[schemas Pydantic]
    Services[services domain logic]
    Repositories[repositories SQLA]
    Models[models SQLAlchemy]
    AI[ai orchestrator optional]
  end

  Main --> APIv1
  APIv1 --> Schemas
  APIv1 --> Services
  Services --> Repositories
  Repositories --> Models
  Services --> AI
  Core --> APIv1
```

### Domain services breakdown (target)

```mermaid
flowchart LR
  K[kunden]
  A[anfrage]
  O[angebot]
  B[bestand]
  R[rechnung/gutschrift]
  P[abholauftrag]
  W[werkstatt]
  WS[wash]
  H[hrm]
  B2B[b2b]
  REP[reports]
  ADM[admin]
  AI[ai optional]

  K --- A
  K --- O
  O --- R
  B --- O
  W --- R
  WS --- K
  REP --- B
  ADM --- H
  AI --- REP
```

---

## 6) API landscape (grouped)

```mermaid
flowchart LR
  Client[React Client]
  GW[FastAPI /api/v1]

  Auth[/auth/]
  Users[/users/]
  Kunden[/kunden/]
  Anfragen[/anfrage/]
  Angebote[/angebot/]
  Bestand[/bestand/]
  Rechn[/rechnung/]
  Werk[/werkstatt/*]
  Wash[/wash/*]
  HRM[/hrm/*]
  B2B[/b2b/*]
  Reports[/reports/]
  AI[/ai/* phase 2/]

  Client --> GW
  GW --> Auth
  GW --> Users
  GW --> Kunden
  GW --> Anfragen
  GW --> Angebote
  GW --> Bestand
  GW --> Rechn
  GW --> Werk
  GW --> Wash
  GW --> HRM
  GW --> B2B
  GW --> Reports
  GW --> AI
```

### API execution sequence (example: invoice list)

```mermaid
sequenceDiagram
  participant UI as React RechnungenPage
  participant API as FastAPI /api/v1/rechnung
  participant SVC as RechnungService
  participant REPO as RechnungRepository
  participant DB as PostgreSQL

  UI->>API: GET /api/v1/rechnung?filters...
  API->>SVC: validate + authorize
  SVC->>REPO: search(filters, paging)
  REPO->>DB: SELECT with indexes
  DB-->>REPO: rows + count
  REPO-->>SVC: entities
  SVC-->>API: DTO list
  API-->>UI: JSON response
```

---

## 7) Database architecture

```mermaid
erDiagram
  KUNDEN ||--o{ KUNDEN_WASH : extends
  KUNDEN ||--o{ ANFRAGE : has
  KUNDEN ||--o{ ANGEBOT : has
  ANGEBOT ||--o{ ANGEBOT_POSITION : contains
  KUNDEN ||--o{ RECHNUNG : billed_to
  RECHNUNG ||--o{ RECHNUNG_POSITION : contains
  BESTAND ||--o{ ANGEBOT_POSITION : referenced_by
  MITARBEITER ||--o{ RECHNUNG : creates
  MITARBEITER ||--o{ HRM_ATTENDANCE : tracks
```

### DB runtime topology

```mermaid
flowchart LR
  App1[FastAPI Pod 1]
  App2[FastAPI Pod 2]
  Pool[PgBouncer/Managed Pooler]
  PG[(PostgreSQL Primary)]
  Replica[(Read Replica optional)]
  Backups[(PITR Backups)]

  App1 --> Pool
  App2 --> Pool
  Pool --> PG
  PG --> Replica
  PG --> Backups
```

---

## 8) Cloud deployment diagram (service names)

```mermaid
flowchart TB
  Internet((Internet))
  DNS[Cloud DNS]
  CDN[CDN + Static Hosting]
  WAF[WAF]
  Ingress[Ingress / API Gateway]
  API[Container Apps / ECS Fargate / Cloud Run]
  Worker[Worker Service]
  Redis[(Managed Redis)]
  PG[(Managed PostgreSQL)]
  Blob[(Blob/S3/GCS)]
  Secret[Key Vault / Secrets Manager]
  Obs[Observability Stack]

  Internet --> DNS --> CDN --> WAF --> Ingress --> API
  API --> PG
  API --> Blob
  API --> Redis
  Worker --> Redis
  Worker --> PG
  Worker --> Blob
  API --> Secret
  Worker --> Secret
  API --> Obs
  Worker --> Obs
```

### Cloud environment split

```mermaid
flowchart LR
  Dev[DEV Subscription/Account]
  Stg[STAGING Subscription/Account]
  Prd[PROD Subscription/Account]

  Dev --> Stg --> Prd
```

---

## 9) Terraform/IaC architecture

```mermaid
flowchart TB
  GH[GitHub Repository]
  ACT[GitHub Actions]
  TFV[Terraform Validate/Plan]
  TFA[Terraform Apply]

  subgraph State["Remote State"]
    Lock[State Lock]
    TFState[(Terraform State)]
  end

  subgraph Modules["Terraform modules"]
    Net[module.network]
    Sec[module.security]
    Data[module.data]
    App[module.compute]
    Obs[module.observability]
  end

  GH --> ACT --> TFV --> TFA
  TFV --> TFState
  TFA --> Lock
  TFA --> TFState
  TFA --> Net
  TFA --> Sec
  TFA --> Data
  TFA --> App
  TFA --> Obs
```

### Suggested Terraform module boundaries

| Module | Resources |
|--------|-----------|
| `module.network` | VPC/VNet, subnets, route tables, private endpoints |
| `module.security` | KMS/Key Vault, secrets, IAM/roles, policies |
| `module.data` | PostgreSQL, Redis, object storage, backup policy |
| `module.compute` | API service, workers, autoscaling, ingress |
| `module.observability` | logs, metrics, alerts, dashboards |
| `module.edge` (optional) | CDN, WAF, TLS certificates, DNS |

---

## 10) Module execution diagram (end-to-end business flow)

```mermaid
sequenceDiagram
  participant User as Sales/Purchase User
  participant UI as React Module Page
  participant API as FastAPI Domain Router
  participant SVC as Domain Service
  participant DB as PostgreSQL
  participant Q as Redis Queue
  participant W as Worker
  participant OS as Object Storage

  User->>UI: Trigger business action
  UI->>API: POST/GET request
  API->>SVC: Validate + authorize + rules
  SVC->>DB: Transactional write/read
  DB-->>SVC: Commit result
  SVC-->>API: Response DTO
  API-->>UI: JSON result
  SVC->>Q: Optional async job enqueue
  Q->>W: Process job
  W->>OS: Store artifact (PDF/export/OCR)
  W->>DB: Update status
```

---

## 11) Professional documentation checklist

- Keep one source file per diagram domain (context, runtime, data, IaC).
- Add diagram version/date footer in exported PNG/PDF.
- Use consistent naming in UI, API tags, DB schema, and Terraform modules.
- Include NFR overlays in each view: latency, RTO/RPO, security boundary, and ownership.
- Add a release checklist: schema migration tested, rollback path documented, alerts configured.

