import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_GRAPH_AREA } from "./defaultWidgetData";
import { useDashboardChartData } from "./useDashboardChartData";

export function GraphAreaWidget({ config }: WidgetRenderProps) {
  const gid = useId().replace(/:/g, "");
  const gradId = `areaG-${gid}`;
  const title = cfgString(config, "customTitle", "Diagramm — Fläche");
  const { areaPoints } = useDashboardChartData(config, DEFAULT_GRAPH_AREA);

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
          <AreaChart data={areaPoints} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ borderRadius: "10px", border: "none" }} />
            <Area type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={2} fill={`url(#${gradId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
