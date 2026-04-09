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
    () => new Intl.DateTimeFormat(localeTag, { month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, 1)),
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
    <div className="rounded-2xl border border-rose-200/50 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onPrevMonth}
          title={prevLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-rose-800 transition hover:bg-rose-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="min-w-0 flex-1 text-center text-xs font-semibold capitalize text-rose-950">{monthLabel}</span>
        <button
          type="button"
          onClick={onNextMonth}
          title={nextLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-rose-800 transition hover:bg-rose-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-rose-600/80">{titleLabel}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-rose-900/60">
        {weekdayLabels.map((w) => (
          <span key={w} className="py-1">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((d, i) => {
          if (d == null) {
            return <span key={`e-${i}`} className="h-9" />;
          }
          const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const sel = iso === selectedDate;
          const isToday = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDay(iso)}
              className={`flex h-9 items-center justify-center rounded-lg text-xs font-semibold transition ${
                sel
                  ? 'bg-gradient-to-br from-rose-700 to-amber-800 text-white shadow-md shadow-rose-900/25'
                  : isToday
                    ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-300/80 hover:bg-amber-200'
                    : 'text-slate-700 hover:bg-rose-50'
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
