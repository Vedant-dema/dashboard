import { loadKundenDb } from "../store/kundenStore";
import type { KundenStamm } from "../types/kunden";

export const CHART_SOURCE_KUNDEN = "kunden_stamm" as const;

/** Columns available on flattened Kunden rows (match DB / Stammdaten fields). */
export const KUNDEN_CATEGORY_COLUMNS: { id: string; labelDe: string }[] = [
  { id: "branche", labelDe: "Branche" },
  { id: "ort", labelDe: "Ort" },
  { id: "plz", labelDe: "PLZ" },
  { id: "land_code", labelDe: "Land (Code)" },
  { id: "zustaendige_person_name", labelDe: "Zuständige Person" },
  { id: "art_kunde", labelDe: "Art Kunde" },
  { id: "aufnahme", labelDe: "Aufnahmedatum" },
  { id: "firmenname", labelDe: "Firmenname" },
  { id: "kunden_nr", labelDe: "Kunden-Nr." },
];

export const KUNDEN_VALUE_COLUMNS: { id: string; labelDe: string }[] = [
  { id: "__count__", labelDe: "Anzahl Datensätze (pro X)" },
  { id: "id", labelDe: "Summe interne ID (Demo)" },
];

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#a855f7", "#ef4444", "#14b8a6", "#64748b"];

function flattenKunde(k: KundenStamm): Record<string, unknown> {
  return {
    id: k.id,
    kunden_nr: k.kunden_nr,
    firmenname: k.firmenname,
    branche: k.branche ?? "",
    ort: k.ort ?? "",
    plz: k.plz ?? "",
    land_code: k.land_code ?? "",
    zustaendige_person_name: k.zustaendige_person_name ?? "",
    art_kunde: k.art_kunde ?? "",
    aufnahme: k.aufnahme ?? "",
  };
}

export function getKundenChartRows(): Record<string, unknown>[] {
  const db = loadKundenDb();
  return db.kunden.map(flattenKunde);
}

function categoryKey(row: Record<string, unknown>, xKey: string): string {
  const v = row[xKey];
  if (v == null || v === "") return "—";
  return String(v);
}

/** Group by X; Y = count or sum(id). */
export function buildXYChartPoints(
  rows: Record<string, unknown>[],
  xKey: string,
  yKey: string
): { name: string; v: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const x = categoryKey(row, xKey);
    let add = 0;
    if (yKey === "__count__") add = 1;
    else if (yKey === "id") add = typeof row.id === "number" ? row.id : Number(row.id) || 0;
    map.set(x, (map.get(x) ?? 0) + add);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, v }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function xyPointsToAreaPoints(points: { name: string; v: number }[]): { i: number; v: number }[] {
  return points.map((p, idx) => ({ i: idx, v: p.v }));
}

export function buildPieChartData(points: { name: string; v: number }[]): { name: string; value: number; color: string }[] {
  return points.map((p, i) => ({
    name: p.name,
    value: p.v,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
}

export function resolveChartConfig(config: Record<string, unknown>): {
  source: string;
  xColumn: string;
  yColumn: string;
} {
  const source = typeof config.chartSource === "string" ? config.chartSource : CHART_SOURCE_KUNDEN;
  const xColumn = typeof config.xColumn === "string" && config.xColumn ? config.xColumn : "branche";
  const yColumn = typeof config.yColumn === "string" && config.yColumn ? config.yColumn : "__count__";
  return { source, xColumn, yColumn };
}
