import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_GRAPH_AREA } from "./defaultWidgetData";
import { useDashboardChartData } from "./useDashboardChartData";
import { SimpleLineChart } from "./SimpleCharts";

export function GraphAreaWidget({ config }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Diagramm - Flaeche");
  const { areaPoints } = useDashboardChartData(config, DEFAULT_GRAPH_AREA);
  const points = areaPoints.map((p) => ({
    label: String(p.i),
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
        <SimpleLineChart points={points} color="#7c3aed" area ariaLabel={title} />
      </div>
    </div>
  );
}
