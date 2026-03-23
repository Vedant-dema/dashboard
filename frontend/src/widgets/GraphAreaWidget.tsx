import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { i: 0, v: 4 },
  { i: 1, v: 7 },
  { i: 2, v: 5 },
  { i: 3, v: 9 },
  { i: 4, v: 12 },
  { i: 5, v: 10 },
  { i: 6, v: 14 },
];

export function GraphAreaWidget() {
  const gid = useId().replace(/:/g, "");
  const gradId = `areaG-${gid}`;
  return (
    <div className="flex h-full min-h-[140px] flex-col">
      <h2 className="mb-2 text-lg font-bold text-slate-800">Diagramm — Fläche</h2>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
