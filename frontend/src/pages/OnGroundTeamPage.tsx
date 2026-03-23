import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  MapPin,
  Navigation,
  RadioTower,
  Truck,
  Users,
  BarChart3,
  Clock3,
  CircleAlert,
  Car,
  Fuel,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { SignatureInput } from "../components/SignatureInput";

type OgtSection = "team" | "fahrer" | "tasks" | "checklists" | "schedule" | "reports";

const tabs: { key: OgtSection; labelKey: string; fallback: string; path: string }[] = [
  { key: "team",       labelKey: "ogtSectionTeam",       fallback: "Team",        path: "#/on-ground-team/team"       },
  { key: "fahrer",     labelKey: "ogtSectionFahrer",     fallback: "Drivers",     path: "#/on-ground-team/fahrer"     },
  { key: "tasks",      labelKey: "ogtSectionTasks",      fallback: "Tasks",       path: "#/on-ground-team/tasks"      },
  { key: "checklists", labelKey: "ogtSectionChecklists", fallback: "Checklists",  path: "#/on-ground-team/checklists" },
  { key: "schedule",   labelKey: "ogtSectionSchedule",   fallback: "Schedule",    path: "#/on-ground-team/schedule"   },
  { key: "reports",    labelKey: "ogtSectionReports",    fallback: "Reports",     path: "#/on-ground-team/reports"    },
];

type ChecklistKind = "truck" | "trailer";
type ChecklistState = {
  marke: string;
  typ: string;
  aufbau: string;
  kunde: string;
  fahrgestellnr: string;
  pnr: string;
  reifen1: string;
  reifen2: string;
  reifen3: string;
  reifen4: string;
  verkauf: string;
  notizen: string;
  name: string;
  datum: string;
  unterschrift: string;
  checks: Record<string, "ok" | "nein" | "">;
  bemerkung: Record<string, string>;
};

const TRUCK_ITEMS = [
  "Unfallfrei",
  "Rahmen ok ?(nicht verzogen)",
  "Fahrgestellnr. auf Rahmen prüfen",
  "Kotflügel hinten/Radabdeckung",
  "Elektro-Kabel vorhanden?",
  "ABS-Kabel vorhanden?",
  "Originallackierung",
  "Öl + Wasser",
  "Motor",
  "Getriebe",
  "Retarder / Bremssystem Funktion",
  "Bremsen in Ordnung?",
  "Lenkung in Ordnung?",
  "Kühlkoffer Temperatur",
  "Kran, Kipper und Stempel ok?",
  "Frontscheibe ok?",
  "Hebebühne (LBW) Funktion",
  "Fehlermeldungen (Warnlämpchen)",
  "Tachograph ok?",
  "Licht + Blinker ok?",
  "Fensterheber ok?",
  "Schiebedach ok?",
  "Scheibenwischer ok?",
  "Klimaanlage ok?",
  "Standheizung ok?",
  "Tankfüllung Diesel",
  "Ersatz- und sonstige Schlüssel",
  "Wagenheber vorhanden?",
  "Kippstange für Fahrerhaus",
  "KFZ-Brief (Baujahr+ Fgst.Nr.)",
  "KFZ-Schein(Baujahr+ Fgst.Nr.)",
  "DEMA GmbH & Co. KG",
  "UST-ID-Nr. / Steuernummer",
  "Rechnungs- und Leistungsdatum",
  "Betrag Bar erhalten + Stempel",
] as const;

const TRAILER_ITEMS = [
  "Unfallfrei",
  "Rahmen ok ?(nicht verzogen)",
  "Fahrgestellnr. auf Rahmen prüfen",
  "Elektrische/Luftanschlüsse prüfen",
  "Elektro-Kabel vorhanden?",
  "ABS-Kabel vorhanden?",
  "Originallackierung",
  "Karosseriezustand",
  "Chassiszustand",
  "Zugöse/Königszapfen",
  "Lichtanlage",
  "Kühlaggregat/Temperatur",
  "Portaltüren und Rolltore Funktion",
  "Stützfüße",
  "Hebebühne (LBW) Funktion",
  "Deichsel prüfen",
  "Innenzustand",
  "Tankfüllung Diesel",
  "Batterie Hebebühne",
  "Batterie Kühlaggregat",
  "Dichtigkeit des Kühlaufbaus",
  "Elektrik / Kühlaggregat",
  "Blattfederung/Luftbalken",
  "Liftachse prüfen",
  "Handbremse prüfen",
  "Hebe Senkvorrichtung",
  "Ersatz- und sonstige Schlüssel",
  "Unterlegkeil vorhanden",
  "KFZ-Brief(Baujahr+ Fgst.Nr.)",
  "KFZ-Schein(Baujahr+ Fgst.Nr.)",
  "DEMA GmbH & Co. KG",
  "UST-ID-Nr. / Steuernummer",
  "Rechnungs- und Leistungsdatum",
  "Betrag Bar erhalten + Stempel",
] as const;

const TRUCK_SECTIONS: { title: string; items: readonly string[] }[] = [
  { title: "1. Optik", items: TRUCK_ITEMS.slice(0, 7) },
  { title: "2. Technik Außen", items: TRUCK_ITEMS.slice(7, 17) },
  { title: "3. Technik Innen", items: TRUCK_ITEMS.slice(17, 26) },
  { title: "4. Fragen nach", items: TRUCK_ITEMS.slice(26, 29) },
  { title: "5. Papiere prüfen", items: TRUCK_ITEMS.slice(29, 31) },
  { title: "6. Rechnung Prüfen", items: TRUCK_ITEMS.slice(31, 35) },
];

const TRAILER_SECTIONS: { title: string; items: readonly string[] }[] = [
  { title: "1. Optik", items: TRAILER_ITEMS.slice(0, 7) },
  { title: "2. Technik Außen", items: TRAILER_ITEMS.slice(7, 26) },
  { title: "4. Fragen nach", items: TRAILER_ITEMS.slice(26, 28) },
  { title: "5. Papiere prüfen", items: TRAILER_ITEMS.slice(28, 30) },
  { title: "6. Rechnung Prüfen", items: TRAILER_ITEMS.slice(30, 34) },
];

function createChecklistState(items: readonly string[]): ChecklistState {
  const checks: Record<string, "ok" | "nein" | ""> = {};
  const bemerkung: Record<string, string> = {};
  for (const label of items) {
    checks[label] = "";
    bemerkung[label] = "";
  }
  return {
    marke: "",
    typ: "",
    aufbau: "",
    kunde: "",
    fahrgestellnr: "",
    pnr: "",
    reifen1: "",
    reifen2: "",
    reifen3: "",
    reifen4: "",
    verkauf: "",
    notizen: "",
    name: "",
    datum: "",
    unterschrift: "",
    checks,
    bemerkung,
  };
}

const MOCK_FAHRER = [
  { id: "F-01", name: "Farouk Al-Amin",  license: "Kl. B+E", vehicle: "VW Transporter",  plate: "HH-FA 1001", status: "active",  km: 148, fuel: 72, valid: "2027-03-15" },
  { id: "F-02", name: "Kemal Yildirim",  license: "Kl. C",   vehicle: "Mercedes Sprinter",plate: "HH-KY 2032", status: "active",  km: 212, fuel: 55, valid: "2026-11-30" },
  { id: "F-03", name: "Sandra Brandt",   license: "Kl. B",   vehicle: "Ford Transit",     plate: "HH-SB 3045", status: "break",   km: 67,  fuel: 88, valid: "2028-07-01" },
  { id: "F-04", name: "Luisa Hoffmann",  license: "Kl. B",   vehicle: "VW Caddy",         plate: "HH-LH 4011", status: "active",  km: 93,  fuel: 40, valid: "2026-05-20" },
  { id: "F-05", name: "Davit Mkrtchyan", license: "Kl. B+E", vehicle: "BMW 3er",          plate: "HH-DM 5007", status: "offline", km: 0,   fuel: 95, valid: "2027-09-12" },
];

const MOCK_AGENTS = [
  { name: "Farouk Al-Amin",    role: "Senior Driver",    status: "active",  location: "Hamburg Nord",    tasks: 3 },
  { name: "Petra Schneider",   role: "Field Agent",       status: "active",  location: "Hamburg Mitte",   tasks: 2 },
  { name: "Kemal Yildirim",    role: "Logistics Lead",    status: "active",  location: "Hamburg Süd",     tasks: 4 },
  { name: "Sandra Brandt",     role: "Driver",            status: "break",   location: "Hamburg Hafen",   tasks: 1 },
  { name: "Davit Mkrtchyan",   role: "Field Agent",       status: "offline", location: "—",               tasks: 0 },
  { name: "Luisa Hoffmann",    role: "Courier",           status: "active",  location: "Hamburg West",    tasks: 2 },
];

const MOCK_TASKS = [
  { id: "T-201", title: "BMW X3 Abholung – Kunde Schmidt",   agent: "Farouk Al-Amin",   priority: "high",   status: "in-progress", eta: "13:30" },
  { id: "T-202", title: "Fahrzeug-Transfer Hamburg → Bremen", agent: "Kemal Yildirim",   priority: "high",   status: "in-progress", eta: "15:00" },
  { id: "T-203", title: "Probefahrt-Begleitung VW Passat",   agent: "Petra Schneider",  priority: "medium", status: "pending",     eta: "14:00" },
  { id: "T-204", title: "Kennzeichen-Abholung Zulassung",    agent: "Sandra Brandt",    priority: "low",    status: "pending",     eta: "16:00" },
  { id: "T-205", title: "Unterlagen-Lieferung Kunde Weber",  agent: "Luisa Hoffmann",   priority: "medium", status: "done",        eta: "11:45" },
  { id: "T-206", title: "Ersatzfahrzeug bereitstellen",      agent: "Farouk Al-Amin",   priority: "high",   status: "pending",     eta: "17:00" },
];

const SCHEDULE_ROWS = [
  { time: "08:00", agent: "Farouk Al-Amin",  task: "Fahrzeug-Bereitstellung Depot",    status: "done"        },
  { time: "09:30", agent: "Kemal Yildirim",  task: "Abholung BMW X3 – Kunde Schmidt",  status: "done"        },
  { time: "11:00", agent: "Petra Schneider", task: "Probefahrt Begleitung VW Passat",  status: "in-progress" },
  { time: "13:00", agent: "Sandra Brandt",   task: "Mittagspause",                     status: "break"       },
  { time: "14:00", agent: "Luisa Hoffmann",  task: "Unterlagen-Lieferung Weber",       status: "done"        },
  { time: "15:00", agent: "Kemal Yildirim",  task: "Transfer Hamburg → Bremen",        status: "in-progress" },
  { time: "16:00", agent: "Sandra Brandt",   task: "Kennzeichen Abholung Zulassung",   status: "pending"     },
  { time: "17:00", agent: "Farouk Al-Amin",  task: "Ersatzfahrzeug bereitstellen",     status: "pending"     },
];

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, string> = {
    active:       "bg-emerald-100 text-emerald-700",
    "in-progress":"bg-blue-100 text-blue-700",
    done:         "bg-slate-100 text-slate-600",
    pending:      "bg-amber-100 text-amber-700",
    break:        "bg-orange-100 text-orange-700",
    offline:      "bg-slate-100 text-slate-400",
  };
  const labels: Record<string, string> = {
    active: t("ogtStatusActive", "Active"),
    "in-progress": t("ogtStatusInProgress", "In progress"),
    done: t("ogtStatusDone", "Done"),
    pending: t("ogtStatusPending", "Pending"),
    break: t("ogtStatusBreak", "Break"),
    offline: t("ogtStatusOffline", "Offline"),
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const c = priority === "high" ? "bg-red-500" : priority === "medium" ? "bg-amber-400" : "bg-slate-300";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}

export function OnGroundTeamPage({ section = "team" }: { section?: OgtSection }) {
  const { t } = useLanguage();
  const is = (k: OgtSection) => section === k;
  const [checklistKind, setChecklistKind] = useState<ChecklistKind>("truck");
  const [truckChecklist, setTruckChecklist] = useState<ChecklistState>(() => createChecklistState(TRUCK_ITEMS));
  const [trailerChecklist, setTrailerChecklist] = useState<ChecklistState>(() => createChecklistState(TRAILER_ITEMS));

  useEffect(() => {
    try {
      const truckRaw = localStorage.getItem("dema-checklist-truck");
      const trailerRaw = localStorage.getItem("dema-checklist-trailer");
      if (truckRaw) setTruckChecklist({ ...createChecklistState(TRUCK_ITEMS), ...JSON.parse(truckRaw) });
      if (trailerRaw) setTrailerChecklist({ ...createChecklistState(TRAILER_ITEMS), ...JSON.parse(trailerRaw) });
    } catch {
      // ignore broken localStorage content
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("dema-checklist-truck", JSON.stringify(truckChecklist));
  }, [truckChecklist]);

  useEffect(() => {
    localStorage.setItem("dema-checklist-trailer", JSON.stringify(trailerChecklist));
  }, [trailerChecklist]);

  const activeChecklist = checklistKind === "truck" ? truckChecklist : trailerChecklist;
  const setActiveChecklist = checklistKind === "truck" ? setTruckChecklist : setTrailerChecklist;
  const checklistItems = useMemo(
    () => (checklistKind === "truck" ? [...TRUCK_ITEMS] : [...TRAILER_ITEMS]),
    [checklistKind]
  );
  const checklistSections = checklistKind === "truck" ? TRUCK_SECTIONS : TRAILER_SECTIONS;
  const doneCount = checklistItems.filter((i) => activeChecklist.checks[i] === "ok").length;
  const noCount = checklistItems.filter((i) => activeChecklist.checks[i] === "nein").length;
  const openCount = checklistItems.length - doneCount - noCount;
  const progressPct = checklistItems.length ? Math.round(((doneCount + noCount) / checklistItems.length) * 100) : 0;

  function setCheckValue(item: string, value: "ok" | "nein" | "") {
    setActiveChecklist((prev) => ({
      ...prev,
      checks: { ...prev.checks, [item]: value },
    }));
  }

  function markSectionAll(sectionItems: readonly string[]) {
    setActiveChecklist((prev) => {
      const nextChecks = { ...prev.checks };
      for (const item of sectionItems) nextChecks[item] = "ok";
      return { ...prev, checks: nextChecks };
    });
  }

  function clearSection(sectionItems: readonly string[]) {
    setActiveChecklist((prev) => {
      const nextChecks = { ...prev.checks };
      const nextRemarks = { ...prev.bemerkung };
      for (const item of sectionItems) {
        nextChecks[item] = "";
        nextRemarks[item] = "";
        nextRemarks[`${item}__fahrer`] = "";
        nextRemarks[`${item}__werkstatt`] = "";
        nextChecks[`${item}__endkontrolle`] = "";
      }
      return { ...prev, checks: nextChecks, bemerkung: nextRemarks };
    });
  }

  const topCards =
    is("team")
      ? [
          { label: t("ogtActiveAgents", "Active Agents"),   value: "4",  icon: Users,      tone: "from-blue-500 to-indigo-600"   },
          { label: t("ogtOnBreak", "On Break"),             value: "1",  icon: Clock3,     tone: "from-amber-500 to-orange-500"  },
          { label: t("ogtOffline", "Offline"),              value: "1",  icon: CircleAlert,tone: "from-slate-400 to-slate-500"   },
          { label: t("ogtCoverage", "Coverage Area"),       value: "5",  icon: MapPin,     tone: "from-emerald-500 to-teal-600"  },
        ]
      : is("fahrer")
        ? [
            { label: t("ogtFahrerActive", "Active Drivers"),    value: "3",   icon: Truck,       tone: "from-blue-500 to-indigo-600"   },
            { label: t("ogtFahrerBreak", "On Break"),          value: "1",   icon: Clock3,      tone: "from-amber-500 to-orange-500"  },
            { label: t("ogtFahrerOffline", "Offline"),         value: "1",   icon: CircleAlert, tone: "from-slate-400 to-slate-500"   },
            { label: t("ogtFahrerKmToday", "Total km today"),  value: "520", icon: Car,         tone: "from-emerald-500 to-teal-600"  },
          ]
      : is("tasks")
        ? [
            { label: t("ogtOpenTasks", "Open Tasks"),       value: "4", icon: ClipboardList,  tone: "from-blue-500 to-indigo-600"  },
            { label: t("ogtInProgress", "In Progress"),    value: "2", icon: Activity,       tone: "from-violet-500 to-purple-600" },
            { label: t("ogtDoneToday", "Done Today"),      value: "1", icon: CheckCircle2,   tone: "from-emerald-500 to-teal-600" },
            { label: t("ogtHighPriority", "High Priority"), value: "3", icon: CircleAlert,   tone: "from-red-500 to-rose-600"     },
          ]
      : is("checklists")
        ? [
            { label: "Checkpunkte", value: String(checklistItems.length), icon: ClipboardList, tone: "from-blue-500 to-indigo-600" },
            { label: "OK", value: String(checklistItems.filter((i) => activeChecklist.checks[i] === "ok").length), icon: CheckCircle2, tone: "from-emerald-500 to-teal-600" },
            { label: "Nein", value: String(checklistItems.filter((i) => activeChecklist.checks[i] === "nein").length), icon: CircleAlert, tone: "from-amber-500 to-orange-500" },
            { label: "Offen", value: String(checklistItems.filter((i) => !activeChecklist.checks[i]).length), icon: Activity, tone: "from-violet-500 to-purple-600" },
          ]
        : is("schedule")
          ? [
              { label: t("ogtShiftsToday", "Shifts Today"), value: "6",  icon: CalendarClock, tone: "from-blue-500 to-indigo-600"   },
              { label: t("ogtOnRoute", "On Route"),       value: "3",  icon: Navigation,    tone: "from-emerald-500 to-teal-600"  },
              { label: t("ogtCompleted", "Completed"),    value: "2",  icon: CheckCircle2,  tone: "from-slate-400 to-slate-500"   },
              { label: t("ogtLive", "Live Status"),       value: "ON", icon: RadioTower,    tone: "from-violet-500 to-purple-600" },
            ]
          : [
              { label: t("ogtTasksWeek", "Tasks this week"),      value: "28",     icon: ClipboardList, tone: "from-blue-500 to-indigo-600"  },
              { label: t("ogtOnTimeRate", "On-time rate"),        value: "91%",    icon: CheckCircle2, tone: "from-emerald-500 to-teal-600" },
              { label: t("ogtAvgTime", "Avg. processing time"),   value: "38 min", icon: Clock3,    tone: "from-amber-500 to-orange-500" },
              { label: t("ogtFleetKm", "Total km"),               value: "1.240",  icon: Truck,     tone: "from-violet-500 to-purple-600"},
            ];

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-800">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md">
            <Truck className="h-5 w-5" />
          </span>
          {t("ogtTitle", "On Ground Team")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("ogtSubtitle", "Deployment overview, team status and task planning for the field team.")}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm">
        {tabs.map((tab) => (
          <a
            key={tab.key}
            href={tab.path}
            className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition ${
              is(tab.key)
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {t(tab.labelKey, tab.fallback)}
          </a>
        ))}
      </div>

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {topCards.map((card) => (
          <div
            key={card.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.tone} p-5 text-white shadow-xl`}
          >
            <p className="text-sm font-medium text-white/80">{card.label}</p>
            <p className="mt-1 text-3xl font-bold">{card.value}</p>
            <card.icon className="absolute bottom-3 right-3 h-10 w-10 opacity-15" />
          </div>
        ))}
      </div>

      {/* Section content */}
      {is("team") && (
        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-800">{t("ogtTeamOverview", "Team overview – today")}</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">{t("ogtThName", "Name")}</th>
                  <th className="px-5 py-3">{t("ogtThRole", "Role")}</th>
                  <th className="px-5 py-3">{t("ogtThStatus", "Status")}</th>
                  <th className="px-5 py-3">{t("ogtThLocation", "Location")}</th>
                  <th className="px-5 py-3">{t("ogtThTasks", "Tasks")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {MOCK_AGENTS.map((a) => (
                  <tr key={a.name} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{a.name}</td>
                    <td className="px-5 py-3 text-slate-600">{a.role}</td>
                    <td className="px-5 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-3 text-slate-600">
                      {a.location !== "—" ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {a.location}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">
                        {a.tasks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {is("fahrer") && (
        <div className="space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                {t("ogtFahrerList", "Driver list")}
              </h2>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">{t("ogtThName", "Name")}</th>
                    <th className="px-5 py-3">{t("ogtFahrerLicense", "License")}</th>
                    <th className="px-5 py-3">{t("ogtFahrerVehicle", "Vehicle")}</th>
                    <th className="px-5 py-3">{t("ogtFahrerPlate", "Plate")}</th>
                    <th className="px-5 py-3">{t("ogtThStatus", "Status")}</th>
                    <th className="px-5 py-3">{t("ogtFahrerKm", "km today")}</th>
                    <th className="px-5 py-3">{t("ogtFahrerFuel", "Tank %")}</th>
                    <th className="px-5 py-3">{t("ogtFahrerValid", "License valid until")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {MOCK_FAHRER.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-mono text-xs text-slate-400">{f.id}</td>
                      <td className="px-5 py-3 font-medium text-slate-800">{f.name}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {f.license}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Car className="h-3.5 w-3.5 text-slate-400" />
                          {f.vehicle}
                        </span>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-700">{f.plate}</td>
                      <td className="px-5 py-3"><StatusBadge status={f.status} /></td>
                      <td className="px-5 py-3 tabular-nums text-slate-700">{f.km} km</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${f.fuel > 50 ? "bg-emerald-500" : f.fuel > 25 ? "bg-amber-400" : "bg-red-500"}`}
                              style={{ width: `${f.fuel}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-slate-600">{f.fuel}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 tabular-nums text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          {f.valid}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Truck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">{t("ogtFahrerFleetSize", "Total vehicles")}</p>
                  <p className="text-2xl font-bold text-slate-800">5</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Fuel className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">{t("ogtFahrerAvgFuel", "Avg. tank level")}</p>
                  <p className="text-2xl font-bold text-slate-800">70%</p>
                </div>
              </div>
            </div>
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Car className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-slate-500">{t("ogtFahrerKmToday", "Total km today")}</p>
                  <p className="text-2xl font-bold text-slate-800">520 km</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {is("tasks") && (
        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-800">{t("ogtTaskList", "Task list – today")}</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">{t("ogtThTask", "Task")}</th>
                  <th className="px-5 py-3">{t("ogtThAgent", "Agent")}</th>
                  <th className="px-5 py-3">{t("ogtThPriority", "Priority")}</th>
                  <th className="px-5 py-3">{t("ogtThStatus", "Status")}</th>
                  <th className="px-5 py-3">{t("ogtEta", "ETA")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {MOCK_TASKS.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{task.id}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{task.title}</td>
                    <td className="px-5 py-3 text-slate-600">{task.agent}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        <PriorityDot priority={task.priority} />
                        <span className="capitalize text-slate-600">
                          {task.priority === "high"
                            ? t("tasksHigh", "High")
                            : task.priority === "medium"
                              ? t("tasksMedium", "Medium")
                              : t("ogtPriorityLow", "Low")}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-5 py-3 tabular-nums text-slate-600">{task.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {is("schedule") && (
        <div className="glass-card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-800">{t("ogtScheduleToday", "Schedule – today")}</h2>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">{t("ogtThTime", "Time")}</th>
                  <th className="px-5 py-3">{t("ogtThAgent", "Agent")}</th>
                  <th className="px-5 py-3">{t("ogtThTask", "Task")}</th>
                  <th className="px-5 py-3">{t("ogtThStatus", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {SCHEDULE_ROWS.map((row) => (
                  <tr key={row.time + row.agent} className="hover:bg-slate-50">
                    <td className="px-5 py-3 tabular-nums font-semibold text-blue-600">{row.time}</td>
                    <td className="px-5 py-3 font-medium text-slate-800">{row.agent}</td>
                    <td className="px-5 py-3 text-slate-600">{row.task}</td>
                    <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {is("checklists") && (
        <div className="space-y-6">
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setChecklistKind("truck")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  checklistKind === "truck" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {t("ogtChecklistTruck", "Checkliste Abholung LKW")}
              </button>
              <button
                type="button"
                onClick={() => setChecklistKind("trailer")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  checklistKind === "trailer" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {t("ogtChecklistTrailer", "Checkliste Anhänger / Auflieger")}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="ml-auto rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("commonPrint", "Drucken")}
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Fortschritt</p>
                <p className="mt-0.5 text-lg font-bold text-slate-800">{progressPct}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-emerald-50/70 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-emerald-700">OK</p>
                <p className="mt-0.5 text-lg font-bold text-emerald-800">{doneCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-amber-50/80 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-amber-700">Nein</p>
                <p className="mt-0.5 text-lg font-bold text-amber-800">{noCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-100/80 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-slate-600">Offen</p>
                <p className="mt-0.5 text-lg font-bold text-slate-800">{openCount}</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-800">
                {checklistKind === "truck"
                  ? t("ogtChecklistTruckDigital", "Digitale LKW-Abholcheckliste")
                  : t("ogtChecklistTrailerDigital", "Digitale Anhänger-/Auflieger-Checkliste")}
              </h2>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                {[
                  [t("ogtFieldBrand", "Marke"), "marke"],
                  [t("ogtFieldType", "Typ"), "typ"],
                  [t("ogtFieldBody", "Aufbau"), "aufbau"],
                  [t("commonCustomers", "Kunde"), "kunde"],
                  [t("ogtFieldChassisNo", "Fahrgestellnr."), "fahrgestellnr"],
                  [t("ogtFieldPnr", "P-Nr."), "pnr"],
                ].map(([label, key]) => (
                  <label key={key} className="text-xs font-semibold text-slate-600">
                    {label}
                    <input
                      value={activeChecklist[key as keyof ChecklistState] as string}
                      onChange={(e) =>
                        setActiveChecklist((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800"
                    />
                  </label>
                ))}
              </div>

              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">{t("ogtChecklistCheckpoint", "Prüfpunkt")}</th>
                      <th className="px-3 py-2">{t("ogtCheckOk", "Ok")}</th>
                      <th className="px-3 py-2">{t("ogtCheckNo", "Nein")}</th>
                      {checklistKind === "truck" ? (
                        <th className="px-3 py-2">{t("ogtChecklistRemarks", "Bemerkungen")}</th>
                      ) : (
                        <>
                          <th className="px-3 py-2">Fahrer</th>
                          <th className="px-3 py-2">Werkstatt</th>
                          <th className="px-3 py-2">Endkontrolle</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {checklistSections.map((section) => (
                      <Fragment key={section.title}>
                        <tr key={`${section.title}-head`} className="bg-slate-50/70">
                          <td colSpan={checklistKind === "truck" ? 4 : 6} className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-600">
                            <div className="flex items-center justify-between gap-2">
                              <span>{section.title}</span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => markSectionAll(section.items)}
                                  className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200"
                                >
                                  Alles OK
                                </button>
                                <button
                                  type="button"
                                  onClick={() => clearSection(section.items)}
                                  className="rounded-md bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-300"
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {section.items.map((item) => (
                          <tr key={`${section.title}-${item}`}>
                            <td className="px-3 py-2 font-medium text-slate-800">{item}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setCheckValue(item, activeChecklist.checks[item] === "ok" ? "" : "ok")}
                                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                  activeChecklist.checks[item] === "ok"
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                OK
                              </button>
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setCheckValue(item, activeChecklist.checks[item] === "nein" ? "" : "nein")}
                                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                                  activeChecklist.checks[item] === "nein"
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                Nein
                              </button>
                            </td>
                            {checklistKind === "truck" ? (
                              <td className="px-3 py-2">
                                <input
                                  value={activeChecklist.bemerkung[item] ?? ""}
                                  onChange={(e) =>
                                    setActiveChecklist((prev) => ({
                                      ...prev,
                                      bemerkung: { ...prev.bemerkung, [item]: e.target.value },
                                    }))
                                  }
                                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                                />
                              </td>
                            ) : (
                              <>
                                <td className="px-3 py-2">
                                  <input
                                    value={activeChecklist.bemerkung[`${item}__fahrer`] ?? ""}
                                    onChange={(e) =>
                                      setActiveChecklist((prev) => ({
                                        ...prev,
                                        bemerkung: { ...prev.bemerkung, [`${item}__fahrer`]: e.target.value },
                                      }))
                                    }
                                    className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    value={activeChecklist.bemerkung[`${item}__werkstatt`] ?? ""}
                                    onChange={(e) =>
                                      setActiveChecklist((prev) => ({
                                        ...prev,
                                        bemerkung: { ...prev.bemerkung, [`${item}__werkstatt`]: e.target.value },
                                      }))
                                    }
                                    className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="checkbox"
                                    checked={activeChecklist.checks[`${item}__endkontrolle`] === "ok"}
                                    onChange={(e) =>
                                      setActiveChecklist((prev) => ({
                                        ...prev,
                                        checks: {
                                          ...prev.checks,
                                          [`${item}__endkontrolle`]: e.target.checked ? "ok" : "",
                                        },
                                      }))
                                    }
                                  />
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <label className="text-xs font-semibold text-slate-600">
                  {t("ogtTyresAxle1", "Reifen % 1.Achse")}
                  <input
                    value={activeChecklist.reifen1}
                    onChange={(e) => setActiveChecklist((prev) => ({ ...prev, reifen1: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  {t("ogtTyresAxle2", "2.Achse")}
                  <input
                    value={activeChecklist.reifen2}
                    onChange={(e) => setActiveChecklist((prev) => ({ ...prev, reifen2: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  {t("ogtTyresAxle3", "3.Achse")}
                  <input
                    value={activeChecklist.reifen3}
                    onChange={(e) => setActiveChecklist((prev) => ({ ...prev, reifen3: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  {t("ogtTyresAxle4", "4.Achse")}
                  <input
                    value={activeChecklist.reifen4}
                    onChange={(e) => setActiveChecklist((prev) => ({ ...prev, reifen4: e.target.value }))}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">
                  {t("customersNotes", "Notizen")}
                  <textarea
                    value={activeChecklist.notizen}
                    onChange={(e) => setActiveChecklist((prev) => ({ ...prev, notizen: e.target.value }))}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm"
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    {t("commonSales", "Verkauf")}
                    <input
                      value={activeChecklist.verkauf}
                      onChange={(e) => setActiveChecklist((prev) => ({ ...prev, verkauf: e.target.value }))}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {t("commonName", "Name")}
                    <input
                      value={activeChecklist.name}
                      onChange={(e) => setActiveChecklist((prev) => ({ ...prev, name: e.target.value }))}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {t("commonDate", "Datum")}
                    <input
                      type="date"
                      value={activeChecklist.datum}
                      onChange={(e) => setActiveChecklist((prev) => ({ ...prev, datum: e.target.value }))}
                      className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    {t("ogtSignature", "Unterschrift")}
                    <SignatureInput
                      value={activeChecklist.unterschrift}
                      onChange={(next) =>
                        setActiveChecklist((prev) => ({ ...prev, unterschrift: next }))
                      }
                      className="mt-1"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {is("reports") && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h2 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                {t("ogtTasksPerAgent", "Tasks per agent (week)")}
              </h2>
              <ul className="space-y-3">
                {MOCK_AGENTS.map((a) => {
                  const done = Math.floor(Math.random() * 8) + 2;
                  const total = done + a.tasks;
                  return (
                    <li key={a.name}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-700">{a.name}</span>
                        <span className="text-slate-500">{done}/{total}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.round((done / total) * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="glass-card p-6">
              <h2 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-emerald-500" />
                {t("ogtOnTimeStats", "On-time statistics")}
              </h2>
              <div className="space-y-4">
                {[
                  { label: t("weekdayMon", "Montag"), pct: 95 },
                  { label: t("weekdayTue", "Dienstag"), pct: 88 },
                  { label: t("weekdayWed", "Mittwoch"), pct: 92 },
                  { label: t("weekdayThu", "Donnerstag"), pct: 85 },
                  { label: t("weekdayFri", "Freitag"), pct: 91 },
                ].map((d) => (
                  <div key={d.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{d.label}</span>
                      <span className={`font-semibold ${d.pct >= 90 ? "text-emerald-600" : "text-amber-600"}`}>{d.pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${d.pct >= 90 ? "bg-emerald-500" : "bg-amber-400"}`}
                        style={{ width: `${d.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="mb-4 text-base font-bold text-slate-800 flex items-center gap-2">
              <Truck className="h-5 w-5 text-violet-500" />
              {t("ogtFleetSummary", "Fleet summary")}
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: t("ogtFleetTotal", "Total vehicles"),  value: "6" },
                { label: t("ogtFleetActive", "In operation"),   value: "4" },
                { label: t("ogtFleetKmWeek", "km this week"),   value: "1.240" },
                { label: t("ogtFleetFuel", "Avg. consumption"), value: "7.2 L" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
