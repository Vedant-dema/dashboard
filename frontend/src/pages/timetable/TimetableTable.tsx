import { Phone, PhoneCall, Truck } from 'lucide-react';
import type { TimetableEntry } from '../../types/timetable';

type Props = {
  rows: TimetableEntry[];
  localeTag: string;
  t: (key: string, fallback: string) => string;
  onOpenCallLog: (entry: TimetableEntry) => void;
  onOpenOffer: (entry: TimetableEntry) => void;
};

function formatDateTime(raw: string, localeTag: string): string {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return raw;
  return new Date(ms).toLocaleString(localeTag, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function outcomeBadgeClass(outcome: TimetableEntry['outcome']): string {
  switch (outcome) {
    case 'has_trucks':
      return 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-900 ring-emerald-300/60';
    case 'follow_up':
      return 'bg-gradient-to-r from-amber-400/20 to-orange-400/15 text-amber-950 ring-amber-400/50';
    case 'no_trucks':
      return 'bg-slate-200/80 text-slate-700 ring-slate-300/80';
    default:
      return 'bg-gradient-to-r from-sky-500/15 to-indigo-500/15 text-sky-950 ring-sky-300/60';
  }
}

function outcomeLabel(
  entry: TimetableEntry,
  t: (key: string, fallback: string) => string
): string {
  if (entry.outcome === 'has_trucks') return t('timetableOutcomeHasTrucks', 'Has trucks');
  if (entry.outcome === 'follow_up') return t('timetableOutcomeFollowUp', 'Follow-up');
  if (entry.outcome === 'no_trucks') return t('timetableOutcomeNoTrucks', 'No trucks');
  return t('timetableOutcomePending', 'Pending');
}

function rowAccentClass(outcome: TimetableEntry['outcome']): string {
  if (outcome === 'has_trucks') return 'border-l-[3px] border-l-emerald-500';
  if (outcome === 'follow_up') return 'border-l-[3px] border-l-amber-400';
  if (outcome === 'no_trucks') return 'border-l-[3px] border-l-slate-300';
  return 'border-l-[3px] border-l-transparent';
}

export function TimetableTable({ rows, localeTag, t, onOpenCallLog, onOpenOffer }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-2xl shadow-slate-900/[0.07] ring-1 ring-slate-100/90 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="min-w-[1080px] w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-200">
              <th className="px-4 py-4 font-semibold">{t('timetableColSchedule', 'Schedule')}</th>
              <th className="px-4 py-4 font-semibold">{t('timetableColCompany', 'Company')}</th>
              <th className="px-4 py-4 font-semibold">{t('timetableColContact', 'Contact')}</th>
              <th className="px-4 py-4 font-semibold">{t('timetableColPhone', 'Phone')}</th>
              <th className="px-4 py-4 font-semibold">{t('timetableColOutcome', 'Outcome')}</th>
              <th className="px-4 py-4 font-semibold">{t('timetableColFollowUp', 'Follow-up')}</th>
              <th className="px-4 py-4 font-semibold">{t('timetableColNotes', 'Notes')}</th>
              <th className="px-4 py-4 font-semibold">{t('timetableColActions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-16 text-center">
                  <p className="mx-auto max-w-md text-sm font-medium text-slate-500">
                    {t('timetableEmptyRows', 'No timetable rows match the selected filters.')}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`group border-b border-slate-100/90 align-top transition-colors hover:bg-gradient-to-r hover:from-emerald-50/40 hover:to-transparent ${rowAccentClass(
                    row.outcome
                  )}`}
                >
                  <td className="whitespace-nowrap px-4 py-4 font-semibold tabular-nums text-slate-900">
                    {formatDateTime(row.scheduled_at, localeTag)}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-slate-900">{row.company_name}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">{row.purpose}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-slate-700">{row.contact_name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-4">
                    {row.phone ? (
                      <a
                        href={`tel:${row.phone.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-800 ring-1 ring-slate-200/80 transition hover:bg-emerald-50 hover:text-emerald-900 hover:ring-emerald-200"
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
                        {row.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${outcomeBadgeClass(
                        row.outcome
                      )}`}
                    >
                      {outcomeLabel(row, t)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium tabular-nums text-slate-700">
                    {row.follow_up_at ? formatDateTime(row.follow_up_at, localeTag) : '—'}
                  </td>
                  <td className="max-w-lg px-4 py-4 text-sm leading-relaxed text-slate-600">
                    <p className="line-clamp-3">{row.notes || '—'}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2 opacity-95 transition group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onOpenCallLog(row)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                      >
                        <PhoneCall className="h-3.5 w-3.5" strokeWidth={2} />
                        {t('timetableActionLogCall', 'Log call')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenOffer(row)}
                        className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold shadow-md transition active:scale-[0.98] ${
                          row.outcome === 'has_trucks'
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-orange-900/20 hover:brightness-105'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200/80'
                        }`}
                        disabled={row.outcome !== 'has_trucks'}
                      >
                        <Truck className="h-3.5 w-3.5" strokeWidth={2} />
                        {row.offer
                          ? t('timetableActionEditOffer', 'Edit offer')
                          : t('timetableActionAddOffer', 'Add offer')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
