import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  localeTag: string;
  viewYear: number;
  viewMonth: number;
  selectedDate: string;
  dayCounts: Record<string, number>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (isoDate: string) => void;
  title: string;
  prevLabel: string;
  nextLabel: string;
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function buildGrid(year: number, month: number): Array<number | null> {
  const firstDow = new Date(year, month, 1).getDay();
  const mondayIndex = (firstDow + 6) % 7;
  const totalDays = daysInMonth(year, month);
  const cells: Array<number | null> = [];

  for (let i = 0; i < mondayIndex; i += 1) cells.push(null);
  for (let d = 1; d <= totalDays; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function TimetableMiniCalendar({
  localeTag,
  viewYear,
  viewMonth,
  selectedDate,
  dayCounts,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  title,
  prevLabel,
  nextLabel,
}: Props) {
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }).format(
        new Date(viewYear, viewMonth, 1)
      ),
    [localeTag, viewMonth, viewYear]
  );

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(localeTag, { weekday: 'short' })
          .format(new Date(2026, 0, i + 5))
          .slice(0, 2)
      ),
    [localeTag]
  );

  const grid = useMemo(() => buildGrid(viewYear, viewMonth), [viewMonth, viewYear]);
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-gradient-to-b from-white via-white to-slate-50/95 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.04]">
      <div className="flex items-center justify-between gap-1 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-1 py-2.5 shadow-inner shadow-black/20">
        <button
          type="button"
          onClick={onPrevMonth}
          title={prevLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/75 transition duration-200 hover:bg-white/10 hover:text-white active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <div className="min-w-0 flex-1 px-1 text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-300/90">{title}</p>
          <p className="truncate text-sm font-bold capitalize tracking-tight text-white">{monthLabel}</p>
        </div>
        <button
          type="button"
          onClick={onNextMonth}
          title={nextLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/75 transition duration-200 hover:bg-white/10 hover:text-white active:scale-95"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>

      <div className="p-3.5">
        <div className="mb-2.5 grid grid-cols-7 gap-0.5 rounded-xl bg-gradient-to-b from-slate-100/95 to-slate-100/60 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-inner shadow-slate-900/[0.03]">
          {weekdayLabels.map((day, idx) => (
            <span key={`${idx}-${day}`} className="tabular-nums">
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {grid.map((day, idx) => {
            if (day == null) return <span key={`empty-${idx}`} className="h-11 sm:h-12" />;
            const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = iso === selectedDate;
            const isToday = iso === todayIso;
            const count = dayCounts[iso] ?? 0;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectDay(iso)}
                className={`relative flex h-11 items-center justify-center rounded-xl text-xs font-bold tabular-nums transition duration-200 will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 active:scale-[0.96] sm:h-12 ${
                  isSelected
                    ? 'z-[1] scale-[1.02] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-900/35 ring-2 ring-amber-400/90 ring-offset-2 ring-offset-white'
                    : isToday
                      ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-400/70 hover:scale-105 hover:bg-amber-50 hover:shadow-md'
                      : 'text-slate-700 hover:z-[1] hover:scale-105 hover:bg-white hover:shadow-md hover:shadow-slate-900/8'
                }`}
              >
                {day}
                {count > 0 ? (
                  <span
                    className={`absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none ${
                      isSelected ? 'bg-amber-400 text-slate-900' : 'bg-rose-500 text-white shadow-sm'
                    }`}
                  >
                    {count > 9 ? '9+' : String(count)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
