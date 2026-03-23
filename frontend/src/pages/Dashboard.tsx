import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  UserPlus,
  Truck,
  FileText,
  Receipt,
  ChevronRight,
  MapPin,
} from "lucide-react";

const salesData = [
  { m: "Jan", umsatz: 42 },
  { m: "Feb", umsatz: 48 },
  { m: "Mär", umsatz: 55 },
  { m: "Apr", umsatz: 52 },
  { m: "Mai", umsatz: 61 },
  { m: "Jun", umsatz: 68 },
];

const financeBars = [
  { name: "Einnahmen", value: 120, fill: "#22c55e" },
  { name: "Ausgaben", value: 85, fill: "#ef4444" },
  { name: "Gewinn", value: 35, fill: "#3b82f6" },
];

const inventoryPie = [
  { name: "Verfügbar", value: 52, color: "#22c55e" },
  { name: "Reserviert", value: 15, color: "#f59e0b" },
  { name: "Verkauft", value: 20, color: "#94a3b8" },
];

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
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gid})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const tasks = [
  { title: "Angebot für Kunde Schmidt", tag: "Hoch", tagClass: "bg-red-100 text-red-700" },
  { title: "Fahrzeug-Übergabe morgen 10:00", tag: "Mittel", tagClass: "bg-amber-100 text-amber-800" },
  { title: "Rechnung #2847 prüfen", tag: "Neu", tagClass: "bg-blue-100 text-blue-700" },
  { title: "Waschtermin bestätigen", tag: "Mittel", tagClass: "bg-amber-100 text-amber-800" },
];

const appointments = [
  { time: "09:00", title: "Kundenberatung — Weber GmbH" },
  { time: "11:30", title: "Fahrzeugabholung — BMW X3" },
  { time: "15:00", title: "Team-Meeting Verkauf" },
];

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const calStart = 1; // April 2025 starts Tuesday in mock - actually Apr 2025 is Tue. Let me use simple grid
// April 2025 starts Tuesday (Mo–So grid → two leading blanks).
const april2025 = [
  null as number | null,
  null,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24,
  25,
  26,
  27,
  28,
  29,
  30,
];

export function Dashboard() {
  return (
    <div className="p-6 pb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          Willkommen im DEMA Management System
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Hier ist Ihre Übersicht — Sales, Purchase und Waschanlage auf einen Blick.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="kpi-glow relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white shadow-xl">
              <p className="text-sm font-medium text-blue-100">Aktive Anfragen</p>
              <p className="mt-1 text-3xl font-bold">12</p>
              <MiniSpark data={sparkA} color="#ffffff" gradId="k1" />
            </div>
            <div className="kpi-glow relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-5 text-white shadow-xl">
              <p className="text-sm font-medium text-amber-100">Aktive Deals</p>
              <p className="mt-1 text-3xl font-bold">5</p>
              <MiniSpark data={sparkB} color="#ffffff" gradId="k2" />
            </div>
            <div className="kpi-glow relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-5 text-white shadow-xl">
              <p className="text-sm font-medium text-violet-100">Umsatz diesen Monat</p>
              <p className="mt-1 text-3xl font-bold">€ 120K</p>
              <MiniSpark data={sparkC} color="#ffffff" gradId="k3" />
            </div>
            <div className="kpi-glow relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-xl">
              <p className="text-sm font-medium text-emerald-100">Fahrzeuge auf Lager</p>
              <p className="mt-1 text-3xl font-bold">52</p>
              <MiniSpark data={sparkD} color="#ffffff" gradId="k4" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Sales performance */}
            <div className="glass-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Verkaufsleistung</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                  6 Monate
                </span>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="m" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                    <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      }}
                      formatter={(v: number) => [`${v}K €`, "Umsatz"]}
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
                  <p className="text-xs text-slate-500">Gesamtumsatz</p>
                  <p className="text-lg font-bold text-slate-800">€ 320K</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Abgeschlossene Deals</p>
                  <p className="text-lg font-bold text-slate-800">30</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Gewinn</p>
                  <p className="text-lg font-bold text-emerald-600">€ 58K</p>
                </div>
              </div>
            </div>

            {/* Inventory */}
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Bestandsübersicht</h2>
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <div className="h-[180px] w-[180px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={inventoryPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={72}
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
                <div className="w-full flex-1 space-y-4">
                  {inventoryPie.map((row) => (
                    <div key={row.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{row.name}</span>
                        <span className="font-bold text-slate-800">{row.value}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(row.value / 87) * 100}%`,
                            backgroundColor: row.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Quick actions */}
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Schnelle Aktionen</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Kunde anlegen", icon: UserPlus, color: "bg-blue-500" },
                  { label: "Fahrzeug erfassen", icon: Truck, color: "bg-emerald-500" },
                  { label: "Angebot erstellen", icon: FileText, color: "bg-violet-500" },
                  { label: "Rechnung erstellen", icon: Receipt, color: "bg-amber-500" },
                ].map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left transition hover:border-blue-200 hover:bg-white hover:shadow-md"
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${a.color}`}>
                      <a.icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">Aufgaben & Erinnerungen</h2>
              <ul className="space-y-3">
                {tasks.map((t) => (
                  <li
                    key={t.title}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-slate-700">{t.title}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.tagClass}`}>
                      {t.tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Finances */}
          <div className="glass-card p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Finanzen diesen Monat</h2>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financeBars} margin={{ top: 20, right: 20, left: 0, bottom: 8 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 13 }} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v: number) => [`${v}K €`, ""]}
                    contentStyle={{ borderRadius: "12px", border: "none" }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={72}>
                    {financeBars.map((e) => (
                      <Cell key={e.name} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex justify-center gap-8 text-sm">
              <span className="text-slate-600">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Einnahmen €120K
              </span>
              <span className="text-slate-600">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-500" />
                Ausgaben €85K
              </span>
              <span className="text-slate-600">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                Gewinn €35K
              </span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="glass-card overflow-hidden p-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 ring-4 ring-blue-50" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-slate-800">Tom Müller</p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-emerald-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Online
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Hamburg Büro
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-700">8:45</p>
                <p className="text-xs text-slate-400">Uhr</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Kalender</h2>
              <span className="text-sm font-medium text-slate-500">April 2025</span>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-400">
              {weekDays.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {april2025.map((d, i) =>
                d == null ? (
                  <div key={`e-${i}`} className="aspect-square" />
                ) : (
                  <button
                    key={d}
                    type="button"
                    className={`flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition ${
                      d === 18
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {d}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-4 text-lg font-bold text-slate-800">Heutige Termine</h2>
            <ul className="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-200">
              {appointments.map((ap) => (
                <li key={ap.time} className="relative flex gap-4 pl-6">
                  <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow ring-2 ring-blue-100" />
                  <div>
                    <p className="text-xs font-semibold text-blue-600">{ap.time}</p>
                    <p className="text-sm font-medium text-slate-700">{ap.title}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-3 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50/50"
            >
              <ChevronRight className="h-4 w-4 rotate-[-90deg]" />
              Neuer Termin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
