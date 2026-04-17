/** Shared defaults for dashboard widgets (used by widgets + settings modal). */

export const DEFAULT_WELCOME_TITLE = "Willkommen im DEMA Management System";
export const DEFAULT_WELCOME_SUBTITLE = "";

export interface KpiItemConfig {
  label: string;
  value: string;
  grad: string;
  sub: string;
  gradId: string;
  spark: number[];
}

export const DEFAULT_KPI_ITEMS: KpiItemConfig[] = [
  {
    label: "Aktive Anfragen",
    value: "12",
    grad: "from-blue-500 to-blue-600",
    sub: "text-blue-100",
    spark: [3, 5, 4, 8, 6, 9, 12],
    gradId: "k1",
  },
  {
    label: "Aktive Deals",
    value: "5",
    grad: "from-amber-500 to-orange-500",
    sub: "text-amber-100",
    spark: [2, 3, 4, 3, 5, 5, 5],
    gradId: "k2",
  },
  {
    label: "Umsatz diesen Monat",
    value: "€ 120K",
    grad: "from-violet-500 to-purple-600",
    sub: "text-violet-100",
    spark: [80, 95, 88, 102, 110, 115, 120],
    gradId: "k3",
  },
  {
    label: "Fahrzeuge auf Lager",
    value: "52",
    grad: "from-emerald-500 to-teal-600",
    sub: "text-emerald-100",
    spark: [48, 50, 49, 51, 52, 52, 52],
    gradId: "k4",
  },
];

export const DEFAULT_SALES_CHART = [
  { m: "Jan", umsatz: 42 },
  { m: "Feb", umsatz: 48 },
  { m: "Mär", umsatz: 55 },
  { m: "Apr", umsatz: 52 },
  { m: "Mai", umsatz: 61 },
  { m: "Jun", umsatz: 68 },
];

export const DEFAULT_INVENTORY_PIE = [
  { name: "Verfügbar", value: 52, color: "#22c55e" },
  { name: "Reserviert", value: 15, color: "#f59e0b" },
  { name: "Verkauft", value: 20, color: "#94a3b8" },
];

export const DEFAULT_FINANCE_BARS = [
  { name: "Einnahmen", value: 120, fill: "#22c55e" },
  { name: "Ausgaben", value: 85, fill: "#ef4444" },
  { name: "Gewinn", value: 35, fill: "#3b82f6" },
];

export const DEFAULT_GRAPH_LINE = [
  { name: "Mo", v: 12 },
  { name: "Di", v: 19 },
  { name: "Mi", v: 15 },
  { name: "Do", v: 22 },
  { name: "Fr", v: 28 },
];

export const DEFAULT_GRAPH_BAR = [
  { name: "Q1", v: 45 },
  { name: "Q2", v: 62 },
  { name: "Q3", v: 58 },
  { name: "Q4", v: 71 },
];

export const DEFAULT_GRAPH_PIE = [
  { name: "Neu", value: 35, color: "#3b82f6" },
  { name: "Laufend", value: 40, color: "#f59e0b" },
  { name: "Fertig", value: 25, color: "#22c55e" },
];

export const DEFAULT_GRAPH_AREA = [
  { i: 0, v: 4 },
  { i: 1, v: 7 },
  { i: 2, v: 5 },
  { i: 3, v: 9 },
  { i: 4, v: 12 },
  { i: 5, v: 10 },
  { i: 6, v: 14 },
];

export const DEFAULT_TABLE_ROWS = [
  { id: "1", kunde: "Weber GmbH", status: "Angebot", betrag: "€ 42.500" },
  { id: "2", kunde: "Schmidt AG", status: "Deal", betrag: "€ 28.900" },
  { id: "3", kunde: "Meyer KG", status: "Anfrage", betrag: "—" },
  { id: "4", kunde: "Kuhn Transport", status: "Lieferung", betrag: "€ 12.100" },
];

export const DEFAULT_TODO_ITEMS = [
  { id: "a", text: "Angebot nachfassen — Weber", done: false },
  { id: "b", text: "Fahrzeug Fotos hochladen", done: true },
  { id: "c", text: "Rechnung prüfen #2847", done: false },
];
