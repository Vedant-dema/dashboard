export type WidgetType =
  | "welcome"
  | "kpi"
  | "sales"
  | "inventory"
  | "quick-actions"
  | "tasks"
  | "finances"
  | "user-card"
  | "profile"
  | "calendar"
  | "appointments"
  | "meetings"
  | "notes"
  | "table"
  | "todo-list"
  | "picture"
  | "graph-line"
  | "graph-bar"
  | "graph-pie"
  | "graph-area";

export interface GridPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  grid: GridPosition;
  config?: Record<string, unknown>;
  locked?: boolean;
}

export interface DashboardLayout {
  widgets: WidgetInstance[];
  version?: number;
}

export interface WidgetMeta {
  type: WidgetType;
  title: string;
  /** i18n key for palette / chrome (fallback: title) */
  titleKey?: string;
  description?: string;
  /** Palette section label (e.g. Tabellen, Diagramme) */
  paletteGroup?: string;
  /** Stable palette section id for i18n (e.g. tables, charts) */
  paletteGroupKey?: string;
  defaultSize: { w: number; h: number };
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  locked?: boolean;
  addable?: boolean; // show in "Add widget" palette
}
