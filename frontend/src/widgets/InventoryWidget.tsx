import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useWidgetLanguage } from "./useWidgetLanguage";

const inventoryPie = [
  { name: "Verfügbar", value: 52, color: "#22c55e" },
  { name: "Reserviert", value: 15, color: "#f59e0b" },
  { name: "Verkauft", value: 20, color: "#94a3b8" },
];

export function InventoryWidget() {
  const { t } = useWidgetLanguage();
  return (
    <div className="glass-card flex h-full flex-col p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{t("inventoryTitle", "Bestandsübersicht")}</h2>
      <div className="flex flex-1 flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="h-[140px] w-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={inventoryPie}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={58}
                paddingAngle={3}
                dataKey="value"
              >
                {inventoryPie.map((e) => (
                  <Cell key={e.name} fill={e.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="w-full flex-1 space-y-3">
          {inventoryPie.map((row) => (
            <div key={row.name}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-700">{t(`inventory${row.name}`, row.name)}</span>
                <span className="font-bold text-slate-800">{row.value}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(row.value / 87) * 100}%`, backgroundColor: row.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
