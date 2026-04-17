import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_GRAPH_BAR } from "./defaultWidgetData";
import { useDashboardChartData } from "./useDashboardChartData";
import { SimpleBarChart } from "./SimpleCharts";

export function GraphBarWidget({ config }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Diagramm - Balken");
  const { lineBar } = useDashboardChartData(config, DEFAULT_GRAPH_BAR);
  const points = lineBar.map((p) => ({
    label: p.name,
    value: p.v,
  }));

  return (
    <div className="flex h-full min-h-[140px] flex-col">
      <h2 className="mb-2 text-lg font-bold text-slate-800">{title}</h2>
      <p className="mb-1 text-[11px] text-slate-400">
        {Array.isArray(config.chartData) && config.chartData.length > 0
          ? "Manuelle Daten"
          : "Aus Kunden-Stamm (lokal)"}
      </p>
      <div className="min-h-0 flex-1">
        <SimpleBarChart points={points} color="#0d9488" ariaLabel={title} />
      </div>
    </div>
  );
}
