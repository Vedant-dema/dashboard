import { Plus } from "lucide-react";
import { useWidgetLanguage } from "./useWidgetLanguage";

const appointments = [
  { time: "09:00", title: "Kundenberatung — Weber GmbH" },
  { time: "11:30", title: "Fahrzeugabholung — BMW X3" },
  { time: "15:00", title: "Team-Meeting Verkauf" },
];

export function AppointmentsWidget() {
  const { t } = useWidgetLanguage();
  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{t("appointmentsTitle", "Heutige Termine")}</h2>
      <ul className="relative flex-1 space-y-4 overflow-auto before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-200">
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
        <Plus className="h-4 w-4" />
        {t("appointmentsNew", "Neuer Termin")}
      </button>
    </div>
  );
}
