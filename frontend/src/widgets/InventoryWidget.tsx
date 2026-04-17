import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgArray, cfgString } from "./widgetConfigHelpers";
import { DEFAULT_INVENTORY_PIE } from "./defaultWidgetData";
import { SimpleDonutChart } from "./SimpleCharts";

export function InventoryWidget({ config }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("inventoryTitle", "Bestandsuebersicht"));
  const inventoryPie = cfgArray<{ name?: string; value?: number; color?: string }>(
    config,
    "inventoryPie",
    DEFAULT_INVENTORY_PIE
  ).map((row, i) => ({
    label: row.name ?? `Item ${i}`,
    name: row.name ?? `Item ${i}`,
    value: typeof row.value === "number" ? row.value : 0,
    color: row.color ?? "#94a3b8",
  }));
  const total = inventoryPie.reduce((s, r) => s + r.value, 0) || 1;

  return (
    <div className="glass-card flex h-full flex-col p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="h-[140px] w-[140px] shrink-0">
          <SimpleDonutChart segments={inventoryPie} ariaLabel={title} />
        </div>
        <div className="w-full flex-1 space-y-3">
          {inventoryPie.map((row) => (
            <div key={row.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-700">{t(`inventory${row.name}`, row.name)}</span>
                <span className="font-bold text-slate-800">{row.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(row.value / total) * 100}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
