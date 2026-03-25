/**
 * DatePickerInput
 * A professional calendar popover that replaces <input type="date">.
 * The calendar panel renders via React portal (position:fixed) so it never
 * clips inside widgets, modals or overflow:hidden containers.
 *
 * Value / onChange use ISO "YYYY-MM-DD" strings.
 * Month and weekday names are generated via Intl.DateTimeFormat using the
 * current app language, so they automatically adapt to the selected locale.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Locale helpers ───────────────────────────────────────────────────────────

function langToLocale(lang: string): string {
  const map: Record<string, string> = {
    de: "de-DE", en: "en-GB", fr: "fr-FR", es: "es-ES",
    it: "it-IT", pt: "pt-PT", tr: "tr-TR", ru: "ru-RU",
    ar: "ar-SA", zh: "zh-CN", ja: "ja-JP", hi: "hi-IN",
  };
  return map[lang] ?? "en-GB";
}

function getMonthNames(locale: string): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2000, i, 1))
  );
}

function getMonthShortNames(locale: string): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(2000, i, 1))
  );
}

/** Returns 7 weekday abbreviations starting from Monday */
function getWeekdayNames(locale: string): string[] {
  // Day 1 = Mon … Day 7 = Sun using a known Monday anchor (2000-01-03)
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2000, 0, 3 + i))
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return { y, m: m - 1, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function buildCells(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const startPad = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array<null>(startPad).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function formatDisplay(iso: string, monthsShort: string[]): string {
  const p = parseIso(iso);
  if (!p) return "";
  return `${String(p.d).padStart(2, "0")}. ${monthsShort[p.m]} ${p.y}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DatePickerInputProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  /** Extra class for the trigger button */
  triggerClassName?: string;
  clearable?: boolean;
  minDate?: string;
  /**
   * "default" — full input-style box with calendar icon (default)
   * "ghost"   — transparent pill button, looks like a plain date label;
   *             ideal for headers / navigation bars
   */
  variant?: "default" | "ghost";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DatePickerInput({
  value,
  onChange,
  placeholder,
  triggerClassName,
  clearable = true,
  minDate,
  variant = "default",
}: DatePickerInputProps) {
  const { t, language } = useLanguage();
  const locale = langToLocale(language);

  const monthNames = useMemo(() => getMonthNames(locale), [locale]);
  const monthShortNames = useMemo(() => getMonthShortNames(locale), [locale]);
  const weekdayNames = useMemo(() => getWeekdayNames(locale), [locale]);

  const resolvedPlaceholder = placeholder ?? t("datePickerPlaceholder", "Select date…");

  const todayIso = today();
  const todayParts = parseIso(todayIso)!;

  // Derive initial view month from value or today
  const initView = () => {
    const p = parseIso(value);
    return p ?? todayParts;
  };

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => initView().y);
  const [viewMonth, setViewMonth] = useState(() => initView().m);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => initView().y);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync view to value when externally changed
  useEffect(() => {
    const p = parseIso(value);
    if (p) { setViewYear(p.y); setViewMonth(p.m); }
  }, [value]);

  // Position the portal panel
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelH = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const goUp = spaceBelow < panelH && rect.top > spaceBelow;

    setPanelStyle({
      position: "fixed",
      left: Math.min(rect.left, window.innerWidth - 300),
      width: Math.max(rect.width, 280),
      zIndex: 10000,
      ...(goUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, [open]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setMonthPickerOpen(false); } };
    const onMouse = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) { setOpen(false); setMonthPickerOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onMouse);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onMouse); };
  }, [open]);

  const cells = useMemo(() => buildCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const goToday = () => {
    setViewYear(todayParts.y);
    setViewMonth(todayParts.m);
    onChange(todayIso);
    setOpen(false);
    setMonthPickerOpen(false);
  };

  const pickMonth = (mIdx: number) => {
    setViewMonth(mIdx);
    setViewYear(pickerYear);
    setMonthPickerOpen(false);
  };

  const selectDay = (d: number) => {
    const iso = toIso(viewYear, viewMonth, d);
    if (minDate && iso < minDate) return;
    onChange(iso);
    setOpen(false);
  };

  const selectedParts = parseIso(value);

  const isSelected = (d: number) =>
    !!selectedParts && d === selectedParts.d && viewMonth === selectedParts.m && viewYear === selectedParts.y;
  const isToday = (d: number) =>
    d === todayParts.d && viewMonth === todayParts.m && viewYear === todayParts.y;
  const isDisabled = (d: number) => {
    if (!minDate) return false;
    return toIso(viewYear, viewMonth, d) < minDate;
  };
  const isWeekend = (idx: number) => idx % 7 >= 5;

  const openPicker = () => {
    const p = parseIso(value);
    if (p) { setViewYear(p.y); setViewMonth(p.m); }
    setPickerYear(viewYear);
    setMonthPickerOpen(false);
    setOpen((o) => !o);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const displayText = value ? formatDisplay(value, monthShortNames) : "";

  return (
    <div className="relative">
      {/* ── Trigger ── */}
      {variant === "ghost" ? (
        /* Ghost variant: looks like a plain date label / header button */
        <button
          ref={triggerRef}
          type="button"
          onClick={openPicker}
          title={t("datePickerTitle", "Select date")}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition hover:bg-slate-100 active:scale-95 ${
            open ? "bg-slate-100" : ""
          } ${value ? "text-blue-600 hover:bg-blue-50" : "text-slate-400 hover:bg-slate-100"} ${triggerClassName ?? ""}`}
        >
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span>{displayText || resolvedPlaceholder}</span>
        </button>
      ) : (
        /* Default variant: full input-style box */
        <button
          ref={triggerRef}
          type="button"
          onClick={openPicker}
          className={`flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500/20 ${
            open ? "border-blue-400 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-slate-300"
          } ${triggerClassName ?? ""}`}
        >
          <CalendarDays className={`h-4 w-4 shrink-0 ${value ? "text-blue-500" : "text-slate-400"}`} />
          <span className={`flex-1 truncate ${value ? "font-semibold text-slate-700" : "text-slate-400"}`}>
            {displayText || resolvedPlaceholder}
          </span>
          {clearable && value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(""); } }}
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 transition hover:bg-red-100 hover:text-red-500"
            >
              <X className="h-2.5 w-2.5" />
            </span>
          )}
        </button>
      )}

      {/* ── Calendar panel (portal) ── */}
      {open && createPortal(
        <div ref={panelRef} style={panelStyle}>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">

            {/* Month navigator */}
            <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50/60 px-2 py-2">
              <button type="button" onClick={prevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm">
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Month/year label — click to open month picker */}
              <button
                type="button"
                onClick={() => { setPickerYear(viewYear); setMonthPickerOpen((v) => !v); }}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-slate-800 transition hover:bg-white hover:shadow-sm ${monthPickerOpen ? "bg-white shadow-sm" : ""}`}
              >
                {monthNames[viewMonth]}
                <span className="font-normal text-slate-500">{viewYear}</span>
                <ChevronRight className={`h-3 w-3 text-slate-400 transition-transform ${monthPickerOpen ? "rotate-90" : ""}`} />
              </button>

              <button type="button" onClick={nextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Month/year picker overlay */}
            {monthPickerOpen && (
              <div className="border-b border-slate-100 bg-white px-2 pb-2 pt-1">
                <div className="mb-1 flex items-center justify-between">
                  <button type="button" onClick={() => setPickerYear((y) => y - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-sm font-bold text-slate-800">{pickerYear}</span>
                  <button type="button" onClick={() => setPickerYear((y) => y + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {monthShortNames.map((ms, i) => {
                    const isActive = i === viewMonth && pickerYear === viewYear;
                    const isTodayM = i === todayParts.m && pickerYear === todayParts.y;
                    return (
                      <button key={i} type="button" onClick={() => pickMonth(i)}
                        className={`rounded-lg py-1.5 text-[11px] font-semibold transition active:scale-95 ${
                          isActive ? "bg-blue-600 text-white shadow-sm"
                          : isTodayM ? "border border-blue-200 bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-100"}`}>
                        {ms}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-px bg-slate-50 px-2 pt-2">
              {weekdayNames.map((wd, i) => (
                <div key={wd} className={`pb-1 text-center text-[10px] font-bold uppercase tracking-wide ${i >= 5 ? "text-rose-400" : "text-slate-400"}`}>
                  {wd}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-px px-2 pb-2">
              {cells.map((d, i) =>
                d == null ? (
                  <div key={`p${i}`} className="aspect-square" />
                ) : (
                  <button
                    key={`d${i}`}
                    type="button"
                    disabled={isDisabled(d)}
                    onClick={() => selectDay(d)}
                    className={`flex aspect-square w-full items-center justify-center rounded-xl text-xs font-semibold transition active:scale-95 ${
                      isDisabled(d)
                        ? "cursor-not-allowed text-slate-300"
                        : isSelected(d)
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                        : isToday(d)
                        ? "ring-2 ring-inset ring-blue-400 text-blue-700 hover:bg-blue-50"
                        : isWeekend(i)
                        ? "text-rose-400 hover:bg-rose-50"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {d}
                  </button>
                )
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2">
              <button type="button" onClick={goToday}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50">
                {t("datePickerToday", "Today")}
              </button>
              {value && (
                <span className="text-xs font-semibold text-slate-600">{displayText}</span>
              )}
              {clearable && value && (
                <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                  className="rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-500">
                  {t("datePickerClear", "Clear")}
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
