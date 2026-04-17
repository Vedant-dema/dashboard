import type { DashboardLayout, WidgetInstance, WidgetType } from "../types/dashboard";

const STORAGE_KEY = "dema-dashboard-layout";

/** Ignore corrupted / old localStorage widget types so the dashboard can mount. */
const VALID_WIDGET_TYPES = new Set<WidgetType>([
  "welcome",
  "kpi",
  "sales",
  "inventory",
  "quick-actions",
  "tasks",
  "finances",
  "user-card",
  "profile",
  "calendar",
  "appointments",
  "meetings",
  "notes",
  "table",
  "todo-list",
  "picture",
  "graph-line",
  "graph-bar",
  "graph-pie",
  "graph-area",
]);

function sanitizeWidgets(widgets: unknown): WidgetInstance[] {
  if (!Array.isArray(widgets)) return [];
  return widgets.filter(
    (w): w is WidgetInstance =>
      w != null &&
      typeof w === "object" &&
      typeof (w as WidgetInstance).id === "string" &&
      VALID_WIDGET_TYPES.has((w as WidgetInstance).type) &&
      (w as WidgetInstance).grid != null &&
      typeof (w as WidgetInstance).grid === "object"
  );
}

function generateId(): string {
  return `w-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ensureProfileWidget(widgets: WidgetInstance[]): WidgetInstance[] {
  if (widgets.some((w) => w.type === "profile")) return widgets;
  return [
    ...widgets,
    { id: "profile", type: "profile", grid: { x: 8, y: 11, w: 4, h: 4 } },
  ];
}

/** Tasks & Reminders is always present on the dashboard (pinned). */
function ensureTasksWidget(widgets: WidgetInstance[]): WidgetInstance[] {
  if (widgets.some((w) => w.type === "tasks")) return widgets;
  const maxY = widgets.reduce((acc, w) => Math.max(acc, w.grid.y + w.grid.h), 0);
  return [
    ...widgets,
    { id: "tasks", type: "tasks", grid: { x: 6, y: maxY, w: 6, h: 4 }, pinned: true },
  ];
}

/** Upgrade any existing tasks widget to be pinned so it can't be removed. */
function upgradePinnedWidgets(widgets: WidgetInstance[]): WidgetInstance[] {
  return widgets.map((w) => (w.type === "tasks" ? { ...w, pinned: true } : w));
}

/** Remove deprecated default welcome subtitle from persisted layout (localStorage). */
const LEGACY_WELCOME_SUBTITLES = new Set([
  "Hier ist Ihre Übersicht — Sales, Purchase und Waschanlage auf einen Blick.",
  "Here is your overview — Sales, Purchase, and Car Wash at a glance.",
  "Voici votre vue d'ensemble — Ventes, Achats et Lavage en un coup d'oeil.",
  "La tua panoramica — Vendite, Acquisti e Autolavaggio a colpo d'occhio.",
]);

function stripLegacyWelcomeSubtitle(widgets: WidgetInstance[]): {
  widgets: WidgetInstance[];
  changed: boolean;
} {
  let changed = false;
  const next = widgets.map((w) => {
    if (w.type !== "welcome" || !w.config) return w;
    const sub = w.config.welcomeSubtitle;
    if (typeof sub !== "string" || !LEGACY_WELCOME_SUBTITLES.has(sub.trim())) return w;
    changed = true;
    const { welcomeSubtitle: _removed, ...rest } = w.config;
    return { ...w, config: Object.keys(rest).length > 0 ? rest : undefined };
  });
  return { widgets: next, changed };
}

export function getDefaultWidgets(): WidgetInstance[] {
  return [
    { id: "welcome", type: "welcome", grid: { x: 0, y: 0, w: 12, h: 1 }, locked: true },
    { id: "kpi", type: "kpi", grid: { x: 0, y: 1, w: 12, h: 2 }, locked: true },
    { id: "sales", type: "sales", grid: { x: 0, y: 3, w: 6, h: 5 } },
    { id: "inventory", type: "inventory", grid: { x: 6, y: 3, w: 6, h: 5 } },
    { id: "quick-actions", type: "quick-actions", grid: { x: 0, y: 8, w: 6, h: 3 } },
    { id: "tasks", type: "tasks", grid: { x: 6, y: 8, w: 6, h: 4 }, pinned: true },
    { id: "finances", type: "finances", grid: { x: 0, y: 11, w: 8, h: 5 } },
    { id: "profile", type: "profile", grid: { x: 8, y: 11, w: 4, h: 4 } },
    { id: "calendar", type: "calendar", grid: { x: 8, y: 15, w: 4, h: 5 } },
    { id: "appointments", type: "appointments", grid: { x: 8, y: 18, w: 4, h: 5 } },
  ];
}

export function loadLayout(): DashboardLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { widgets: getDefaultWidgets(), version: 1 };
    const parsed = JSON.parse(raw) as DashboardLayout;
    if (!Array.isArray(parsed?.widgets)) return { widgets: getDefaultWidgets(), version: 1 };
    const clean = sanitizeWidgets(parsed.widgets);
    if (clean.length === 0) return { widgets: getDefaultWidgets(), version: 1 };
    const withProfile = ensureProfileWidget(clean);
    const withTasks = ensureTasksWidget(withProfile);
    const withPinned = upgradePinnedWidgets(withTasks);
    const { widgets, changed } = stripLegacyWelcomeSubtitle(withPinned);
    const layout: DashboardLayout = { ...parsed, widgets, version: parsed.version ?? 1 };
    if (changed) saveLayout(layout);
    return layout;
  } catch {
    return { widgets: getDefaultWidgets(), version: 1 };
  }
}

export function saveLayout(layout: DashboardLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // ignore
  }
}

export function addWidget(type: WidgetType, grid: { x: number; y: number; w: number; h: number }): WidgetInstance {
  return {
    id: generateId(),
    type,
    grid,
  };
}

export function removeWidget(layout: DashboardLayout, widgetId: string): DashboardLayout {
  const widget = layout.widgets.find((w) => w.id === widgetId);
  if (widget?.locked || widget?.pinned) return layout;
  return {
    ...layout,
    widgets: layout.widgets.filter((w) => w.id !== widgetId),
  };
}

export function updateLayout(
  layout: DashboardLayout,
  updates: Array<{ id: string; grid: { x: number; y: number; w: number; h: number } }>
): DashboardLayout {
  const byId = new Map(layout.widgets.map((w) => [w.id, w]));
  for (const u of updates) {
    const w = byId.get(u.id);
    if (w && !w.locked) byId.set(u.id, { ...w, grid: u.grid });
  }
  return { ...layout, widgets: Array.from(byId.values()) };
}

/** Apply positions from react-grid-layout (locked widgets are immovable; pinned widgets can move). */
export function applyGridLayout(
  layout: DashboardLayout,
  items: Array<{ i: string; x: number; y: number; w: number; h: number }>
): DashboardLayout {
  const gridById = new Map(items.map((it) => [it.i, it]));
  return {
    ...layout,
    widgets: layout.widgets.map((w) => {
      if (w.locked) return w;
      const g = gridById.get(w.id);
      if (!g) return w;
      return { ...w, grid: { x: g.x, y: g.y, w: g.w, h: g.h } };
    }),
  };
}

export function updateWidgetConfig(
  layout: DashboardLayout,
  widgetId: string,
  patch: Record<string, unknown>
): DashboardLayout {
  return {
    ...layout,
    widgets: layout.widgets.map((w) => {
      if (w.id !== widgetId) return w;
      const next = { ...(w.config ?? {}) };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete next[k];
        else next[k] = v;
      }
      return { ...w, config: next };
    }),
  };
}
