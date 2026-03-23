import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { WidgetRenderProps } from "../types/dashboard";
import type { KpiItemConfig } from "./defaultWidgetData";
import { DEFAULT_KPI_ITEMS } from "./defaultWidgetData";
import { cfgArray } from "./widgetConfigHelpers";

function MiniSpark({ data, color, gradId }: { data: number[]; color: string; gradId: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  const gid = `spark-${gradId}`;
  return (
    <div className="h-12 w-full opacity-90">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gid})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function normalizeKpiItem(x: unknown, i: number): KpiItemConfig {
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label : `KPI ${i + 1}`;
    const value = typeof o.value === "string" ? o.value : "—";
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
          <MiniSpark data={k.spark} color="#ffffff" gradId={`${k.gradId}-${i}`} />
        </div>
      ))}
    </div>
  );
}
