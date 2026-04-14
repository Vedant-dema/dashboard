# Kalender module — ChatGPT prompt (paste after uploading the ZIP)

Upload **`kalender-module-for-chatgpt.zip`** from the repo root, then paste the block below into ChatGPT.

---

You are a senior React/TypeScript engineer helping on the DEMA Dashboard repo.

**What you have:** I uploaded a ZIP containing a curated slice of the Purchase timetable (“Kalender / Einkaufs-Terminplan”) — not the full monorepo. Paths mirror the repo: `frontend/src/...` and `docs/wireframes/...`.

**Product goal:** Purchase-side call planner: schedule supplier calls, log outcomes, optional truck hints, offers (KA), a rich contact drawer with “Kunde overview” draft fields, persisted in the browser.

**i18n:** The real app uses `LanguageContext.tsx` (not in the ZIP). Assume visible strings use `t("key", "English fallback")` with keys like `timetable*` / `timetableOverview*`.

**Routing:** See `App.tsx` in the ZIP — e.g. `/purchase/kalender` and `/purchase/timetable` render the timetable page.

**Data:** Types in `frontend/src/types/timetable.ts`. Store in `frontend/src/store/timetableStore.ts` — Zustand + localStorage key **`dema-purchase-timetable-v6`** (legacy v1). `timetableOverviewKunde.ts` builds/normalizes `overview_kunde` for the drawer.

**UI:** `TimetablePage.tsx` (shell, filters), `TimetableTable.tsx`, `TimetableMiniCalendar.tsx`, `TimetableContactDrawer.tsx` + `components/*` + `contactDrawer*.ts`, modals `TimetableCallModal.tsx` / `TimetableOfferModal.tsx`. Wireframe: `docs/wireframes/timetable-contact-drawer-wireframe.md`.

**Customer parity:** `types/kunden.ts`, `customerRepository.ts`, `customerFormMapper.ts` show parallel customer/termin storage (localStorage).

**What I need from you:** *[Replace with your goal: e.g. sync KundenTermin ↔ TimetableEntry, refactor drawer, validation, bugfix, future API shape.]*

**Constraints:** Match existing patterns; do not assume a backend unless stated; new copy needs keys in de/en/fr (+ overrides) in the real repo.

**First step:** Summarize data flow (Page → store → table/drawer/modals), then answer my goal with file-level steps and risks (e.g. localStorage migration).

---

## ZIP contents checklist

- `frontend/src/types/timetable.ts`
- `frontend/src/types/kunden.ts`
- `frontend/src/store/timetableStore.ts`
- `frontend/src/App.tsx`
- `frontend/src/features/customers/mappers/customerFormMapper.ts`
- `frontend/src/features/customers/repository/customerRepository.ts`
- `frontend/src/pages/timetable/` (page, table, mini calendar, drawer, overview helper, form utils, CSS, modals, `components/*`)
- `docs/wireframes/timetable-contact-drawer-wireframe.md`
