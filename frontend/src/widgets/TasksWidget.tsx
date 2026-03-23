import { useWidgetLanguage } from "./useWidgetLanguage";

export function TasksWidget() {
  const { t } = useWidgetLanguage();
  const tasks = [
    { title: t("tasksItem1", "Angebot für Kunde Schmidt"), tag: t("tasksHigh", "Hoch"), tagClass: "bg-red-100 text-red-700" },
    { title: t("tasksItem2", "Fahrzeug-Übergabe morgen 10:00"), tag: t("tasksMedium", "Mittel"), tagClass: "bg-amber-100 text-amber-800" },
    { title: t("tasksItem3", "Rechnung #2847 prüfen"), tag: t("tasksNew", "Neu"), tagClass: "bg-blue-100 text-blue-700" },
    { title: t("tasksItem4", "Waschtermin bestätigen"), tag: t("tasksMedium", "Mittel"), tagClass: "bg-amber-100 text-amber-800" },
  ];

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{t("tasksTitle", "Aufgaben & Erinnerungen")}</h2>
      <ul className="space-y-3 overflow-auto">
        {tasks.map((t) => (
          <li
            key={t.title}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
          >
            <span className="text-sm font-medium text-slate-700">{t.title}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.tagClass}`}>{t.tag}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
