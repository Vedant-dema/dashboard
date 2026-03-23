import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWidgetLanguage } from "./useWidgetLanguage";

const financeBars = [
  { name: "Einnahmen", value: 120, fill: "#22c55e" },
  { name: "Ausgaben", value: 85, fill: "#ef4444" },
  { name: "Gewinn", value: 35, fill: "#3b82f6" },
];

export function FinancesWidget() {
  const { t } = useWidgetLanguage();
  return (
    <div className="glass-card flex h-full flex-col p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{t("financesTitle", "Finanzen diesen Monat")}</h2>
      <div className="min-h-[180px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={financeBars} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
            <XAxis dataKey="name" axisLine={false} tickLine={false} tickFormatter={(v) => t(`finance${String(v)}`, String(v))} tick={{ fill: "#64748b", fontSize: 13 }} />
            <YAxis hide />
            <Tooltip formatter={(v: number) => [`${v}K €`, ""]} contentStyle={{ borderRadius: "12px", border: "none" }} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={72}>
              {financeBars.map((e) => (
                <Cell key={e.name} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-6 text-sm">
        <span className="text-slate-600">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
          {t("financeIncome", "Einnahmen")} €120K
        </span>
        <span className="text-slate-600">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />
          {t("financeExpenses", "Ausgaben")} €85K
        </span>
        <span className="text-slate-600">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
          {t("financeProfit", "Gewinn")} €35K
        </span>
      </div>
    </div>
  );
}
