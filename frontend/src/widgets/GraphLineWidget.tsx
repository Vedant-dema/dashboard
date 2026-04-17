import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_GRAPH_LINE } from "./defaultWidgetData";
import { useDashboardChartData } from "./useDashboardChartData";
import { SimpleLineChart } from "./SimpleCharts";

export function GraphLineWidget({ config }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Diagramm - Linie");
  const { lineBar } = useDashboardChartData(config, DEFAULT_GRAPH_LINE);
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
        <SimpleLineChart points={points} color="#2563eb" ariaLabel={title} />
      </div>
    </div>
  );
}
