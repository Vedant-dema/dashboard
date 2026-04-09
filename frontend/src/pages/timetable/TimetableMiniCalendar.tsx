import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type TimetableMiniCalendarProps = {
  localeTag: string;
  viewYear: number;
  viewMonth: number;
  selectedDate: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (iso: string) => void;
  titleLabel: string;
  prevLabel: string;
  nextLabel: string;
};

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

function buildCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const offset = (firstDow + 6) % 7;
  const dim = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function TimetableMiniCalendar({
  localeTag,
  viewYear,
  viewMonth,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  titleLabel,
  prevLabel,
  nextLabel,
}: TimetableMiniCalendarProps) {
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }).format(
        new Date(viewYear, viewMonth, 1)
      ),
    [localeTag, viewYear, viewMonth]
  );

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) =>
        new Intl.DateTimeFormat(localeTag, { weekday: 'narrow' }).format(new Date(2024, 0, i + 1))
      ),
    [localeTag]
  );

  const grid = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-b from-white to-slate-50/80 shadow-inner shadow-slate-900/5 ring-1 ring-white/80">
      <div className="flex items-center justify-between gap-1 border-b border-slate-100/90 bg-slate-900/[0.03] px-2 py-2">
        <button
          type="button"
          onClick={onPrevMonth}
          title={prevLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-white hover:text-slate-900 hover:shadow-sm active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} />
        </button>
        <span className="min-w-0 flex-1 text-center text-xs font-bold capitalize tracking-tight text-slate-800">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          title={nextLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-700 transition hover:bg-white hover:text-slate-900 hover:shadow-sm active:scale-95"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
      <div className="p-2.5">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{titleLabel}</p>
        <div className="mb-1 grid grid-cols-7 gap-0.5 rounded-lg bg-slate-100/80 py-1.5 text-center text-[10px] font-bold text-slate-500">
          {weekdayLabels.map((w, idx) => (
            <span key={`${idx}-${w}`} className="py-0.5">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            if (d == null) {
              return <span key={`e-${i}`} className="h-10" />;
            }
            const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const sel = iso === selectedDate;
            const isToday = iso === todayIso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelectDay(iso)}
                className={`flex h-10 items-center justify-center rounded-xl text-xs font-bold transition active:scale-95 ${
                  sel
                    ? 'bg-gradient-to-br from-slate-900 to-rose-900 text-white shadow-md shadow-rose-900/30 ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white'
                    : isToday
                      ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-300/90 hover:bg-amber-200'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
