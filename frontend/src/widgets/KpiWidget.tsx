import { Area, AreaChart, ResponsiveContainer } from "recharts";

const sparkA = [3, 5, 4, 8, 6, 9, 12];
const sparkB = [2, 3, 4, 3, 5, 5, 5];
const sparkC = [80, 95, 88, 102, 110, 115, 120];
const sparkD = [48, 50, 49, 51, 52, 52, 52];

function MiniSpark({ data, color, gradId }: { data: number[]; color: string; gradId: string }) {
  const pts = data.map((v, i) => ({ i, v }));
  const gid = `spark-${gradId}`;
  return (
    <div className="h-12 w-full opacity-90">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={pts} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2} fill={`url(#${gid})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const kpis = [
  { label: "Aktive Anfragen", value: "12", grad: "from-blue-500 to-blue-600", sub: "text-blue-100", spark: sparkA, gradId: "k1" },
  { label: "Aktive Deals", value: "5", grad: "from-amber-500 to-orange-500", sub: "text-amber-100", spark: sparkB, gradId: "k2" },
  { label: "Umsatz diesen Monat", value: "€ 120K", grad: "from-violet-500 to-purple-600", sub: "text-violet-100", spark: sparkC, gradId: "k3" },
  { label: "Fahrzeuge auf Lager", value: "52", grad: "from-emerald-500 to-teal-600", sub: "text-emerald-100", spark: sparkD, gradId: "k4" },
];

export function KpiWidget() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((k) => (
        <div
          key={k.gradId}
          className={`kpi-glow relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.grad} p-5 text-white shadow-xl`}
        >
          <p className={`text-sm font-medium ${k.sub}`}>{k.label}</p>
          <p className="mt-1 text-3xl font-bold">{k.value}</p>
          <MiniSpark data={k.spark} color="#ffffff" gradId={k.gradId} />
        </div>
      ))}
    </div>
  );
}
