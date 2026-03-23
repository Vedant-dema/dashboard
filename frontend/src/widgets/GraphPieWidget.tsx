import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_GRAPH_PIE } from "./defaultWidgetData";
import { useDashboardChartData } from "./useDashboardChartData";

export function GraphPieWidget({ config }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Diagramm — Kreis");
  const { pie } = useDashboardChartData(config, DEFAULT_GRAPH_PIE);

  return (
    <div className="flex h-full min-h-[140px] flex-col">
      <h2 className="mb-2 text-lg font-bold text-slate-800">{title}</h2>
      <p className="mb-1 text-[11px] text-slate-400">
        {Array.isArray(config.chartData) && config.chartData.length > 0
          ? "Manuelle Daten"
          : "Aus Kunden-Stamm (lokal)"}
      </p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
              {pie.map((e) => (
                <Cell key={e.name} fill={e.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
