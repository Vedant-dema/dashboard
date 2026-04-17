import { useId } from "react";
import type { WidgetRenderProps } from "../types/dashboard";
import type { KpiItemConfig } from "./defaultWidgetData";
import { DEFAULT_KPI_ITEMS } from "./defaultWidgetData";
import { cfgArray } from "./widgetConfigHelpers";

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const gradientId = `spark-${useId().replace(/:/g, "")}`;
  const values = data.length > 0 ? data.map((n) => Number(n) || 0) : [0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max === min ? 1 : max - min;
  const width = 180;
  const height = 48;
  const coords = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : (i / (values.length - 1)) * width;
    const y = 4 + (1 - (v - min) / span) * (height - 10);
    return { x, y };
  });
  const path = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const fillPath =
    coords.length > 0
      ? `${path} L ${coords[coords.length - 1]!.x.toFixed(2)} ${height} L ${coords[0]!.x.toFixed(2)} ${height} Z`
      : "";

  return (
    <div className="h-12 w-full opacity-90">
      <svg className="h-full w-full" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

function normalizeKpiItem(x: unknown, i: number): KpiItemConfig {
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : `KPI ${i + 1}`;
    const value = typeof o.value === "string" ? o.value : "-";
    const grad = typeof o.grad === "string" ? o.grad : "from-slate-500 to-slate-600";
    const sub = typeof o.sub === "string" ? o.sub : "text-slate-100";
    const gradId = typeof o.gradId === "string" ? o.gradId : `k-${i}`;
    const spark = Array.isArray(o.spark) ? (o.spark as unknown[]).map((n) => Number(n) || 0) : [1, 2, 3, 4, 5];
    return { label, value, grad, sub, gradId, spark };
  }
  return DEFAULT_KPI_ITEMS[i % DEFAULT_KPI_ITEMS.length];
}

export function KpiWidget({ config }: WidgetRenderProps) {
  const raw = cfgArray<unknown>(config, "kpiItems", []);
  const kpis =
    raw.length > 0 ? raw.map((x, i) => normalizeKpiItem(x, i)) : DEFAULT_KPI_ITEMS;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k, i) => (
        <div
          key={`${k.gradId}-${i}`}
          className={`kpi-glow relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.grad} p-5 text-white shadow-xl`}
        >
          <p className={`text-sm font-medium ${k.sub}`}>{k.label}</p>
          <p className="mt-1 text-3xl font-bold">{k.value}</p>
          <MiniSpark data={k.spark} color="#ffffff" />
        </div>
      ))}
    </div>
  );
}
