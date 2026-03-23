import { useEffect, useMemo, useState } from "react";
import {
  buildPieChartData,
  buildXYChartPoints,
  CHART_SOURCE_KUNDEN,
  getKundenChartRows,
  resolveChartConfig,
  xyPointsToAreaPoints,
} from "./chartDataFromDb";

export type LineBarPoint = { name: string; v: number };
export type PiePoint = { name: string; value: number; color: string };

function normalizeManualLineBar(raw: unknown[]): LineBarPoint[] {
  return raw.map((item, i) => {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : String(o.m ?? i);
      const v = typeof o.v === "number" ? o.v : Number(o.v ?? o.umsatz ?? 0) || 0;
      return { name, v };
    }
    return { name: String(i), v: 0 };
  });
}

function normalizeManualPieOnly(raw: unknown[]): PiePoint[] {
  return raw.map((item, i) => {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      const name = typeof o.name === "string" ? o.name : String(i);
      const value = typeof o.value === "number" ? o.value : Number(o.value ?? o.v ?? 0) || 0;
      const color = typeof o.color === "string" ? o.color : "#64748b";
      return { name, value, color };
    }
    return { name: String(i), value: 0, color: "#64748b" };
  });
}

/**
 * Manual `chartData` in config overrides DB aggregation.
 * Otherwise aggregates local Kunden-Stamm by `xColumn` / `yColumn`.
 */
export function useDashboardChartData(
  config: Record<string, unknown>,
  defaultManual: unknown[]
): { lineBar: LineBarPoint[]; pie: PiePoint[]; areaPoints: { i: number; v: number }[] } {
  const [dbTick, setDbTick] = useState(0);

  useEffect(() => {
    const onDb = () => setDbTick((n) => n + 1);
    window.addEventListener("dema-kunden-db-changed", onDb);
    return () => window.removeEventListener("dema-kunden-db-changed", onDb);
  }, []);

  return useMemo(() => {
    const manual = config.chartData;
    if (Array.isArray(manual) && manual.length > 0) {
      const first = manual[0];
      const isPieShape =
        first != null &&
        typeof first === "object" &&
        "value" in first &&
        typeof (first as { value?: unknown }).value === "number";
      if (isPieShape) {
        const pie = normalizeManualPieOnly(manual);
        const lineBar = pie.map((p) => ({ name: p.name, v: p.value }));
        return { lineBar, pie, areaPoints: xyPointsToAreaPoints(lineBar) };
      }
      const lineBar = normalizeManualLineBar(manual);
      return { lineBar, pie: buildPieChartData(lineBar), areaPoints: xyPointsToAreaPoints(lineBar) };
    }

    const { source, xColumn, yColumn } = resolveChartConfig(config);
    if (source !== CHART_SOURCE_KUNDEN) {
      const lineBar = normalizeManualLineBar(defaultManual);
      return { lineBar, pie: buildPieChartData(lineBar), areaPoints: xyPointsToAreaPoints(lineBar) };
    }

    const rows = getKundenChartRows();
    const lineBar = buildXYChartPoints(rows, xColumn, yColumn);
    return { lineBar, pie: buildPieChartData(lineBar), areaPoints: xyPointsToAreaPoints(lineBar) };
  }, [config, defaultManual, dbTick]);
}
