# DEMA Digital Core — **Microsoft Azure** complete blueprint

**Single chosen cloud:** **Microsoft Azure** (EU region, e.g. **Germany West Central** or **West Europe**).  
This document is the **authoritative Azure reference** for DEMA: which **managed services** to use, how **APIs**, **data**, **AI**, **identity**, and **IaC** connect, and **blueprint-level diagrams** (not ad-hoc boxes).

**Companion docs:** [HLD.md](./HLD.md) (strategy), [Architecture-Diagrams.md](./Architecture-Diagrams.md) (cloud-neutral views), [erd.md](./erd.md) (data model), [diagram-tech-logos.md](./diagram-tech-logos.md) (logo strip convention).

---

## How to read this blueprint

| Layer | Blueprint section | What it answers |
|-------|-------------------|-----------------|
| Business context | §3 | Who talks to what |
| Landing zone & network | §4 | VNets, subnets, private endpoints, egress |
| Application compute | §5 | Where React + FastAPI + workers run |
| Data & storage | §6 | PostgreSQL, Redis, Blob, backups |
| AI & automation | §7 | Azure OpenAI, content safety, RAG data path |
| APIs & integration | §8 | External IdP, webhooks, partner APIs |
| DevSecOps & Terraform | §9 | CI/CD, registry, IaC modules |
| Observability | §10 | Logs, metrics, traces, alerts |

**Logos in this file:** technology icons use the **Simple Icons CDN** (`cdn.simpleicons.org`) for consistent, license-friendly SVG rendering in GitHub, VS Code, and most Markdown viewers. Azure-specific naming follows **Microsoft Learn** terminology.

---

## 1. Technology stack with logos (Azure + open stack)

> **Legend:** Each cell = *product used on Azure* + *role in DEMA*.

### 1.1 Frontend & tooling

| Logo | Technology | Azure / role |
|:----:|------------|--------------|
| <img src="https://cdn.simpleicons.org/react/61DAFB" width="22" height="22" alt="React" /> | **React 18** | SPA UI (`frontend/`) |
| <img src="https://cdn.simpleicons.org/typescript/3178C6" width="22" height="22" alt="TypeScript" /> | **TypeScript** | Typed UI |
| <img src="https://cdn.simpleicons.org/vite/646CFF" width="22" height="22" alt="Vite" /> | **Vite** | Build & dev server |
| <img src="https://cdn.simpleicons.org/tailwindcss/06B6D4" width="22" height="22" alt="Tailwind" /> | **Tailwind CSS** | Styling |
| <img src="https://cdn.simpleicons.org/eslint/4B32C3" width="22" height="22" alt="ESLint" /> | **ESLint** | TS quality gate |

**Host on Azure:** **Azure Static Web Apps** *or* **Blob Storage (static website)** in front of **Azure Front Door** + **WAF** (see §5).

### 1.2 Backend & runtime

| Logo | Technology | Azure / role |
|:----:|------------|--------------|
| <img src="https://cdn.simpleicons.org/python/3776AB" width="22" height="22" alt="Python" /> | **Python 3.12+** | API + workers |
| <img src="https://cdn.simpleicons.org/fastapi/009688" width="22" height="22" alt="FastAPI" /> | **FastAPI** | REST + OpenAPI `/api/v1` |
| <img src="https://cdn.simpleicons.org/pydantic/E92063" width="22" height="22" alt="Pydantic" /> | **Pydantic v2** | Schemas & settings |
| <img src="https://cdn.simpleicons.org/sqlalchemy/D71F00" width="22" height="22" alt="SQLAlchemy" /> | **SQLAlchemy 2** | ORM |
| <img src="https://cdn.simpleicons.org/python/3776AB" width="22" height="22" alt="Python" title="Alembic runs on Python" /> | **Alembic** | DB migrations (no dedicated Simple Icon) |
| <img src="https://cdn.simpleicons.org/python/3776AB" width="22" height="22" alt="Python" title="Gunicorn/Uvicorn ASGI stack" /> | **Gunicorn + Uvicorn workers** | Prod ASGI (Gunicorn has no Simple Icon slug) |

**Run on Azure:** **Azure Container Apps** (scale-to-zero capable) *or* **Azure Kubernetes Service (AKS)** if you need maximum control (see §5).

### 1.3 Data platform (Azure managed)

| Logo | Azure service (official name) | Role |
|:----:|------------------------------|------|
| <img src="https://cdn.simpleicons.org/postgresql/4169E1" width="22" height="22" alt="PostgreSQL" /> | **Azure Database for PostgreSQL — Flexible Server** | System of record; optional **pgvector** for RAG |
| <img src="https://cdn.simpleicons.org/redis/DC382D" width="22" height="22" alt="Redis" /> | **Azure Cache for Redis** (or **Redis Enterprise** on Azure) | Queue broker, rate limits, session/cache |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure Blob Storage** | Invoices, uploads, exports, PDFs |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure Private Link** | Private connectivity to PaaS |

### 1.4 Identity & security

| Logo | Azure service | Role |
|:----:|---------------|------|
| <img src="https://www.google.com/url?sa=t&source=web&rct=j&url=https%3A%2F%2Fde.wikipedia.org%2Fwiki%2FDatei%3AMicrosoft_Entra_ID_color_icon.svg&ved=0CBYQjRxqFwoTCPDlzs6DtpMDFQAAAAAdAAAAABAH&opi=89978449" width="22" height="22" alt="Microsoft" /> | **Microsoft Entra ID** | OIDC SSO, groups → app roles |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure Key Vault** | Secrets, certs, CMK integration |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Microsoft Defender for Cloud** | Posture, recommendations |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure DDoS Protection** (std/premium) | Edge hardening with Front Door |

### 1.5 AI & intelligent automation (Azure)

| Logo | Azure service | Role |
|:----:|---------------|------|
| <img src="https://cdn.simpleicons.org/openai/412991" width="22" height="22" alt="OpenAI" /> | **Azure OpenAI Service** | Chat, embeddings, guarded models in **your** tenant |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure AI Content Safety** (recommended) | Prompt/response filtering |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure AI Document Intelligence** (optional) | OCR / structured extraction for invoices |

Reference patterns: Microsoft Learn *AI integration with Azure Container Apps*; sample workloads combining **Container Apps + PostgreSQL Flexible Server + OpenAI** (e.g. community/Azure samples for RAG-on-Postgres).

### 1.6 Edge, networking, and delivery

| Logo | Azure service | Role |
|:----:|---------------|------|
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure Front Door** | Global HTTP(S) entry, WAF, caching |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure DNS** | Public DNS |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Azure Virtual Network** | Isolation, subnets, NSGs |

### 1.7 Observability

| Logo | Technology / Azure | Role |
|:----:|--------------------|------|
| <img src="https://cdn.simpleicons.org/opentelemetry/000000" width="22" height="22" alt="OpenTelemetry" /> | **OpenTelemetry** SDK → **Azure Monitor** | Traces & metrics |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Application Insights** | APM, live metrics |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure" /> | **Log Analytics workspace** | Central logs |

### 1.8 DevSecOps & IaC

| Logo | Technology | Role |
|:----:|------------|------|
| <img src="https://cdn.simpleicons.org/github/181717" width="22" height="22" alt="GitHub" /> | **GitHub** | Source |
| <img src="https://cdn.simpleicons.org/githubactions/2088FF" width="22" height="22" alt="GitHub Actions" /> | **GitHub Actions** | CI: `npm run build`, Docker build, `terraform plan` |
| <img src="https://cdn.simpleicons.org/docker/2496ED" width="22" height="22" alt="Docker" /> | **Docker** | API + worker images |
| <img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="ACR" /> | **Azure Container Registry** | Image storage |
| <img src="https://cdn.simpleicons.org/terraform/844FBA" width="22" height="22" alt="Terraform" /> | **Terraform (HashiCorp)** | IaC modules (see §9) |

---

## 2. One-line architecture (Azure)

**Users → Front Door (WAF) → Static SPA + Container Apps (FastAPI + workers) → Private Link → PostgreSQL / Redis / Blob → Azure OpenAI (managed identity, no keys in app config).**

---

## 3. Blueprint A — System context (Azure-labelled)

```mermaid
flowchart TB
  subgraph Users["People & partners"]
    U1[Internal users\nSales / Purchase / Workshop / HRM]
    U2[B2B partners]
  end

  subgraph AzureEdge["Azure edge"]
    AFD[Azure Front Door + WAF]
  end

  subgraph AzureApp["Azure application"]
    SWA[Static Web Apps\nor Blob static + CDN]
    ACA[Azure Container Apps\nFastAPI + workers]
  end

  subgraph AzureData["Azure data plane"]
    PG[(Azure Database for\nPostgreSQL Flexible Server)]
    RDIS[(Azure Cache for Redis)]
    BLOB[(Azure Blob Storage)]
    KV[Azure Key Vault]
  end

  subgraph AzureAI["Azure AI"]
    AOAI[Azure OpenAI Service]
    CS[Azure AI Content Safety]
    DI[Azure AI Document Intelligence\noptional]
  end

  subgraph External["External systems"]
    ENTRA[Microsoft Entra ID\nOIDC]
    MAIL[Email provider e.g. M365 / SendGrid]
    ERP[ERP / accounting export]
  end

  U1 --> AFD
  U2 --> AFD
  AFD --> SWA
  AFD --> ACA
  ACA --> PG
  ACA --> RDIS
  ACA --> BLOB
  ACA --> KV
  ACA --> AOAI
  ACA --> CS
  ACA --> DI
  ACA --> ENTRA
  ACA --> MAIL
  ACA --> ERP
```

<p align="left"><strong>Technologies in this diagram:</strong><br />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Microsoft Azure" title="Microsoft Azure" />
<img src="https://cdn.simpleicons.org/react/61DAFB" width="22" height="22" alt="React" title="React" />
<img src="https://cdn.simpleicons.org/fastapi/009688" width="22" height="22" alt="FastAPI" title="FastAPI" />
<img src="https://cdn.simpleicons.org/python/3776AB" width="22" height="22" alt="Python" title="Python" />
<img src="https://cdn.simpleicons.org/postgresql/4169E1" width="22" height="22" alt="Azure Database for PostgreSQL" title="Azure Database for PostgreSQL" />
<img src="https://cdn.simpleicons.org/redis/DC382D" width="22" height="22" alt="Azure Cache for Redis" title="Azure Cache for Redis" />
<img src="https://cdn.simpleicons.org/openai/412991" width="22" height="22" alt="Azure OpenAI Service" title="Azure OpenAI Service" />
<img src="https://cdn.simpleicons.org/microsoft/5E5E5E" width="22" height="22" alt="Microsoft Entra ID" title="Microsoft Entra ID" />
<img src="https://cdn.simpleicons.org/microsoftoutlook/0078D4" width="22" height="22" alt="Email (e.g. M365)" title="Email (e.g. M365)" />
<img src="https://cdn.simpleicons.org/sap/0FAAFF" width="22" height="22" alt="ERP / accounting export" title="ERP / accounting export" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure AI Document Intelligence" title="Azure AI Document Intelligence" />
</p>

---

## 4. Blueprint B — Landing zone & network (detail)

**Intent:** API and data planes have **no public PostgreSQL/Redis**; only **Front Door** and optional **bastion/jump** for break-glass.

```mermaid
flowchart TB
  subgraph VNet["Azure Virtual Network (spoke: app)"]
    subgraph SNetApp["snet-app (Container Apps injected)"]
      ACA[Container Apps Environment]
    end
    subgraph SNetPe["snet-private-endpoints"]
      PEPG[Private Endpoint\nPostgreSQL]
      PERD[Private Endpoint\nRedis]
      PEBL[Private Endpoint\nBlob]
      PEKV[Private Endpoint\nKey Vault]
      PEAOAI[Private Endpoint\nAzure OpenAI\nif private]
    end
  end

  PUB[Public Internet]
  AFD[Azure Front Door]
  PUB --> AFD
  AFD --> ACA
  ACA --> PEPG
  ACA --> PERD
  ACA --> PEBL
  ACA --> PEKV
  ACA --> PEAOAI
```

<p align="left"><strong>Technologies in this diagram:</strong><br />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Virtual Network" title="Azure Virtual Network" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Front Door" title="Azure Front Door" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Container Apps" title="Azure Container Apps" />
<img src="https://cdn.simpleicons.org/postgresql/4169E1" width="22" height="22" alt="PostgreSQL (private endpoint)" title="PostgreSQL (private endpoint)" />
<img src="https://cdn.simpleicons.org/redis/DC382D" width="22" height="22" alt="Redis (private endpoint)" title="Redis (private endpoint)" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Blob Storage (private endpoint)" title="Blob Storage (private endpoint)" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Key Vault (private endpoint)" title="Key Vault (private endpoint)" />
<img src="https://cdn.simpleicons.org/openai/412991" width="22" height="22" alt="Azure OpenAI (private optional)" title="Azure OpenAI (private optional)" />
</p>

**Controls:** NSGs on subnets; **Private DNS zones** linked to VNet for private endpoints; **Managed identities** on Container Apps for Key Vault + storage + database (AAD auth where supported).

---

## 5. Blueprint C — Application runtime (containers)

**Workload split (recommended):**

| Container app | Image | Responsibility |
|---------------|-------|------------------|
| `dema-api` | `fastapi` + gunicorn/uvicorn | Sync REST, OpenAPI, auth middleware |
| `dema-worker` | same repo, different CMD | Celery/RQ/Arq consumers: PDF, OCR jobs, embeddings |
| Optional `dema-scheduler` | same | Cron-style jobs (reports, reindex) |

```mermaid
flowchart LR
  subgraph ACAEnv["Azure Container Apps environment"]
    API[dema-api\nreplicas: min 1–3]
    WRK[dema-worker\nKEDA scaled from Redis queue depth]
  end
  subgraph Reg["Azure Container Registry"]
    IMG1[image: dema-api:tag]
  end
  GH[GitHub Actions]
  GH -->|build push| IMG1
  IMG1 --> API
  IMG1 --> WRK
  API --> WRK
```

**Scaling:** API on HTTP concurrency / CPU; workers on **queue length** (KEDA + Redis).

<p align="left"><strong>Technologies in this diagram:</strong><br />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Container Apps" title="Azure Container Apps" />
<img src="https://cdn.simpleicons.org/githubactions/2088FF" width="22" height="22" alt="GitHub Actions" title="GitHub Actions" />
<img src="https://cdn.simpleicons.org/docker/2496ED" width="22" height="22" alt="Docker" title="Docker" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Container Registry" title="Azure Container Registry" />
</p>

---

## 6. Blueprint D — Data platform

```mermaid
flowchart TB
  API[FastAPI]
  WRK[Worker]

  PG[(PostgreSQL Flexible Server\nDEMA schema + Alembic)]
  RD[(Redis\nqueues + cache)]
  BL[(Blob Storage\nuploads/exports)]

  API --> PG
  API --> RD
  API --> BL
  WRK --> PG
  WRK --> RD
  WRK --> BL
```

<p align="left"><strong>Technologies in this diagram:</strong><br />
<img src="https://cdn.simpleicons.org/fastapi/009688" width="22" height="22" alt="FastAPI" title="FastAPI" />
<img src="https://cdn.simpleicons.org/python/3776AB" width="22" height="22" alt="Python workers" title="Python workers" />
<img src="https://cdn.simpleicons.org/postgresql/4169E1" width="22" height="22" alt="PostgreSQL" title="PostgreSQL" />
<img src="https://cdn.simpleicons.org/redis/DC382D" width="22" height="22" alt="Redis" title="Redis" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Blob Storage" title="Azure Blob Storage" />
</p>

**PostgreSQL extensions (when needed):** `pgvector` for embeddings (align with HLD §8).  
**Backup:** Flexible Server **automated backups** + optional **geo-redundant**; Blob **RA-GRS** for critical exports (policy decision).

---

## 7. Blueprint E — AI plane (controlled, production pattern)

**Rules:** Only **backend** calls Azure OpenAI; prompts/responses **audited**; **Content Safety** on high-risk paths; **no customer PII** in prompts unless policy allows.

```mermaid
flowchart TB
  UI[React SPA]
  API[FastAPI /api/v1/ai/*]

  subgraph Governance["Governance layer"]
    POL[Policy: allow-list tools\n+ max tokens]
    CS[Azure AI Content Safety]
    LOG[App Insights + usage table\nai_usage]
  end

  subgraph Model["Models"]
    AOAI[Azure OpenAI\nchat + embeddings]
  end

  subgraph RAG["RAG data path"]
    PG[(PostgreSQL\npgvector + business tables)]
    BL[(Blob / extracted text chunks)]
  end

  UI -->|HTTPS JSON| API
  API --> POL
  POL --> CS
  POL --> AOAI
  API --> PG
  WRK[Worker] --> BL
  WRK --> PG
  WRK --> AOAI
  AOAI --> LOG
  API --> LOG
```

<p align="left"><strong>Technologies in this diagram:</strong><br />
<img src="https://cdn.simpleicons.org/react/61DAFB" width="22" height="22" alt="React" title="React" />
<img src="https://cdn.simpleicons.org/fastapi/009688" width="22" height="22" alt="FastAPI" title="FastAPI" />
<img src="https://cdn.simpleicons.org/python/3776AB" width="22" height="22" alt="Python worker" title="Python worker" />
<img src="https://cdn.simpleicons.org/openai/412991" width="22" height="22" alt="Azure OpenAI" title="Azure OpenAI" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure AI Content Safety" title="Azure AI Content Safety" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Application Insights" title="Application Insights" />
<img src="https://cdn.simpleicons.org/postgresql/4169E1" width="22" height="22" alt="PostgreSQL + pgvector" title="PostgreSQL + pgvector" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Blob" title="Azure Blob" />
</p>

**Typical flows:**

1. **NL query:** API retrieves allowed context from PG → calls **chat** model → returns answer + citations.  
2. **Document analyse:** API enqueues job → worker uses **Document Intelligence** + optional **GPT** structured output → writes results to PG → client polls or subscribes.

---

## 8. Blueprint F — APIs, identity, and integrations

```mermaid
flowchart LR
  subgraph Client["Client"]
    SPA[React SPA]
  end

  subgraph APILayer["FastAPI"]
    AUTH[OIDC JWT validation\nEntra]
    REST[Domain routers\nkunden anfrage angebot ...]
    AI[AI router\nquota + RBAC]
  end

  subgraph IdP["Microsoft Entra ID"]
    OIDC[OIDC / OAuth2]
    GR[Groups → app roles]
  end

  subgraph Outbound["Outbound integrations"]
    SMTP[Email API]
    WEB[Webhooks to partners]
    FILE[SFTP / API to ERP\noptional]
  end

  SPA -->|Bearer token| AUTH
  AUTH --> OIDC
  OIDC --> GR
  AUTH --> REST
  AUTH --> AI
  REST --> SMTP
  REST --> WEB
  REST --> FILE
```

**API grouping (maps to HLD §6):** `auth`, `users`, `kunden`, `anfrage`, `angebot`, `bestand`, `rechnung`, `werkstatt`, `wash`, `hrm`, `b2b`, `reports`, `ai`.

<p align="left"><strong>Technologies in this diagram:</strong><br />
<img src="https://cdn.simpleicons.org/react/61DAFB" width="22" height="22" alt="React" title="React" />
<img src="https://cdn.simpleicons.org/fastapi/009688" width="22" height="22" alt="FastAPI" title="FastAPI" />
<img src="https://cdn.simpleicons.org/python/3776AB" width="22" height="22" alt="Python" title="Python" />
<img src="https://cdn.simpleicons.org/microsoft/5E5E5E" width="22" height="22" alt="Microsoft Entra ID" title="Microsoft Entra ID" />
<img src="https://cdn.simpleicons.org/openid/F78C40" width="22" height="22" alt="OpenID Connect" title="OpenID Connect" />
</p>

---

## 9. Blueprint G — Terraform module map (Azure)

**Not random:** modules follow **Well-Architected** separation: network → security → data → compute → observability → edge.

```mermaid
flowchart TB
  ROOT[terraform/envs/prod]

  ROOT --> MNET[module.azure_network\nVNet subnets NSG]
  ROOT --> MPE[module.azure_private_dns\n+ private endpoints]
  ROOT --> MSEC[module.azure_security\nKey Vault policies]
  ROOT --> MDATA[module.azure_data\nPostgreSQL Flexible\nRedis Blob]
  ROOT --> MAPP[module.azure_container_apps\nACA env + apps]
  ROOT --> MAI[module.azure_openai\nAOAI account + deployments]
  ROOT --> MEDGE[module.azure_front_door\nWAF routes]
  ROOT --> MOBS[module.azure_monitor\nApp Insights LAW alerts]

  MNET --> MPE
  MDATA --> MPE
  MAPP --> MNET
  MAI --> MSEC
  MAPP --> MSEC
```

<p align="left"><strong>Technologies in this diagram:</strong><br />
<img src="https://cdn.simpleicons.org/terraform/844FBA" width="22" height="22" alt="Terraform" title="Terraform" />
<img src="https://cdn.simpleicons.org/github/181717" width="22" height="22" alt="GitHub" title="GitHub" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure modules" title="Azure modules" />
</p>

**State:** Remote backend **Azure Storage** + **state locking** (blob lease or Terraform Cloud).

**CI/CD:** GitHub Actions → `terraform fmt/validate/plan` on PR; `apply` on protected branch with approval.

---

## 10. Blueprint H — Observability & operations

```mermaid
flowchart LR
  API[Container Apps]
  WRK[Workers]
  AI[Azure OpenAI]

  API --> OTEL[OpenTelemetry SDK]
  WRK --> OTEL
  OTEL --> AIEXP[Application Insights]
  API --> LOGS[Log Analytics Workspace]
  WRK --> LOGS
  AI --> MET[Azure Monitor metrics\nprovider usage]

  AIEXP --> DASH[Azure Dashboards / Grafana]
  LOGS --> ALERT[Alert rules\nlatency 5xx queue depth]
```

<p align="left"><strong>Technologies in this diagram:</strong><br />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Container Apps" title="Azure Container Apps" />
<img src="https://cdn.simpleicons.org/opentelemetry/000000" width="22" height="22" alt="OpenTelemetry" title="OpenTelemetry" />
<img src="https://cdn.simpleicons.org/openai/412991" width="22" height="22" alt="Azure OpenAI" title="Azure OpenAI" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Application Insights" title="Application Insights" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Log Analytics" title="Log Analytics" />
<img src="https://cdn.simpleicons.org/microsoftazure/0089D6" width="22" height="22" alt="Azure Monitor" title="Azure Monitor" />
<img src="https://cdn.simpleicons.org/grafana/F46800" width="22" height="22" alt="Grafana" title="Grafana" />
</p>

**SLO examples:** API p95 latency, error rate, worker backlog depth, OpenAI token budget burn rate.

---

## 11. What you must provision (checklist)

| Area | Azure resource | Notes |
|------|----------------|--------|
| Identity | Entra app registration | SPA + API scopes; optional B2B for partners |
| Edge | Front Door + WAF policy | Route `/` → static, `/api` → Container Apps |
| Compute | Container Apps env + 2+ apps | Managed identity enabled |
| Data | PostgreSQL Flexible | HA tier per RTO; private access |
| Cache/queue | Azure Cache for Redis | TLS; eviction policy for cache vs queue |
| Files | Storage account (Blob) | Lifecycle rules; virus scan optional (Defender) |
| Secrets | Key Vault | Keys for TLS, DB, third parties |
| AI | Azure OpenAI | Deployments: chat + embedding models; private networking optional |
| Safety | Content Safety | Integrated in API middleware |
| Registry | ACR | Admin disabled; use MI pull |
| Observability | App Insights + LAW | Sampling tuned for prod |

---

## 12. Exporting “pretty” diagrams with official logos

1. **Keep this file** as the logical blueprint (Mermaid = easy diff in Git).  
2. For **pitch decks / PDF**: import Mermaid into **draw.io (diagrams.net)** or **Figma** and drop **official SVGs** from [Microsoft Azure Architecture Icons](https://learn.microsoft.com/azure/architecture/icons/) and [Simple Icons](https://simpleicons.org/).  
3. Version exports: `docs/exports/blueprint-azure-v1.png` with date in footer.

---

## Document history

| Version | Notes |
|---------|--------|
| 1.0 | Initial Azure-only blueprint: stack table with logos, layered diagrams, Terraform map, AI path |

*Aligned with [HLD.md](./HLD.md) target stack and [Architecture-Diagrams.md](./Architecture-Diagrams.md). Azure service names verified against Microsoft Learn patterns (Container Apps, PostgreSQL Flexible Server, Azure OpenAI, Front Door).*
