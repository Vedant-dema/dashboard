import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgArray, cfgString } from "./widgetConfigHelpers";
import { DEFAULT_SALES_CHART } from "./defaultWidgetData";

const DEFAULT_FOOTER = [
  { label: "Gesamtumsatz", value: "€ 320K" },
  { label: "Abgeschlossene Deals", value: "30" },
  { label: "Gewinn", value: "€ 58K" },
];

export function SalesWidget({ config }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("salesTitle", "Verkaufsleistung"));
  const period = cfgString(config, "salesPeriod", t("salesPeriod", "6 Monate"));
  const salesData = cfgArray<{ m?: string; umsatz?: number }>(config, "salesChart", DEFAULT_SALES_CHART).map((row, i) => ({
    m: row.m ?? String(i),
    umsatz: typeof row.umsatz === "number" ? row.umsatz : 0,
  }));
  const footer = cfgArray<{ label?: string; value?: string }>(config, "salesFooter", DEFAULT_FOOTER).map((x, i) => ({
    label: x.label ?? DEFAULT_FOOTER[i]?.label ?? "—",
    value: x.value ?? "—",
  }));

  return (
    <div className="glass-card flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{period}</span>
      </div>
      <div className="min-h-[160px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
              formatter={(v: number) => [`${v}K €`, t("salesRevenue", "Umsatz")]}
            />
            <Line
              type="monotone"
              dataKey="umsatz"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4">
        {footer.slice(0, 6).map((f) => (
          <div key={f.label}>
            <p className="text-xs text-slate-500">{f.label}</p>
            <p className="text-lg font-bold text-slate-800">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
