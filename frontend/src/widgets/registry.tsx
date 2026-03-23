import type { ReactNode } from "react";
import type { WidgetMeta, WidgetType } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { WelcomeWidget } from "./WelcomeWidget";
import { KpiWidget } from "./KpiWidget";
import { SalesWidget } from "./SalesWidget";
import { InventoryWidget } from "./InventoryWidget";
import { QuickActionsWidget } from "./QuickActionsWidget";
import { TasksWidget } from "./TasksWidget";
import { FinancesWidget } from "./FinancesWidget";
import { ProfileModuleWidget } from "./ProfileModuleWidget";
import { CalendarWidget } from "./CalendarWidget";
import { AppointmentsWidget } from "./AppointmentsWidget";
import { MeetingsWidget } from "./MeetingsWidget";
import { NotesWidget } from "./NotesWidget";
import { TableWidget } from "./TableWidget";
import { TodoListWidget } from "./TodoListWidget";
import { PictureWidget } from "./PictureWidget";
import { GraphLineWidget } from "./GraphLineWidget";
import { GraphBarWidget } from "./GraphBarWidget";
import { GraphPieWidget } from "./GraphPieWidget";
import { GraphAreaWidget } from "./GraphAreaWidget";

function UnknownDashboardWidget({ type }: { type: string }) {
  const { t } = useWidgetLanguage();
  return (
    <div className="p-4 text-slate-500">
      {t("widgetUnknown", "Unknown widget")}: {type}
    </div>
  );
}

const componentMap: Record<WidgetType, () => ReactNode> = {
  welcome: () => <WelcomeWidget />,
  kpi: () => <KpiWidget />,
  sales: () => <SalesWidget />,
  inventory: () => <InventoryWidget />,
  "quick-actions": () => <QuickActionsWidget />,
  tasks: () => <TasksWidget />,
  finances: () => <FinancesWidget />,
  "user-card": () => <ProfileModuleWidget />,
  profile: () => <ProfileModuleWidget />,
  calendar: () => <CalendarWidget />,
  appointments: () => <AppointmentsWidget />,
  meetings: () => <MeetingsWidget />,
  notes: () => <NotesWidget />,
  table: () => <TableWidget />,
  "todo-list": () => <TodoListWidget />,
  picture: () => <PictureWidget />,
  "graph-line": () => <GraphLineWidget />,
  "graph-bar": () => <GraphBarWidget />,
  "graph-pie": () => <GraphPieWidget />,
  "graph-area": () => <GraphAreaWidget />,
};

export function getWidgetComponent(type: WidgetType): () => ReactNode {
  return componentMap[type] ?? (() => <UnknownDashboardWidget type={type} />);
}

const ADDABLE_TYPES: WidgetType[] = [
  "table",
  "todo-list",
  "picture",
  "graph-line",
  "graph-bar",
  "graph-pie",
  "graph-area",
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
];

const metaByType: Record<WidgetType, WidgetMeta> = {
  welcome: { type: "welcome", title: "Willkommen", titleKey: "widgetTitleWelcome", defaultSize: { w: 12, h: 1 }, locked: true },
  kpi: { type: "kpi", title: "KPIs", titleKey: "widgetTitleKpi", defaultSize: { w: 12, h: 2 }, locked: true },
  table: {
    type: "table",
    title: "Tabelle",
    titleKey: "widgetTitleTable",
    paletteGroupKey: "tables",
    paletteGroup: "Tabellen",
    defaultSize: { w: 6, h: 4 },
    minW: 4,
    minH: 3,
    addable: true,
  },
  "todo-list": {
    type: "todo-list",
    title: "To-do Liste",
    titleKey: "widgetTitleTodoList",
    paletteGroupKey: "lists",
    paletteGroup: "Listen",
    defaultSize: { w: 4, h: 3 },
    minW: 3,
    minH: 2,
    addable: true,
  },
  picture: {
    type: "picture",
    title: "Bild",
    titleKey: "widgetTitlePicture",
    paletteGroupKey: "media",
    paletteGroup: "Medien",
    defaultSize: { w: 5, h: 4 },
    minW: 3,
    minH: 3,
    addable: true,
  },
  "graph-line": {
    type: "graph-line",
    title: "Linie",
    titleKey: "widgetTitleGraphLine",
    paletteGroupKey: "charts",
    paletteGroup: "Diagramme",
    defaultSize: { w: 4, h: 3 },
    minW: 3,
    minH: 2,
    addable: true,
  },
  "graph-bar": {
    type: "graph-bar",
    title: "Balken",
    titleKey: "widgetTitleGraphBar",
    paletteGroupKey: "charts",
    paletteGroup: "Diagramme",
    defaultSize: { w: 4, h: 3 },
    minW: 3,
    minH: 2,
    addable: true,
  },
  "graph-pie": {
    type: "graph-pie",
    title: "Kreis",
    titleKey: "widgetTitleGraphPie",
    paletteGroupKey: "charts",
    paletteGroup: "Diagramme",
    defaultSize: { w: 4, h: 3 },
    minW: 3,
    minH: 2,
    addable: true,
  },
  "graph-area": {
    type: "graph-area",
    title: "Fläche",
    titleKey: "widgetTitleGraphArea",
    paletteGroupKey: "charts",
    paletteGroup: "Diagramme",
    defaultSize: { w: 4, h: 3 },
    minW: 3,
    minH: 2,
    addable: true,
  },
  sales: {
    type: "sales",
    title: "Verkaufsleistung",
    titleKey: "widgetTitleSales",
    paletteGroupKey: "overviews",
    paletteGroup: "Übersichten",
    defaultSize: { w: 6, h: 5 },
    minW: 4,
    minH: 4,
    addable: true,
  },
  inventory: {
    type: "inventory",
    title: "Bestandsübersicht",
    titleKey: "widgetTitleInventory",
    paletteGroupKey: "overviews",
    paletteGroup: "Übersichten",
    defaultSize: { w: 6, h: 5 },
    minW: 4,
    minH: 3,
    addable: true,
  },
  "quick-actions": {
    type: "quick-actions",
    title: "Schnelle Aktionen",
    titleKey: "widgetTitleQuickActions",
    paletteGroupKey: "actions",
    paletteGroup: "Aktionen",
    defaultSize: { w: 6, h: 3 },
    minW: 4,
    minH: 2,
    addable: true,
  },
  tasks: {
    type: "tasks",
    title: "Aufgaben & Erinnerungen",
    titleKey: "widgetTitleTasks",
    paletteGroupKey: "lists",
    paletteGroup: "Listen",
    defaultSize: { w: 6, h: 3 },
    minW: 4,
    minH: 2,
    addable: true,
  },
  finances: {
    type: "finances",
    title: "Finanzen",
    titleKey: "widgetTitleFinances",
    paletteGroupKey: "overviews",
    paletteGroup: "Übersichten",
    defaultSize: { w: 8, h: 5 },
    minW: 4,
    minH: 3,
    addable: true,
  },
  "user-card": {
    type: "user-card",
    title: "Profil Modul",
    titleKey: "widgetTitleUserCard",
    paletteGroupKey: "misc",
    paletteGroup: "Sonstiges",
    defaultSize: { w: 4, h: 2 },
    minW: 2,
    minH: 1,
    addable: true,
  },
  profile: {
    type: "profile",
    title: "Profil Modul",
    titleKey: "widgetTitleProfile",
    paletteGroupKey: "misc",
    paletteGroup: "Sonstiges",
    defaultSize: { w: 4, h: 4 },
    minW: 3,
    minH: 3,
    addable: true,
  },
  calendar: {
    type: "calendar",
    title: "Kalender",
    titleKey: "widgetTitleCalendar",
    paletteGroupKey: "planning",
    paletteGroup: "Planung",
    defaultSize: { w: 4, h: 5 },
    minW: 3,
    minH: 4,
    addable: true,
  },
  appointments: {
    type: "appointments",
    title: "Termine",
    titleKey: "widgetTitleAppointments",
    paletteGroupKey: "planning",
    paletteGroup: "Planung",
    defaultSize: { w: 4, h: 5 },
    minW: 3,
    minH: 3,
    addable: true,
  },
  meetings: {
    type: "meetings",
    title: "Meetings",
    titleKey: "widgetTitleMeetings",
    paletteGroupKey: "planning",
    paletteGroup: "Planung",
    defaultSize: { w: 4, h: 4 },
    minW: 3,
    minH: 2,
    addable: true,
  },
  notes: {
    type: "notes",
    title: "Notizen",
    titleKey: "widgetTitleNotes",
    paletteGroupKey: "misc",
    paletteGroup: "Sonstiges",
    defaultSize: { w: 4, h: 3 },
    minW: 3,
    minH: 2,
    addable: true,
  },
};

export const WIDGET_PALETTE_GROUP_ORDER = [
  "tables",
  "lists",
  "media",
  "charts",
  "overviews",
  "actions",
  "planning",
  "misc",
] as const;

export type WidgetPaletteGroupKey = (typeof WIDGET_PALETTE_GROUP_ORDER)[number];

/** Maps stable group id → i18n message key */
export const WIDGET_GROUP_I18N_KEY: Record<WidgetPaletteGroupKey, string> = {
  tables: "widgetGroupTables",
  lists: "widgetGroupLists",
  media: "widgetGroupMedia",
  charts: "widgetGroupCharts",
  overviews: "widgetGroupOverviews",
  actions: "widgetGroupActions",
  planning: "widgetGroupPlanning",
  misc: "widgetGroupMisc",
};

export function getWidgetMeta(type: WidgetType): WidgetMeta {
  return metaByType[type] ?? { type, title: type, defaultSize: { w: 4, h: 2 } };
}

export function getAddableWidgetTypes(): WidgetType[] {
  return ADDABLE_TYPES;
}

export function getAddableWidgetsMeta(): WidgetMeta[] {
  return ADDABLE_TYPES.map((t) => metaByType[t]).filter((m) => m.addable);
}

/** Grouped for the add-widget palette (stable group keys for i18n) */
export function getAddableWidgetsByGroup(): { groupKey: WidgetPaletteGroupKey; items: WidgetMeta[] }[] {
  const meta = getAddableWidgetsMeta();
  const map = new Map<WidgetPaletteGroupKey, WidgetMeta[]>();
  for (const m of meta) {
    const raw = m.paletteGroupKey ?? "misc";
    const g = (WIDGET_PALETTE_GROUP_ORDER.includes(raw as WidgetPaletteGroupKey)
      ? raw
      : "misc") as WidgetPaletteGroupKey;
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(m);
  }
  return WIDGET_PALETTE_GROUP_ORDER.filter((g) => map.has(g)).map((groupKey) => ({
    groupKey,
    items: map.get(groupKey)!,
  }));
}
