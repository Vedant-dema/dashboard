import { useMemo, useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useWidgetLanguage } from "./useWidgetLanguage";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";

// ─── Locale tables ───────────────────────────────────────────────────────────

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTHS_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_EN = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build calendar cells for a month. Week starts Monday. Returns null for empty padding cells. */
function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun…6=Sat
  const startPad = firstDow === 0 ? 6 : firstDow - 1; // shift to Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array<null>(startPad).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CalendarWidget({ config }: WidgetRenderProps) {
  const { t, language } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("calendarTitle", "Kalender"));

  const isDE = !language || language === "de";
  const MONTHS = isDE ? MONTHS_DE : MONTHS_EN;
  const MONTHS_SHORT = isDE ? MONTHS_SHORT_DE : MONTHS_SHORT_EN;
  const WEEKDAYS = isDE ? WEEKDAYS_DE : WEEKDAYS_EN;

  const today = useMemo(() => new Date(), []);
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth, setViewMonth] = useState(todayM);
  const [selYear, setSelYear] = useState(todayY);
  const [selMonth, setSelMonth] = useState(todayM);
  const [selDay, setSelDay] = useState<number | null>(todayD);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(todayY);

  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [pickerOpen]);

  const days = useMemo(() => buildCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  // ── navigation ──
  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const goToday = () => {
    setViewYear(todayY); setViewMonth(todayM);
    setSelYear(todayY); setSelMonth(todayM); setSelDay(todayD);
    setPickerOpen(false);
  };

  const openPicker = () => {
    setPickerYear(viewYear);
    setPickerOpen((v) => !v);
  };

  const pickMonth = (monthIdx: number) => {
    setViewMonth(monthIdx);
    setViewYear(pickerYear);
    setPickerOpen(false);
  };

  const selectDay = (day: number) => {
    setSelDay(day); setSelMonth(viewMonth); setSelYear(viewYear);
  };

  const isToday = (d: number) => d === todayD && viewMonth === todayM && viewYear === todayY;
  const isSelected = (d: number) => d === selDay && viewMonth === selMonth && viewYear === selYear;
  const isWeekend = (cellIdx: number, _d: number) => {
    // count visible cells to find column (0=Mon … 6=Sun)
    return cellIdx % 7 >= 5;
  };

  // ── selected date display ──
  const hasSelection = selDay != null;
  const selectedLabel = hasSelection
    ? `${selDay}. ${MONTHS[selMonth]} ${selYear}`
    : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Title row */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
        >
          {t("calendarToday", "Heute")}
        </button>
      </div>

      {/* Month navigator + picker */}
      <div className="relative mb-2 shrink-0" ref={pickerRef}>
        <div className="flex items-center gap-1 rounded-xl bg-slate-50/80 p-1">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm active:scale-95"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={openPicker}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 transition hover:bg-white hover:shadow-sm ${
              pickerOpen ? "bg-white shadow-sm" : ""
            }`}
          >
            {MONTHS[viewMonth]}
            <span className="font-normal text-slate-500">{viewYear}</span>
            <ChevronRight
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${pickerOpen ? "rotate-90" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={nextMonth}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm active:scale-95"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Month / year picker overlay */}
        {pickerOpen && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
            {/* Year selector bar */}
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold text-slate-800">{pickerYear}</span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-1.5 p-3">
              {MONTHS_SHORT.map((m, i) => {
                const isActive = i === viewMonth && pickerYear === viewYear;
                const isTodayMonth = i === todayM && pickerYear === todayY;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => pickMonth(i)}
                    className={`rounded-xl py-2 text-xs font-semibold transition active:scale-95 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                        : isTodayMonth
                        ? "border border-blue-200 bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>

            {/* Jump to today */}
            <div className="border-t border-slate-100 px-3 py-2">
              <button
                type="button"
                onClick={goToday}
                className="w-full rounded-xl bg-slate-50 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
              >
                {t("calendarToday", "Heute")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid shrink-0 grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-bold uppercase tracking-wide ${
              i >= 5 ? "text-rose-400" : "text-slate-400"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar day grid */}
      <div className="grid flex-1 grid-cols-7 content-start gap-0.5">
        {days.map((d, i) =>
          d == null ? (
            <div key={`pad-${i}`} className="aspect-square max-h-9" />
          ) : (
            <button
              key={`d-${i}`}
              type="button"
              onClick={() => selectDay(d)}
              className={`flex aspect-square max-h-9 w-full items-center justify-center rounded-xl text-xs font-semibold transition active:scale-95 ${
                isSelected(d)
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                  : isToday(d)
                  ? "ring-2 ring-inset ring-blue-400 text-blue-700"
                  : isWeekend(i, d)
                  ? "text-rose-400 hover:bg-rose-50"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {d}
            </button>
          )
        )}
      </div>

      {/* Selected date display */}
      {selectedLabel && (
        <div className="mt-2 shrink-0 rounded-xl bg-blue-50/60 px-3 py-1.5 text-center text-[11px] font-semibold text-blue-700">
          {selectedLabel}
        </div>
      )}
    </div>
  );
}
