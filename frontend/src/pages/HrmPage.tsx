import {
  Activity,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck2,
  CircleCheckBig,
  Clock3,
  Crown,
  FileSpreadsheet,
  Euro,
  Fingerprint,
  KeyRound,
  Landmark,
  Layers3,
  ReceiptText,
  Shield,
  ShieldCheck,
  UserRoundCheck,
  UserCog,
  Users,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

type HrmSection = "mitarbeiter" | "anwesenheit" | "gehalt" | "rollen";

const tabs: { key: HrmSection; labelKey: string; fallback: string; path: string }[] = [
  { key: "mitarbeiter", labelKey: "hrmSectionEmployees", fallback: "Mitarbeiter", path: "#/hrm/mitarbeiter" },
  { key: "anwesenheit", labelKey: "hrmSectionAttendance", fallback: "Anwesenheit", path: "#/hrm/anwesenheit" },
  { key: "gehalt", labelKey: "hrmSectionSalary", fallback: "Gehalt", path: "#/hrm/gehalt" },
  { key: "rollen", labelKey: "hrmSectionRoles", fallback: "Rollen & Rechte", path: "#/hrm/rollen-rechte" },
];

export function HrmPage({ section = "mitarbeiter" }: { section?: HrmSection }) {
  const { t } = useLanguage();
  const is = (k: HrmSection) => section === k;
  const sectionTitle: Record<HrmSection, string> = {
    mitarbeiter: t("hrmSectionEmployees", "Mitarbeiter"),
    anwesenheit: t("hrmSectionAttendance", "Anwesenheit"),
    gehalt: t("hrmSectionSalary", "Gehalt"),
    rollen: t("hrmSectionRoles", "Rollen & Rechte"),
  };

  const topCards =
    section === "mitarbeiter"
      ? [
          { label: "Headcount", value: "128", icon: Users, tone: "from-blue-500 to-indigo-600" },
          { label: t("hrmLabelNewHires", "Neueinstellungen"), value: "12", icon: BriefcaseBusiness, tone: "from-cyan-500 to-blue-600" },
          { label: "Onboarding", value: "7", icon: CircleCheckBig, tone: "from-emerald-500 to-teal-600" },
          { label: t("hrmLabelAttrition", "Fluktuation"), value: "3.2%", icon: Activity, tone: "from-violet-500 to-fuchsia-600" },
        ]
      : section === "anwesenheit"
        ? [
            { label: t("hrmLabelPresentToday", "Heute anwesend"), value: "94.2%", icon: CalendarCheck2, tone: "from-blue-500 to-indigo-600" },
            { label: t("hrmLabelVacation", "Urlaub"), value: "12", icon: Clock3, tone: "from-cyan-500 to-blue-600" },
            { label: t("hrmLabelSick", "Krank"), value: "4", icon: Activity, tone: "from-amber-500 to-orange-600" },
            { label: t("hrmLabelOpenShifts", "Schichten offen"), value: "2", icon: Layers3, tone: "from-violet-500 to-fuchsia-600" },
          ]
        : section === "gehalt"
          ? [
              { label: "Payroll Run", value: "100%", icon: Euro, tone: "from-blue-500 to-indigo-600" },
              { label: t("hrmLabelStatements", "Abrechnungen"), value: "128", icon: ReceiptText, tone: "from-cyan-500 to-blue-600" },
              { label: t("hrmLabelSepaStatus", "SEPA Status"), value: "Freigegeben", icon: Landmark, tone: "from-emerald-500 to-teal-600" },
              { label: t("hrmLabelValidationErrors", "Prüffehler"), value: "0", icon: BadgeCheck, tone: "from-violet-500 to-fuchsia-600" },
            ]
          : [
              { label: t("hrmLabelActiveRoles", "Aktive Rollen"), value: "14", icon: UserCog, tone: "from-blue-500 to-indigo-600" },
              { label: t("hrmLabelMfaActive", "MFA aktiv"), value: "92%", icon: Fingerprint, tone: "from-cyan-500 to-blue-600" },
              { label: t("hrmLabelPrivilegedUsers", "Privilegierte User"), value: "9", icon: Crown, tone: "from-amber-500 to-orange-600" },
              { label: "Audit", value: t("hrmLabelClean", "Clean"), icon: ShieldCheck, tone: "from-violet-500 to-fuchsia-600" },
            ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-slate-50/70">
      <div className="border-b border-slate-200/80 bg-white/90 px-6 py-6 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{t("hrmTitle", "Human Resource Management")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{sectionTitle[section]}</h1>

          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = tab.key === section;
              return (
                <a
                  key={tab.key}
                  href={tab.path}
                  className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t(tab.labelKey, tab.fallback)}
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl space-y-6 px-6 py-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {topCards.map((k) => (
            <div key={k.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02]">
              <div className="flex items-start justify-between">
                <p className="text-sm font-medium text-slate-500">{k.label}</p>
                <div className={`rounded-xl bg-gradient-to-br p-2 text-white ${k.tone}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{k.value}</p>
            </div>
          ))}
        </section>

        {is("mitarbeiter") && (
          <div className="grid gap-6 lg:grid-cols-12">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
              <div className="mb-4 grid grid-cols-4 gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <span>{t("hrmColName", "Name")}</span><span>{t("hrmColRole", "Rolle")}</span><span>{t("hrmColLocation", "Standort")}</span><span>{t("hrmColStatus", "Status")}</span>
              </div>
              <div className="space-y-2">
                {[
                  ["Liciu Ana-Maria", "HRBP", "Hamburg", t("hrmStatusActive", "Aktiv")],
                  ["Mitsos Deligiannis", "Werkstatt", "Berlin", t("hrmStatusActive", "Aktiv")],
                  ["Tom Müller", "Sales", "Hamburg", t("hrmStatusActive", "Aktiv")],
                  ["Erika Musterfrau", "Payroll", "München", "Onboarding"],
                ].map((r) => (
                  <div key={r[0]} className="grid grid-cols-4 items-center rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-sm">
                    <span className="font-medium text-slate-800">{r[0]}</span>
                    <span className="text-slate-600">{r[1]}</span>
                    <span className="text-slate-600">{r[2]}</span>
                    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${r[3] === t("hrmStatusActive", "Aktiv") ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r[3] === "Onboarding" ? t("hrmStatusOnboarding", "Onboarding") : r[3]}</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Onboarding", "7"],
                  ["Probezeit", "13"],
                  ["Verträge", "128"],
                  ["Gespräche", "29"],
                ].map((x) => (
                  <div key={x[0]} className="rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-100">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{x[0]}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{x[1]}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {is("anwesenheit") && (
          <div className="grid gap-6 lg:grid-cols-12">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
              <div className="space-y-3">
                {[
                  ["Frühschicht", 92],
                  ["Tag", 96],
                  ["Spät", 89],
                  ["Nacht", 83],
                ].map(([label, v]) => (
                  <div key={String(label)}>
                    <div className="mb-1.5 flex items-center justify-between text-sm font-medium text-slate-700">
                      <span>{label}</span><span>{v}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
              <div className="space-y-2">
                {[
                  ["Urlaubsanträge", "18"],
                  ["Krankmeldungen", "4"],
                  ["Offene Freigaben", "6"],
                  ["Vertretungen", "9"],
                ].map((x) => (
                  <div key={x[0]} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <span className="text-sm text-slate-600">{x[0]}</span>
                    <span className="text-lg font-bold text-slate-900">{x[1]}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {is("gehalt") && (
          <div className="grid gap-6 lg:grid-cols-12">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { name: "Brutto", val: "€ 478K", Icon: Euro },
                  { name: "Netto", val: "€ 311K", Icon: ReceiptText },
                  { name: "Abgaben", val: "€ 167K", Icon: FileSpreadsheet },
                ].map(({ name, val, Icon }) => (
                  <div key={name} className="rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between">
                      <p className="text-xs uppercase tracking-wide text-slate-400">{name}</p>
                      <Icon className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{val}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-32 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 p-4">
                <div className="grid h-full grid-cols-12 items-end gap-1">
                  {[42, 58, 51, 66, 61, 72, 64, 78, 74, 81, 76, 88].map((h, i) => (
                    <div key={i} className="rounded-sm bg-gradient-to-t from-blue-500 to-indigo-500" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4">
              <div className="space-y-3">
                {[
                  { name: "SEPA", state: "Freigegeben", Icon: CircleCheckBig },
                  { name: "ELStAM", state: "Validiert", Icon: BadgeCheck },
                  { name: "SV-Export", state: "Bereit", Icon: FileSpreadsheet },
                  { name: "Audit", state: "Keine Treffer", Icon: ShieldCheck },
                ].map(({ name, state, Icon }) => (
                  <div key={name} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">{name}</p>
                      <p className="text-sm font-semibold text-slate-800">{state}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {is("rollen") && (
          <div className="grid gap-6 lg:grid-cols-12">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Rolle</th>
                      <th className="px-3 py-2.5">User</th>
                      <th className="px-3 py-2.5">MFA</th>
                      <th className="px-3 py-2.5">Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      ["HR Admin", "3", "100%", "Vollzugriff"],
                      ["Payroll", "5", "100%", "Abrechnung"],
                      ["Führungskraft", "24", "95%", "Teamdaten"],
                      ["Mitarbeiter", "96", "89%", "Self-Service"],
                    ].map((r) => (
                      <tr key={r[0]}>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{r[0]}</td>
                        <td className="px-3 py-2.5 text-slate-600">{r[1]}</td>
                        <td className="px-3 py-2.5 text-slate-600">{r[2]}</td>
                        <td className="px-3 py-2.5 text-slate-600">{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: "Policies", Icon: Shield },
                  { title: "SSO", Icon: KeyRound },
                  { title: "Berechtigung", Icon: UserRoundCheck },
                  { title: "Audit-Log", Icon: Fingerprint },
                ].map(({ title, Icon }) => (
                  <div key={title} className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700">{title}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

