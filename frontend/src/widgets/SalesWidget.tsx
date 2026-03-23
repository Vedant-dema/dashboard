import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWidgetLanguage } from "./useWidgetLanguage";

const salesData = [
  { m: "Jan", umsatz: 42 },
  { m: "Feb", umsatz: 48 },
  { m: "Mär", umsatz: 55 },
  { m: "Apr", umsatz: 52 },
  { m: "Mai", umsatz: 61 },
  { m: "Jun", umsatz: 68 },
];

export function SalesWidget() {
  const { t } = useWidgetLanguage();
  return (
    <div className="glass-card flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{t("salesTitle", "Verkaufsleistung")}</h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">{t("salesPeriod", "6 Monate")}</span>
      </div>
      <div className="min-h-[160px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
            <Tooltip
              contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
              formatter={(v: number) => [`${v}K €`, t("salesRevenue", "Umsatz")]}
            />
            <Line
              type="monotone"
              dataKey="umsatz"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
        <div>
          <p className="text-xs text-slate-500">{t("salesTotalRevenue", "Gesamtumsatz")}</p>
          <p className="text-lg font-bold text-slate-800">€ 320K</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t("salesClosedDeals", "Abgeschlossene Deals")}</p>
          <p className="text-lg font-bold text-slate-800">30</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{t("salesProfit", "Gewinn")}</p>
          <p className="text-lg font-bold text-emerald-600">€ 58K</p>
        </div>
      </div>
    </div>
  );
}
