import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgArray, cfgString } from "./widgetConfigHelpers";
import { DEFAULT_SALES_CHART } from "./defaultWidgetData";
import { SimpleLineChart } from "./SimpleCharts";

const DEFAULT_FOOTER = [
  { label: "Gesamtumsatz", value: "EUR 320K" },
  { label: "Abgeschlossene Deals", value: "30" },
  { label: "Gewinn", value: "EUR 58K" },
];

export function SalesWidget({ config }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("salesTitle", "Verkaufsleistung"));
  const period = cfgString(config, "salesPeriod", t("salesPeriod", "6 Monate"));
  const salesData = cfgArray<{ m?: string; umsatz?: number }>(
    config,
    "salesChart",
    DEFAULT_SALES_CHART
  ).map((row, i) => ({
    label: row.m ?? String(i),
    value: typeof row.umsatz === "number" ? row.umsatz : 0,
  }));
  const footer = cfgArray<{ label?: string; value?: string }>(config, "salesFooter", DEFAULT_FOOTER).map((x, i) => ({
    label: x.label ?? DEFAULT_FOOTER[i]?.label ?? "-",
    value: x.value ?? "-",
  }));

  return (
    <div className="glass-card flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{period}</span>
      </div>
      <div className="min-h-[160px] flex-1">
        <SimpleLineChart points={salesData} color="#2563eb" ariaLabel={t("salesRevenue", "Umsatz")} />
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
