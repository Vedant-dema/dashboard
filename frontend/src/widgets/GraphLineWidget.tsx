import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_GRAPH_LINE } from "./defaultWidgetData";
import { useDashboardChartData } from "./useDashboardChartData";

export function GraphLineWidget({ config }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Diagramm — Linie");
  const { lineBar } = useDashboardChartData(config, DEFAULT_GRAPH_LINE);

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
          <LineChart data={lineBar} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: "10px", border: "none" }} />
            <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
