import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgArray, cfgString } from "./widgetConfigHelpers";
import { DEFAULT_FINANCE_BARS } from "./defaultWidgetData";
import { SimpleBarChart } from "./SimpleCharts";

const DEFAULT_SUMMARY = [
  { label: "Einnahmen", value: "EUR 120K", color: "emerald" as const },
  { label: "Ausgaben", value: "EUR 85K", color: "red" as const },
  { label: "Gewinn", value: "EUR 35K", color: "blue" as const },
];

const DOT: Record<string, string> = {
  emerald: "bg-emerald-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
};

export function FinancesWidget({ config }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("financesTitle", "Finanzen diesen Monat"));
  const financeBars = cfgArray<{ name?: string; value?: number; fill?: string }>(
    config,
    "financeBars",
    DEFAULT_FINANCE_BARS
  ).map((row, i) => ({
    label: t(`finance${String(row.name ?? i)}`, String(row.name ?? i)),
    value: typeof row.value === "number" ? row.value : 0,
    color: row.fill ?? "#64748b",
  }));
  const summary = cfgArray<{ label?: string; value?: string; color?: string }>(
    config,
    "financeSummary",
    DEFAULT_SUMMARY
  ).map((row, i) => ({
    label: row.label ?? DEFAULT_SUMMARY[i]?.label ?? "-",
    value: row.value ?? "-",
    color: row.color ?? "blue",
  }));

  return (
    <div className="glass-card flex h-full flex-col p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      <div className="min-h-[180px] flex-1">
        <SimpleBarChart points={financeBars} color="#2563eb" ariaLabel={title} />
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-6 text-sm">
        {summary.map((s) => (
          <span key={s.label} className="text-slate-600">
            <span className={`mr-2 inline-block h-2 w-2 rounded-full ${DOT[s.color] ?? "bg-slate-400"}`} />
            {s.label} {s.value}
          </span>
        ))}
      </div>
    </div>
  );
}
