import { useWidgetLanguage } from "./useWidgetLanguage";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const april2025 = [
  null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
];

export function CalendarWidget({ config }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("calendarTitle", "Kalender"));
  const monthLabel = cfgString(config, "monthLabel", "April 2025");

  return (
    <div className="glass-card flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <span className="text-sm font-medium text-slate-500">{monthLabel}</span>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-400">
        {weekDays.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 gap-1 content-start">
        {april2025.map((d, i) =>
          d == null ? (
            <div key={`e-${i}`} className="aspect-square max-h-8" />
          ) : (
            <button
              key={d}
              type="button"
              className={`flex aspect-square max-h-8 items-center justify-center rounded-xl text-sm font-medium transition ${
                d === 18 ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  );
}
