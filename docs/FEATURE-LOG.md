# DEMA Dashboard — Feature Log

> **This file is maintained automatically by Cursor AI.**
> Every time a feature is added, modified, or extended, a new entry is appended here.
> Do NOT delete or reorder entries. Append only.

## Index

| # | Feature | Status | Date |
|---|---------|--------|------|
| [FEATURE-001](#feature-001) | Dynamic Dashboard Shell | Added | 2026-03-23 |
| [FEATURE-002](#feature-002) | Dashboard Layout Persistence Store | Added | 2026-03-25 |
| [FEATURE-003](#feature-003) | Task Notifications Store | Added | 2026-03-25 |
| [FEATURE-004](#feature-004) | TasksWidget — Full Task Management UI | Added | 2026-03-25 |
| [FEATURE-005](#feature-005) | TaskContextFields — Sub-task Context Panel | Added | 2026-03-25 |
| [FEATURE-006](#feature-006) | CalendarWidget — Dynamic Event Calendar | Added | 2026-03-25 |
| [FEATURE-007](#feature-007) | Backend VAT / VIES Proxy API | Added | 2026-03-23 |
| [FEATURE-008](#feature-008) | i18n Multi-Language System (12 languages) | Added | 2026-03-25 |
| [FEATURE-009](#feature-009) | Header Component | Added | 2026-03-25 |
| [FEATURE-010](#feature-010) | Dynamic Widget Lists / Presets | Added | 2026-03-25 |
| [FEATURE-015](#feature-015) | VIES trader match fields in API + form fallback | Modified | 2026-03-26 |
| [FEATURE-016](#feature-016) | Persist requester context for VIES checks | Extended | 2026-03-26 |

---

## [FEATURE-001]
## FEATURE-001: Dynamic Dashboard Shell
**Date:** 2026-03-23  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
A fully configurable, drag-and-drop widget grid that serves as the default landing page after authentication. Users can add, remove, resize, and reposition widgets. The layout is persisted per-user in localStorage.

### Where It Was Added
- `frontend/src/pages/DynamicDashboard.tsx` — main page component, grid orchestration
- `frontend/src/types/dashboard.ts` — TypeScript types (`WidgetType`, `WidgetInstance`, `DashboardLayout`)
- `frontend/src/widgets/registry.tsx` — widget catalogue, metadata, palette grouping
- `frontend/src/widgets/dynamicWidgetLists.ts` — preset widget lists per context
- `frontend/src/App.tsx` — default route registered here

### What It Does (Technical)
1. Renders a `react-grid-layout` `<ResponsiveGridLayout>` with vertical compaction.
2. Widget instances are loaded from `dashboardLayout` store (localStorage-backed).
3. Each widget instance maps to a `WidgetType` entry in `registry.tsx` which resolves to a React component.
4. Users can open a palette modal to add new widgets; removing a widget updates the layout store.
5. Pinned widgets skip move/resize in the layout callbacks.
6. Layout change events are debounced and flushed to `dashboardLayout` store.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `DashboardLayout` | object | Yes | `{ widgets: WidgetInstance[], cols: number }` loaded from store |
| `WidgetInstance` | object | Yes | `{ id, type, x, y, w, h, pinned?, config? }` |
| `WidgetType` | string enum | Yes | Identifies which widget component to render |

### Database
- **Engine:** None (localStorage only at current state)
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** `frontend/src/store/dashboardLayout.ts`
- **Actions/Selectors added:** `getLayout()`, `saveLayout()`, `resetLayout()`
- **Persisted:** Yes — `localStorage` key `dema-dashboard-layout`

### i18n Keys Added
Multiple keys via `useLanguage()` and `useWidgetLanguage()` — see `LanguageContext.tsx` for full list.

### Dependencies Added
- `react-grid-layout` (npm)

### Notes / Known Limitations
- Layout is browser-local; multi-device sync requires server-backed layout API (planned, see `DashboardHome-Service-Spec.md`).
- Legacy `Dashboard.tsx` (static Recharts demo) still exists but is not routed.

---

## [FEATURE-002]
## FEATURE-002: Dashboard Layout Persistence Store
**Date:** 2026-03-25  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
A Zustand-style vanilla store that serialises/deserialises the full dashboard widget layout to `localStorage`, including grid positions, sizes, and per-widget config.

### Where It Was Added
- `frontend/src/store/dashboardLayout.ts` — store implementation

### What It Does (Technical)
1. On first load, reads `localStorage["dema-dashboard-layout"]` and parses JSON.
2. Falls back to a built-in default layout when the key is absent or corrupt.
3. Exposes `getLayout()`, `saveLayout(layout)`, and `resetLayout()`.
4. `saveLayout` serialises to JSON and writes back to `localStorage`.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `layout` | `DashboardLayout` | Yes | Full layout object to persist |

### Database
- **Engine:** Browser `localStorage`
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** `localStorage.getItem("dema-dashboard-layout")` / `setItem`

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** `frontend/src/store/dashboardLayout.ts`
- **Actions/Selectors added:** `getLayout`, `saveLayout`, `resetLayout`
- **Persisted:** Yes

### i18n Keys Added
None.

### Dependencies Added
None.

### Notes / Known Limitations
Layout resets silently if JSON is corrupted. A migration strategy is planned for future schema changes.

---

## [FEATURE-003]
## FEATURE-003: Task Notifications Store
**Date:** 2026-03-25  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
A lightweight in-memory store that tracks unread task notifications (due-soon alerts, assignment alerts) and exposes a badge count used by the Header and TasksWidget.

### Where It Was Added
- `frontend/src/store/taskNotifications.ts` — store implementation

### What It Does (Technical)
1. Maintains an array of `TaskNotification` objects in memory.
2. New notifications are pushed by `TasksWidget` when tasks reach due-date thresholds.
3. Consumers call `markRead(id)` or `clearAll()` to dismiss.
4. Derived selector `unreadCount` returns the badge number.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `TaskNotification.id` | string | Yes | Unique notification ID |
| `TaskNotification.taskId` | string | Yes | Reference to source task |
| `TaskNotification.type` | `"due_soon" \| "assigned" \| "overdue"` | Yes | Alert category |
| `TaskNotification.message` | string | Yes | Human-readable text (i18n string) |
| `TaskNotification.read` | boolean | Yes | Read state |

### Database
- **Engine:** None (in-memory, not persisted)
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** `frontend/src/store/taskNotifications.ts`
- **Actions/Selectors added:** `pushNotification`, `markRead`, `clearAll`, `unreadCount`
- **Persisted:** No

### i18n Keys Added
Notification message strings use existing `notif*` and `tasks*` keys from `LanguageContext.tsx`.

### Dependencies Added
None.

### Notes / Known Limitations
Notifications are lost on page refresh. Persistence to `localStorage` or server is a planned enhancement.

---

## [FEATURE-004]
## FEATURE-004: TasksWidget — Full Task Management UI
**Date:** 2026-03-25  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
A full-featured task management widget embedded in the dashboard. Supports creating, editing, completing, and deleting tasks. Tasks are grouped by date (Today / Overdue / Upcoming), filtered by tabs, have priorities, assignees, due dates, and contextual sub-fields.

### Where It Was Added
- `frontend/src/widgets/TasksWidget.tsx` — main widget component (~32 KB)
- `frontend/src/widgets/TaskContextFields.tsx` — context sub-fields panel
- `frontend/src/widgets/dynamicWidgetLists.ts` — widget registered in preset lists
- `frontend/src/contexts/LanguageContext.tsx` — `tasks*` i18n keys added

### What It Does (Technical)
1. On mount, loads tasks from `localStorage["dema-tasks"]`.
2. Renders three tabs: Today / Overdue / All, each with a grouped list.
3. "Add Task" form collects title, priority, due date, assignee, and context fields.
4. Completing a task triggers a short animation and moves it to a "Completed" section.
5. Overdue tasks trigger a `taskNotifications` store push with type `"overdue"`.
6. Edit mode opens inline with the same form fields pre-populated.
7. Each task can expand to show `TaskContextFields` (project, department, notes, etc.).

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `Task.id` | string | Yes | UUID |
| `Task.title` | string | Yes | Task title |
| `Task.priority` | `"high" \| "medium" \| "low"` | Yes | Visual priority badge |
| `Task.dueDate` | `string (ISO)` | No | Due date |
| `Task.assignee` | string | No | Assignee name |
| `Task.completed` | boolean | Yes | Completion state |
| `Task.context` | `TaskContext` object | No | Extended context fields |

### Database
- **Engine:** Browser `localStorage`
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** `localStorage.getItem("dema-tasks")` / `setItem`

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** `frontend/src/store/taskNotifications.ts` (notifications side-effect)
- **Actions/Selectors added:** Calls `pushNotification` for overdue tasks
- **Persisted:** Yes — `localStorage["dema-tasks"]`

### i18n Keys Added
`tasksTitle`, `tasksAddNew`, `tasksPriority`, `tasksHigh`, `tasksMedium`, `tasksNew`, `tasksDueDate`, `tasksAssignee`, `tasksCompleted`, `tasksOverdue`, `tasksNoTasks`, `tabToday`, `tabOverdue`, `tabAll`, `taskPreset*` keys — all added to `MESSAGES.de`, `MESSAGES.en`, `MESSAGES.fr`.

### Dependencies Added
None.

### Notes / Known Limitations
Tasks are browser-local. Server sync and multi-user assignment are planned (see `DashboardHome-Roadmap.md`).

---

## [FEATURE-005]
## FEATURE-005: TaskContextFields — Sub-task Context Panel
**Date:** 2026-03-25  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
An expandable panel inside each task card that renders contextual metadata fields (project link, department, customer reference, notes, attachments placeholder). Shown/hidden with an expand toggle.

### Where It Was Added
- `frontend/src/widgets/TaskContextFields.tsx` — standalone component

### What It Does (Technical)
1. Receives a `TaskContext` object and an `onChange` callback as props.
2. Renders labelled input fields for each context dimension.
3. All changes bubble up via `onChange` to the parent `TasksWidget` which persists to localStorage.
4. All labels use `t()` for i18n compliance.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `context.project` | string | No | Project name or link |
| `context.department` | string | No | Owning department |
| `context.customer` | string | No | Customer reference |
| `context.notes` | string | No | Free-text notes |
| `onChange` | `(ctx: TaskContext) => void` | Yes | Callback on any field change |

### Database
- **Engine:** Browser `localStorage` (via parent TasksWidget)
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** N/A (stateless, controlled component)
- **Actions/Selectors added:** None
- **Persisted:** No (parent owns persistence)

### i18n Keys Added
`tasksContextProject`, `tasksContextDept`, `tasksContextCustomer`, `tasksContextNotes` — added to `MESSAGES.de`, `MESSAGES.en`, `MESSAGES.fr`.

### Dependencies Added
None.

### Notes / Known Limitations
Attachment upload is a placeholder only; file storage integration is a future task.

---

## [FEATURE-006]
## FEATURE-006: CalendarWidget — Dynamic Event Calendar
**Date:** 2026-03-25  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
A monthly calendar widget that shows events, allows adding new events inline, and integrates with the task due-dates from `TasksWidget`. Day cells highlight when they have events or task deadlines.

### Where It Was Added
- `frontend/src/widgets/CalendarWidget.tsx` — widget component (~11 KB)

### What It Does (Technical)
1. Renders a month grid built from JavaScript `Date` calculations (no external calendar lib).
2. Reads events from `localStorage["dema-calendar-events"]`.
3. Also reads tasks from `localStorage["dema-tasks"]` and marks days that have a due task.
4. Clicking a day opens a popover to add or view events for that day.
5. Navigation arrows move between months.
6. All text strings use `useWidgetLanguage()`.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `CalendarEvent.id` | string | Yes | UUID |
| `CalendarEvent.date` | `string (YYYY-MM-DD)` | Yes | Event date |
| `CalendarEvent.title` | string | Yes | Event title |
| `CalendarEvent.type` | `"event" \| "task_due"` | Yes | Visual type indicator |

### Database
- **Engine:** Browser `localStorage`
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** `localStorage.getItem("dema-calendar-events")` / `setItem`

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** None (self-managed local state + localStorage)
- **Actions/Selectors added:** N/A
- **Persisted:** Yes — `localStorage["dema-calendar-events"]`

### i18n Keys Added
`calendarTitle`, `calendarAddEvent`, `calendarNoEvents`, `calendarMonths*`, `calendarDays*` — added to `MESSAGES.de`, `MESSAGES.en`, `MESSAGES.fr`.

### Dependencies Added
None.

### Notes / Known Limitations
Google Calendar / Outlook sync is a planned future integration.

---

## [FEATURE-007]
## FEATURE-007: Backend VAT / VIES Proxy API
**Date:** 2026-03-23  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
A FastAPI backend service that proxies EU VIES VAT validation requests. It serialises concurrent outbound calls (EU VIES enforces a max-concurrent limit), retries with exponential backoff, and optionally translates non-Latin company names to English via `deep-translator`.

### Where It Was Added
- `backend/main.py` — full FastAPI application (~584 lines)
- `backend/requirements.txt` — Python dependencies

### What It Does (Technical)
1. `POST /api/v1/vat/check` — validates a VAT number against the EU VIES REST API, retries up to `VIES_MAX_RETRIES` times on transient errors.
2. `POST /api/v1/vat/check-test` — calls the VIES test-service endpoint.
3. `GET /api/v1/vat/status` — returns current VIES service availability.
4. An asyncio semaphore serialises all outbound VIES calls to avoid `MS_MAX_CONCURRENT_REQ` errors.
5. Optional `deep_translator.GoogleTranslator` translates Cyrillic/CJK company names.
6. CORS is configured via `CORS_ORIGINS` env var (defaults to `localhost:5173`).

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `countryCode` | string (2-char) | Yes | ISO 3166-1 alpha-2 EU member state |
| `vatNumber` | string | Yes | VAT number without country prefix |
| `requesterCountryCode` | string | No | Requester's country (for consultation number) |
| `requesterVatNumber` | string | No | Requester's VAT number |

Response includes: `valid`, `name`, `address`, `consultationNumber`, `vies_raw` (optional).

### Database
- **Engine:** SQLite (`backend/dema.db`) — referenced but VAT check itself is stateless
- **Tables Affected:** None for VAT checks
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| POST | `/api/v1/vat/check` | None | `{ countryCode, vatNumber, requesterCountryCode?, requesterVatNumber? }` | `{ valid, name, address, consultationNumber, vies_raw? }` |
| POST | `/api/v1/vat/check-test` | None | Same as above | Same as above |
| GET | `/api/v1/vat/status` | None | — | `{ available, memberStates }` |

### State / Store (if applicable)
- **Store file:** N/A (stateless REST service)
- **Actions/Selectors added:** N/A
- **Persisted:** No

### i18n Keys Added
None (backend service).

### Dependencies Added
- `fastapi` (pip)
- `uvicorn` (pip)
- `httpx` (pip)
- `pydantic` (pip)
- `deep-translator` (pip, optional)

### Notes / Known Limitations
- `VIES_PRINT_RAW` logs full VAT JSON to stderr by default — set to `0` in production.
- `dema.db` SQLite file exists for future feature persistence but is not yet used by the VAT service.

---

## [FEATURE-008]
## FEATURE-008: i18n Multi-Language System (12 Languages)
**Date:** 2026-03-25  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
A full internationalisation system supporting 12 languages: German (default), English, French, Spanish, Italian, Portuguese, Turkish, Russian, Hindi, Arabic, Chinese, and Japanese. A single `LanguageContext` provides the `t(key, fallback)` translation function throughout the app.

### Where It Was Added
- `frontend/src/contexts/LanguageContext.tsx` — single source of truth (~2679 lines)

### What It Does (Technical)
1. `MESSAGES.de` holds the primary German strings; `MESSAGES.en` and `MESSAGES.fr` hold their equivalents.
2. Nine `LANGUAGE_OVERRIDES` objects merge over `MESSAGES.en` for the remaining languages.
3. `LanguageProvider` detects the user's saved language from `localStorage["dema-lang"]` and provides `{ t, language, setLanguage }` via React context.
4. Pages/components use `useLanguage()`; widgets use `useWidgetLanguage()`.
5. Changing language triggers a re-render of all consumers.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `language` | `"de"\|"en"\|"fr"\|"es"\|"it"\|"pt"\|"tr"\|"ru"\|"hi"\|"ar"\|"zh"\|"ja"` | Yes | Active language code |
| `t(key, fallback)` | function | Yes | Returns translated string for key |

### Database
- **Engine:** Browser `localStorage`
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** `localStorage.getItem("dema-lang")` / `setItem`

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** `frontend/src/contexts/LanguageContext.tsx`
- **Actions/Selectors added:** `t`, `language`, `setLanguage`
- **Persisted:** Yes — `localStorage["dema-lang"]`

### i18n Keys Added
This feature IS the i18n system. All keys live here.

### Dependencies Added
None.

### Notes / Known Limitations
RTL layout for Arabic is not yet handled in CSS; a future task will add `dir="rtl"` switching.

---

## [FEATURE-009]
## FEATURE-009: Header Component
**Date:** 2026-03-25  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
The top application header bar containing the DEMA logo, navigation links, language switcher, notification bell (with badge from `taskNotifications` store), and user avatar/profile menu.

### Where It Was Added
- `frontend/src/components/Header.tsx` — header component

### What It Does (Technical)
1. Reads `unreadCount` from `taskNotifications` store to display the notification badge.
2. Renders a language selector dropdown that calls `setLanguage()` from `LanguageContext`.
3. Navigation links are driven by the router; active route is highlighted.
4. All labels use `t()`.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `unreadCount` | number | Yes | Badge count from `taskNotifications` store |
| `language` | string | Yes | Active language from `LanguageContext` |

### Database
- **Engine:** None
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** `frontend/src/store/taskNotifications.ts` (read-only consumer)
- **Actions/Selectors added:** Reads `unreadCount`
- **Persisted:** No

### i18n Keys Added
`headerNotifications`, `headerProfile`, `headerSettings`, `headerLanguage` — added to `MESSAGES.de`, `MESSAGES.en`, `MESSAGES.fr`.

### Dependencies Added
None.

### Notes / Known Limitations
User avatar is a placeholder; real user profile integration is a future task.

---

## [FEATURE-010]
## FEATURE-010: Dynamic Widget Lists / Presets
**Date:** 2026-03-25  
**Author/Agent:** Cursor AI  
**Status:** Added  

### What Was Added
A configuration file that defines named preset widget lists (e.g., "Sales", "Operations", "Executive") used to populate the dashboard with contextually relevant widgets when a user selects a layout template.

### Where It Was Added
- `frontend/src/widgets/dynamicWidgetLists.ts` — preset definitions (~9 KB)

### What It Does (Technical)
1. Exports an array of `WidgetListPreset` objects, each with a name, description, and array of `WidgetInstance` definitions.
2. `DynamicDashboard` reads these presets to populate the "Load Template" modal.
3. Selecting a preset calls `saveLayout` with the preset's widget array.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `WidgetListPreset.id` | string | Yes | Unique preset ID |
| `WidgetListPreset.name` | string | Yes | Display name (i18n key) |
| `WidgetListPreset.widgets` | `WidgetInstance[]` | Yes | Default widget instances |

### Database
- **Engine:** None (static configuration)
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|--------|------|------|-------------|----------|
| N/A | — | — | — | — |

### State / Store (if applicable)
- **Store file:** N/A (static config, consumed by `dashboardLayout` store)
- **Actions/Selectors added:** N/A
- **Persisted:** No

### i18n Keys Added
Preset name keys added to `MESSAGES.de`, `MESSAGES.en`, `MESSAGES.fr`.

### Dependencies Added
None.

### Notes / Known Limitations
Presets are compile-time static. Admin-editable presets stored server-side are a planned future feature.

---

<!-- NEW ENTRIES GO BELOW THIS LINE -->

---

## [FEATURE-013] VAT Check Cloud Timeout & Error Handling Fix
**Date:** 2026-03-25
**Author/Agent:** Cursor AI
**Status:** Modified

### What Was Added
Fixed two related bugs that caused the VAT-ID validation feature to silently fail on cloud deployments with the unhelpful message "Prüfung fehlgeschlagen". The backend now respects a configurable total-time budget (`VIES_MAX_TOTAL_SEC`, default 24 s) so the retry loop always completes before a cloud reverse proxy (typically 30 s timeout) kills the connection. The frontend now produces meaningful error messages for every failure mode: CORS blocks (HTTP status 0), proxy timeout/gateway errors (non-JSON body), and alternative error JSON shapes (`error`/`message` keys instead of FastAPI's `detail`).

### Where It Was Added
- `backend/main.py` — added `VIES_MAX_TOTAL_SEC` env-var, wall-clock guard at loop top, sleep capped by remaining budget, updated module docstring
- `frontend/src/components/NewCustomerModal.tsx` — improved `formatVatCheckDetail` to handle proxy error shapes; added explicit status-0 (CORS) guard and non-JSON-body guard in `runVatCheck`
- `docs/FEATURE-LOG.md` — this entry

### What It Does (Technical)
1. On every retry-loop iteration the backend computes `elapsed = now - loop_start`.
2. If `elapsed >= VIES_MAX_TOTAL_SEC` (default 24 s) an HTTP 503 is raised immediately with a descriptive message, ensuring the response arrives before a 30 s proxy cuts the connection.
3. Each backoff sleep is capped at `min(normal_sleep, remaining_budget - 1 s)` so it never overshoots the budget.
4. In the frontend, before reading the body, `res.status === 0` is caught as a CORS error with an actionable hint.
5. If `JSON.parse` throws (proxy returned HTML), the raw text is stored and an explicit proxy-timeout error message is shown (including the HTTP status code).
6. `formatVatCheckDetail` now also extracts `error`, `message`, `error_description` keys from the response object before falling back to the generic text.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|---|---|---|---|
| VIES_MAX_TOTAL_SEC | env var (float) | No | Wall-clock budget in seconds for the full VIES retry loop (default: 24.0) |

### Database
- **Engine:** N/A
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | /api/v1/vat/check | None | VatCheckRequest | VatCheckResponse (unchanged shape) |

### State / Store (if applicable)
- **Store file:** N/A
- **Actions/Selectors added:** N/A
- **Persisted:** No

### i18n Keys Added
None.

### Dependencies Added
None.

### Notes / Known Limitations
- If `VIES_MAX_TOTAL_SEC` is lower than a single VIES call's response time (usually < 2 s), only one attempt will be made. Recommended minimum: 10 s.
- Cloud platforms with timeouts shorter than 24 s (e.g. Vercel Hobby at 10 s) require `VIES_MAX_TOTAL_SEC` to be lowered accordingly.
- The `_vies_serial` lock serialises all VIES calls; on a busy server a request may wait behind another request's full budget before it even starts.

---

## [FEATURE-014] Default VIES Requester Fallback
**Date:** 2026-03-26
**Author/Agent:** Cursor AI
**Status:** Extended

### What Was Added
Extended VAT validation so the backend can automatically attach a configured requester identity to VIES checks when the frontend does not provide requester fields. This improves the chance of receiving additional trader detail metadata in jurisdictions that only process richer checks when requester context is present, while keeping response shape unchanged.

### Where It Was Added
- `backend/main.py` — added optional env-based requester fallback (`VIES_REQUESTER_CC`, `VIES_REQUESTER_VAT`), validation, normalization, and integration into payload construction
- `docs/FEATURE-LOG.md` — this entry

### What It Does (Technical)
1. Reads optional env vars `VIES_REQUESTER_CC` and `VIES_REQUESTER_VAT`.
2. Validates they are both present together, checks the requester country code against supported VIES requester codes, and normalizes requester VAT format.
3. During `/api/v1/vat/check` and `/api/v1/vat/check-test` payload build, if requester fields are not sent in the request body, injects the validated env defaults.
4. If env defaults are invalid or incomplete, returns a clear server error instead of sending malformed payloads to VIES.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|---|---|---|---|
| VIES_REQUESTER_CC | env var (string) | No | Default requester member-state code (e.g. `DE`, `EU`) |
| VIES_REQUESTER_VAT | env var (string) | No | Default requester VAT number used with `VIES_REQUESTER_CC` |

### Database
- **Engine:** None
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/v1/vat/check` | None | `VatCheckRequest` (requester fields optional) | `VatCheckResponse` (unchanged) |
| POST | `/api/v1/vat/check-test` | None | `VatCheckRequest` (requester fields optional) | `VatCheckResponse` (unchanged) |

### State / Store (if applicable)
- **Store file:** N/A
- **Actions/Selectors added:** N/A
- **Persisted:** No

### i18n Keys Added
None.

### Dependencies Added
None.

### Notes / Known Limitations
- This cannot force VIES to return `name`/`address`; member-state privacy policy still controls exposed fields.
- Some countries may continue to return only validity (`valid`) even with requester context.

---

## [FEATURE-015]
## FEATURE-015: VIES trader match fields surfaced + customer form fallback
**Date:** 2026-03-26
**Author/Agent:** Cursor AI
**Status:** Modified

### What Was Added
VAT check responses now expose the same trader `*Match` statuses from VIES in the top-level `trader_*_match` fields (including `NOT_PROCESSED`), so clients are not forced to parse `vies_raw`. The new-customer VAT request also reuses **Kunde** tab data (name, street, PLZ, city, legal form) as VIES `trader*` comparison fields when the advanced VIES inputs are empty, improving the chance of real match results where the member state supports approximate checks.

### Where It Was Added
- `backend/main.py` — `_map_vies_check_response` no longer maps VIES match sentinels to `null`
- `frontend/src/components/NewCustomerModal.tsx` — `runVatCheck` builds trader_* payload from form fallbacks
- `docs/FEATURE-LOG.md` — this entry

### What It Does (Technical)
1. `_m()` returns the trimmed VIES string for `traderNameMatch` etc., or `null` only when the field is missing or blank.
2. Before `POST /api/v1/vat/check`, the modal sets each `trader_*` body field from the VIES advanced field if set, otherwise from `form` (`firmenname`, `strasse`, `plz`, `ort`, `gesellschaftsform`).

### Data It Accepts / Emits
| Field | Type | Required | Description |
|---|---|---|---|
| `trader_name_match` | string (nullable) | No | VIES `traderNameMatch` (e.g. `NOT_PROCESSED`, member-state-specific match codes) |
| `trader_street_match` | string (nullable) | No | Same for street |
| `trader_postal_code_match` | string (nullable) | No | Same for postal code |
| `trader_city_match` | string (nullable) | No | Same for city |
| `trader_company_type_match` | string (nullable) | No | Same for company type |

### Database
- **Engine:** N/A
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/v1/vat/check` | None | `VatCheckRequest` | `VatCheckResponse.trader_*_match` may be non-null for all VIES match codes |
| POST | `/api/v1/vat/check-test` | None | `VatCheckRequest` | Same |

### State / Store (if applicable)
- **Store file:** N/A
- **Actions/Selectors added:** N/A
- **Persisted:** No

### i18n Keys Added
None.

### Dependencies Added
None.

### Notes / Known Limitations
- Many member states still return `NOT_PROCESSED` for approximate matching or omit trader details; this change does not change VIES behaviour, only preserves and forwards its match fields.
- Real cross-field matching may still require requester context (`VIES_REQUESTER_*` or explicit requester fields) per member-state rules.

---

## [FEATURE-016]
## FEATURE-016: Persist requester context for VIES checks
**Date:** 2026-03-26
**Author/Agent:** Cursor AI
**Status:** Extended

### What Was Added
Extended the customer VAT-check modal so requester information no longer resets to empty on each open. The modal now restores requester member-state and requester VAT from browser storage (or optional build-time defaults), and keeps those values persisted. This makes VIES checks in deployed environments behave consistently with localhost workflows where requester context was already configured.

### Where It Was Added
- `frontend/src/components/NewCustomerModal.tsx` — added requester persistence helpers, env defaults (`VITE_VIES_REQUESTER_CC`, `VITE_VIES_REQUESTER_VAT`), state initialization from storage/defaults, and persistence effects
- `docs/FEATURE-LOG.md` — this entry

### What It Does (Technical)
1. Defines storage keys for requester country and VAT.
2. Reads stored requester values safely from `localStorage` with fallback to empty strings.
3. Initializes modal requester state from stored values, then from optional build-time defaults.
4. On modal open, restores requester values instead of clearing them.
5. Persists requester field changes back to `localStorage` so subsequent checks reuse the same requester context.

### Data It Accepts / Emits
| Field | Type | Required | Description |
|---|---|---|---|
| `VITE_VIES_REQUESTER_CC` | env var (string) | No | Optional default requester member-state code used when no stored value exists |
| `VITE_VIES_REQUESTER_VAT` | env var (string) | No | Optional default requester VAT used when no stored value exists |
| `dema-vies-requester-cc` | localStorage key | No | Persisted requester member-state for VAT checks |
| `dema-vies-requester-vat` | localStorage key | No | Persisted requester VAT for VAT checks |

### Database
- **Engine:** None
- **Tables Affected:** N/A
- **Schema Changes:** None
- **Key Queries:** None

### API Endpoints (if applicable)
| Method | Path | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/api/v1/vat/check` | None | `VatCheckRequest` (requester values now consistently reused if previously entered) | `VatCheckResponse` |

### State / Store (if applicable)
- **Store file:** N/A (component-local state + `localStorage`)
- **Actions/Selectors added:** N/A
- **Persisted:** Yes (`localStorage` requester keys)

### i18n Keys Added
None.

### Dependencies Added
None.

### Notes / Known Limitations
- Persisted requester values are browser-local; users on a different browser/device must enter them once there.
- Member-state rules still apply; some countries may continue returning `NOT_PROCESSED` despite requester context.
