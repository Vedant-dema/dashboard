import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_GRAPH_BAR } from "./defaultWidgetData";
import { useDashboardChartData } from "./useDashboardChartData";

export function GraphBarWidget({ config }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Diagramm — Balken");
  const { lineBar } = useDashboardChartData(config, DEFAULT_GRAPH_BAR);

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
          <BarChart data={lineBar} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: "10px", border: "none" }} />
            <Bar dataKey="v" fill="#0d9488" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
