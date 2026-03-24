# Dashboard Home Service Specification (Dynamic Dashboard)

**Service:** Dashboard home / dynamic widget grid (`DynamicDashboard`)  
**Module family:** CORE-UX / Analytics shell / Personalization  
**Primary file:** `frontend/src/pages/DynamicDashboard.tsx`  
**Status:** Production-oriented UI with browser-local layout persistence; server-backed layout and live widget data are targets below  
**Version:** 1.0

---

## 1) Purpose and business value

The Dashboard Home is the default landing experience after authentication. It is a **configurable command center**: users arrange widgets (KPIs, sales/inventory overviews, tasks, calendar, charts, tables) to match their role and daily work.

**Business value**

- Faster orientation: key metrics and actions in one place  
- Self-service layout: less “wrong default” friction and fewer one-off dashboard requests  
- Foundation for org-wide templates, role-based visibility, and governed AI assistance (briefings, layout suggestions)  
- Clear extension point: new modules ship as widgets without rewriting the shell  

---

## 2) Scope: current vs target

### Current (in repository)

- Default route in `frontend/src/App.tsx` renders `DynamicDashboard` when no department route, settings, or chat matches the current path  
- **Grid:** `react-grid-layout` — drag, resize, vertical compaction; locked widgets skip move/resize in layout logic  
- **Persistence:** `localStorage` key `dema-dashboard-layout` via `frontend/src/store/dashboardLayout.ts`  
- **Catalog:** widget types, metadata, palette grouping in `frontend/src/widgets/registry.tsx`  
- **Types:** `WidgetType`, `WidgetInstance`, `DashboardLayout` in `frontend/src/types/dashboard.ts`  
- **i18n:** page strings via `useLanguage()`; widget chrome/palette via `useWidgetLanguage()` in `frontend/src/widgets/useWidgetLanguage.ts`  
- **Widget implementations:** `frontend/src/widgets/*.tsx` (see traceability matrix)  
- **Legacy page:** `frontend/src/pages/Dashboard.tsx` exports a static `Dashboard` with embedded Recharts demos; it is **not** referenced by `App.tsx` or navigation (reference / potential removal candidate)

### Target (enterprise production)

- **Server-backed layouts** per user; optional **role/department default templates** and admin-published layouts  
- **Live data** per widget from APIs with caching, auth, and SLOs  
- **RBAC / ABAC:** which widget types and data scopes a user may add or see  
- **Audit:** layout resets, shared dashboard changes, admin template publishes  
- **Backup/DR:** layouts and widget config stored in PostgreSQL; align with TRD RTO/RPO when persistent  
- **AI layer:** optional briefings and suggestions with human-in-the-loop controls (see §11)  

---

## 3) Feature catalog (what this service does)

### 3.1 Grid shell (DynamicDashboard)

- Render responsive 12-column grid (`COLS = 12`, `ROW_HEIGHT`, margins from `DynamicDashboard.tsx`)  
- Add widget from palette (`getAddableWidgetsByGroup`, grouped by `WIDGET_PALETTE_GROUP_ORDER`)  
- Remove non-locked widgets  
- Reset layout to defaults (`getDefaultWidgets`)  
- Persist layout on change (`onLayoutChange` → `applyGridLayout` → `saveLayout`)  
- Persist per-widget config patches (`updateWidgetConfig` + `onUpdateConfig` prop)  
- Drag handle: `.dashboard-drag-handle`; grid remounts on `language` change (`key={language}`)  

### 3.2 Widget types (allowed)

Aligned with `VALID_WIDGET_TYPES` in `dashboardLayout.ts` and `WidgetType` in `types/dashboard.ts`:

| Type | Role |
|------|------|
| `welcome` | Top banner (locked default) |
| `kpi` | KPI strip (locked default) |
| `sales` | Sales overview |
| `inventory` | Inventory overview |
| `quick-actions` | Quick actions |
| `tasks` | Tasks / reminders |
| `finances` | Finances block |
| `user-card` | Profile module variant (addable) |
| `profile` | Profile module (default layout includes; also addable) |
| `calendar` | Calendar |
| `appointments` | Appointments |
| `meetings` | Meetings |
| `notes` | Notes |
| `table` | Table widget |
| `todo-list` | Todo list |
| `picture` | Image |
| `graph-line` | Line chart (Recharts via `useDashboardChartData`) |
| `graph-bar` | Bar chart |
| `graph-pie` | Pie chart |
| `graph-area` | Area chart |

### 3.3 Sanitization and safety

- Unknown or legacy widget types dropped on load (`sanitizeWidgets`) so the dashboard always mounts  
- `ensureProfileWidget` ensures a `profile` widget exists after sanitize  

### 3.4 Internationalization

- Navigation label and help strings: `LanguageContext`  
- Widget titles and palette groups: `titleKey` / `WIDGET_GROUP_I18N_KEY` in registry  

---

## 4) Technologies used in this service

| Layer | Technology |
|-------|------------|
| UI | React + TypeScript (`DynamicDashboard.tsx`) |
| Layout | `react-grid-layout` (+ default CSS imports in page) |
| Styling | Tailwind utility classes |
| Icons | `lucide-react` |
| Charts (widgets) | `recharts` (in graph widgets) |
| i18n | `useLanguage`, `useWidgetLanguage` |
| Persistence | `localStorage` via `dashboardLayout.ts` |
| Widget registry | `registry.tsx` |
| Target API | FastAPI + Pydantic + SQLAlchemy (per `LLD.md`) |
| Target data | PostgreSQL, Redis (cache / realtime helpers per `HLD.md`) |
| Observability / ops | OpenTelemetry, runbooks per `Project-Report-Technical-Requirements.md` |

---

## 4.1 Framework and platform inventory (traceable)

| Area | Framework / platform | Why used here | Primary files |
|------|----------------------|---------------|---------------|
| SPA shell | React + TypeScript | Composable dashboard and strict typing | `frontend/src/pages/DynamicDashboard.tsx`, `frontend/src/App.tsx` |
| Grid UX | react-grid-layout | Drag/resize dashboard with proven behavior | `frontend/src/pages/DynamicDashboard.tsx` |
| Layout state | Module functions + localStorage | Serialize layout/config per browser | `frontend/src/store/dashboardLayout.ts` |
| Widget plugins | Registry pattern | Add widgets without coupling shell to each module | `frontend/src/widgets/registry.tsx` |
| Widget contracts | Shared TS interfaces | Consistent `config` / `onUpdateConfig` | `frontend/src/types/dashboard.ts` |
| Charts | Recharts | In-widget time series / bars / pies | `frontend/src/widgets/Graph*.tsx`, `useDashboardChartData.ts` |
| i18n | Context hooks | Palette and widget chrome in user language | `frontend/src/contexts/LanguageContext.tsx`, `frontend/src/widgets/useWidgetLanguage.ts` |
| Target backend | FastAPI + PostgreSQL | Durable layouts and widget data with policy | `docs/LLD.md`, `docs/HLD.md` |

---

## 5) Internal data model (current local persistence)

### 5.1 Storage keys and shapes

- **Key:** `dema-dashboard-layout` (`STORAGE_KEY` in `dashboardLayout.ts`)  
- **JSON shape:** `DashboardLayout` — `widgets: WidgetInstance[]`, optional `version`  
- **Widget instance:** `id`, `type`, `grid { x, y, w, h }`, optional `config`, optional `locked`  
- **Default widgets:** `getDefaultWidgets()` — welcome + kpi locked; core business widgets positioned on first run  

### 5.2 Logical entity model (ER-style)

```mermaid
erDiagram
  DASHBOARD_LAYOUT {
    string storageKey "dema-dashboard-layout"
    int version
  }

  WIDGET_INSTANCE {
    string id PK
    string type
    int grid_x
    int grid_y
    int grid_w
    int grid_h
    bool locked
    json config
  }

  WIDGET_TYPE {
    string code PK
    string titleKey
    bool addable
  }

  DASHBOARD_LAYOUT ||--o{ WIDGET_INSTANCE : contains
  WIDGET_INSTANCE }o--|| WIDGET_TYPE : "type"
```

**Target (server) extension:** `USER`, `ROLE_TEMPLATE`, `DASHBOARD_SHARE`, `AUDIT_EVENT` — see API §10.

---

## 6) Feature diagram (functional decomposition)

```mermaid
flowchart TB
  Dash[DashboardHomeService]

  Dash --> Shell[GridShell]
  Dash --> Persist[LayoutPersistence]
  Dash --> Palette[AddWidgetPalette]
  Dash --> Reg[WidgetRegistry]

  Shell --> Drag[DragResize]
  Shell --> Lock[LockedWidgets]

  Persist --> LS[localStorage]
  Persist --> API[TargetSettingsAPI]

  Reg --> WWelcome[Welcome]
  Reg --> WKpi[Kpi]
  Reg --> WCharts[ChartWidgets]
  Reg --> WTables[TableTodoPicture]
  Reg --> WBiz[SalesInventoryFinances]
  Reg --> WPlan[CalendarAppointmentsMeetings]
```

---

## 7) DFD (data flow diagram)

```mermaid
flowchart LR
  U[User]
  DD[DynamicDashboard]
  DL[dashboardLayout store]
  LS[(localStorage)]
  REG[widgets registry]
  W[Widget components]

  U -->|interacts| DD
  DD --> REG
  REG --> W
  DD --> DL
  DL -->|load save| LS
  W -->|config patch| DD
  DD -->|render| U

  API[WidgetDataAPI target]
  W -.->|future fetch| API
```

---

## 8) Main user flows (high-value)

### 8.1 First load / hydrate layout

1. `DynamicDashboard` mounts with `useState(() => loadLayout())`  
2. `loadLayout` reads `localStorage` or returns `getDefaultWidgets()`  
3. Invalid types stripped; profile widget ensured  
4. `react-grid-layout` receives layout items from `widgetToLayoutItem` + `getWidgetMeta`  

### 8.2 Drag or resize widget

1. User drags handle (non-locked) or resizes  
2. `onLayoutChange` receives new positions  
3. `applyGridLayout` updates only non-locked widgets  
4. `saveLayout` writes JSON to `localStorage`  

### 8.3 Add widget from palette

1. User opens “Add widget”  
2. User picks type; `handleAddWidget` appends with `addWidget` at next `y`  
3. `saveLayout` persists  

### 8.4 Remove widget

1. User clicks remove on non-locked widget header  
2. `removeWidget` filters out; persist  

### 8.5 Reset layout

1. User clicks reset  
2. `getDefaultWidgets()` replaces state; persist  

### 8.6 Widget config update

1. Widget calls `onUpdateConfig(patch)`  
2. `updateWidgetConfig` merges into `config`; persist  

---

## 8.4 Feature-to-file traceability matrix

| Capability | Status | Primary files | Target ownership |
|------------|--------|---------------|------------------|
| Default route / shell | Live | `frontend/src/App.tsx`, `frontend/src/pages/DynamicDashboard.tsx` | App shell (unchanged) |
| Layout load/save/sanitize | Live | `frontend/src/store/dashboardLayout.ts` | Dashboard layout API |
| Widget registry / palette | Live | `frontend/src/widgets/registry.tsx` | CMS or config service optional |
| Types | Live | `frontend/src/types/dashboard.ts` | Shared SDK / OpenAPI types |
| Welcome widget | Live | `frontend/src/widgets/WelcomeWidget.tsx` | Content / i18n |
| KPI widget | Live | `frontend/src/widgets/KpiWidget.tsx` | Metrics API |
| Sales widget | Live | `frontend/src/widgets/SalesWidget.tsx` | Sales API |
| Inventory widget | Live | `frontend/src/widgets/InventoryWidget.tsx` | Inventory API |
| Quick actions | Live | `frontend/src/widgets/QuickActionsWidget.tsx` | Actions / deep links |
| Tasks widget | Live | `frontend/src/widgets/TasksWidget.tsx` | Tasks API |
| Finances widget | Live | `frontend/src/widgets/FinancesWidget.tsx` | Finance API |
| Profile / user-card | Live | `frontend/src/widgets/ProfileModuleWidget.tsx` | User profile API |
| Calendar | Live | `frontend/src/widgets/CalendarWidget.tsx` | Calendar API |
| Appointments | Live | `frontend/src/widgets/AppointmentsWidget.tsx` | Scheduling API |
| Meetings | Live | `frontend/src/widgets/MeetingsWidget.tsx` | Meetings API |
| Notes | Live | `frontend/src/widgets/NotesWidget.tsx` | Notes API |
| Table | Live | `frontend/src/widgets/TableWidget.tsx` | Generic data / reporting API |
| Todo list | Live | `frontend/src/widgets/TodoListWidget.tsx` | Tasks API |
| Picture | Live | `frontend/src/widgets/PictureWidget.tsx` | Object storage + CDN |
| Graph line/bar/pie/area | Live | `frontend/src/widgets/GraphLineWidget.tsx`, `GraphBarWidget.tsx`, `GraphPieWidget.tsx`, `GraphAreaWidget.tsx`, `frontend/src/widgets/useDashboardChartData.ts` | Analytics API |
| Legacy static Dashboard page | Unused in router | `frontend/src/pages/Dashboard.tsx` | Deprecate or merge patterns |
| Sidebar nav label | Live | `frontend/src/components/Sidebar.tsx` | N/A |

---

## 9) Security and privacy notes (current + target)

### Current

- Layout and widget `config` live in **browser storage** — device-bound, user can tamper locally  
- No server-side authorization on which widgets exist  
- Widget content may show business-sensitive demo data; production must enforce auth on **data APIs**  

### Target

- Authenticated **layout API**; encode **tenant / user** scope on every read/write  
- **Policy engine:** restrict widget types and data domains by role/department  
- **Audit** admin and shared-dashboard mutations  
- **PII:** minimize widget config in logs; classify dashboards for export/eDiscovery  
- **CSP / sanitization** for any rich HTML widgets in future  

---

## 9.1 Backup, restore, and disaster recovery (production target)

**Scope when server-backed**

- PostgreSQL: user/org layout rows, widget config JSON, template versions  
- Object storage: optional image widget payloads  
- Redis: optional cache only (rebuild from DB)  

**Backup baseline**

- Managed DB automated backups + PITR (per TRD)  
- Config export for templates major versions  

**Restore validation**

- Periodic restore to non-prod; verify layout counts and sample user dashboards  
- Smoke: load dashboard, move widget, save  

**DR**

- RTO/RPO align with [`Project-Report-Technical-Requirements.md`](../Project-Report-Technical-Requirements.md)  
- Runbooks: `RB-DB-BACKUP-RESTORE`, `RB-DR`  

---

## 10) API target design (proposed)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/v1/dashboard/layout` | Fetch layout for current user (or effective template) |
| `PUT` | `/api/v1/dashboard/layout` | Replace layout (with ETag / version) |
| `PATCH` | `/api/v1/dashboard/layout/widgets/{id}` | Update one widget grid/config |
| `POST` | `/api/v1/dashboard/layout/reset` | Reset to role default |
| `GET` | `/api/v1/dashboard/templates` | List allowed templates |
| `POST` | `/api/v1/dashboard/templates/{id}/apply` | Apply template (admin or self-service per policy) |
| `GET` | `/api/v1/dashboard/widgets/{type}/data` | Typed widget data feed (query params for range/filters) |
| `POST` | `/api/v1/dashboard/ai/briefing` | Optional morning briefing (governed) |
| `POST` | `/api/v1/dashboard/ai/suggest-layout` | Optional layout suggestion (governed; no auto-apply) |

---

## 11) AI features to add in Dashboard service

| AI Feature ID | Feature | User value | Suggested phase |
|---------------|---------|------------|-----------------|
| `AI-DASH-01` | Morning briefing | Narrative summary of KPIs and open tasks | Phase 4 |
| `AI-DASH-02` | Layout suggester | Proposes widget set for role (user accepts) | Phase 4 |
| `AI-DASH-03` | KPI anomaly hints | Flags unusual trends with short explanation | Phase 4–5 |
| `AI-DASH-04` | Natural-language “add widget” | Parses intent → suggested widget + placement | Phase 5 |
| `AI-DASH-05` | Semantic search across widgets | “Where did we discuss X?” across linked chats/reports | Later |

### 11.2 AI guardrails

- No **org-wide** or **multi-user** layout publish without admin approval  
- No automatic application of layout changes without explicit user confirm  
- Explain “why this suggestion” where feasible  
- Full **audit** and **cost/token** metadata per TRD AI governance  
- Redact PII in prompts; obey data residency rules  

---

## 12) Gaps and implementation roadmap (Dashboard service)

### Near-term (R1–R2)

- Define OpenAPI for layout + one pilot widget data endpoint  
- Server persistence with migration from `localStorage` (import on first login)  
- Feature flag: server vs local fallback  

### Mid-term (R3–R4)

- Role default templates + admin template editor  
- RBAC on widget types and data scopes  
- E2E tests for add/remove/drag/save  

### Long-term (R5+)

- Shared/team dashboards with audit  
- AI features with pilot groups and budget caps  
- Performance work: virtualize heavy widgets; lazy data loading  

---

## 13) Testing strategy (service-level)

| Layer | Focus |
|-------|--------|
| Unit | `sanitizeWidgets`, `applyGridLayout`, locked widget rules, config merge |
| Component | Grid renders, palette, remove/disable for locked |
| Integration | Language switch remounts widgets; persistence round-trip |
| E2E | Add widget, drag, refresh, expect positions |
| Security | AuthZ on layout API; no cross-user reads |
| Performance | Many widgets, chart render time, layout thrashing |

---

## 14) KPIs for this service

| KPI | Why it matters |
|-----|----------------|
| Layout save success rate | Reliability of personalization |
| Time-to-first-value (widgets configured) | Onboarding quality |
| Widget data load p95 | Perceived speed |
| Error rate per widget type | Isolation of bad feeds |
| AI suggestion acceptance (future) | Usefulness vs cost |

---

## 15) References

- `frontend/src/pages/DynamicDashboard.tsx`  
- `frontend/src/store/dashboardLayout.ts`  
- `frontend/src/types/dashboard.ts`  
- `frontend/src/widgets/registry.tsx`  
- `frontend/src/widgets/*.tsx`  
- `frontend/src/widgets/useWidgetLanguage.ts`  
- `frontend/src/widgets/useDashboardChartData.ts`  
- `frontend/src/contexts/LanguageContext.tsx`  
- `frontend/src/App.tsx`  
- `frontend/src/components/Sidebar.tsx`  
- `frontend/src/pages/Dashboard.tsx` (legacy, not routed)  
- `docs/HLD.md`  
- `docs/LLD.md`  
- `docs/Project-Report-Technical-Requirements.md`  

---

## 15.1 Sequence flows (target)

### Load layout (target)

```mermaid
sequenceDiagram
  participant U as User
  participant UI as DynamicDashboard
  participant API as DashboardAPI
  participant DB as PostgreSQL

  U->>UI: Open dashboard
  UI->>API: GET layout
  API->>DB: Load by user
  DB-->>API: layout JSON
  API-->>UI: layout + etag
  UI-->>U: Render grid
```

### Save layout after drag (target)

```mermaid
sequenceDiagram
  participant UI as DynamicDashboard
  participant API as DashboardAPI
  participant DB as PostgreSQL

  UI->>API: PUT layout if-match etag
  API->>DB: Persist widgets
  DB-->>API: ok
  API-->>UI: new etag
```

### Widget data fetch (target)

```mermaid
sequenceDiagram
  participant W as Widget
  participant API as DashboardAPI
  participant DB as PostgreSQL

  W->>API: GET widget data
  API->>DB: Query scoped metrics
  DB-->>API: rows
  API-->>W: normalized series
```

### AI briefing (target, governed)

```mermaid
sequenceDiagram
  participant U as User
  participant UI as DynamicDashboard
  participant API as DashboardAPI
  participant AI as AIOrchestrator

  U->>UI: Request briefing
  UI->>API: POST ai/briefing
  API->>AI: Policy scope context
  AI-->>API: narrative + citations metadata
  API-->>UI: render card
```

---

## 16) Roadmap location

The business-facing version roadmap is maintained in:

- [`docs/roadmap/DashboardHome-Roadmap.md`](../roadmap/DashboardHome-Roadmap.md)

This specification stays technical; rollout and owner gates live in the roadmap file.
