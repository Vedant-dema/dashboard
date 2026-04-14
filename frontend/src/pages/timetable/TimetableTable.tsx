import { useMemo } from 'react';
import { Phone, PhoneCall, Truck } from 'lucide-react';
import type { TimetableEntry } from '../../types/timetable';
import { entryAnyOfferHasContent, getActivityNotesLastSnippet } from './contactDrawerFormUtils';

type Props = {
  rows: TimetableEntry[];
  localeTag: string;
  t: (key: string, fallback: string) => string;
  onOpenContact: (entry: TimetableEntry) => void;
  onOpenCallLog: (entry: TimetableEntry) => void;
  onOpenOffer: (entry: TimetableEntry) => void;
};

function formatRowDate(raw: string, localeTag: string): string {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return raw;
  return new Date(ms).toLocaleDateString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatRowTime(raw: string, localeTag: string): string {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return raw;
  return new Date(ms).toLocaleTimeString(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const EM_DASH = '\u2014';

function kaArtFromRow(row: TimetableEntry): string {
  if (row.outcome === 'has_trucks' || entryAnyOfferHasContent(row)) return 'KA';
  return 'A';
}

function isPlaceholderPhone(phone: string | undefined | null): boolean {
  const p = (phone ?? '').trim();
  return !p || p === EM_DASH || p === '-' || p === '\u2013';
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

const COL_COUNT = 14;

export function TimetableTable({ rows, localeTag, t, onOpenContact, onOpenCallLog, onOpenOffer }: Props) {
  const emptyMark = useMemo(() => t('commonPlaceholderDash', '—'), [t]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm shadow-slate-900/[0.04]">
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColKa', 'Ka')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColArte', 'Arte')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColDate', 'Date')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColTime', 'Time')}</th>
              <th className="min-w-[10rem] px-3 py-3 font-medium">{t('timetableColCompany', 'Company')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColPhone', 'Phone')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColContact', 'Contact')}</th>
              <th className="min-w-[6rem] px-3 py-3 font-medium">{t('timetableColPurpose', 'Purpose')}</th>
              <th className="min-w-[14rem] px-3 py-3 font-medium">{t('timetableColRemark', 'Notes')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColOutcome', 'Outcome')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColFollowUp', 'Follow-up')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColDone', 'Done')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColVp', 'Buyer')}</th>
              <th className="whitespace-nowrap px-3 py-3 font-medium">{t('timetableColActions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COL_COUNT} className="px-6 py-16 text-center">
                  <p className="mx-auto max-w-md text-sm font-medium text-slate-500">
                    {t('timetableEmptyRows', 'No timetable rows match the selected filters.')}
                  </p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={(e) => {
                    const el = e.target as HTMLElement;
                    if (el.closest('a, button')) return;
                    onOpenContact(row);
                  }}
                  className={`group cursor-pointer border-b border-slate-100 align-top transition-colors hover:bg-slate-50/80 ${rowAccentClass(
                    row.outcome
                  )}`}
                >
                  <td className="whitespace-nowrap px-3 py-3.5">
                    <span className="inline-flex min-w-[1.75rem] justify-center rounded-md bg-slate-200/80 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-800 ring-1 ring-slate-300/60">
                      {row.legacy_ka ?? 'A'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    <span className="inline-flex min-w-[1.75rem] justify-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold uppercase text-slate-800 ring-1 ring-slate-200/80">
                      {row.legacy_arte ?? kaArtFromRow(row)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-semibold tabular-nums text-slate-900">
                    {formatRowDate(row.scheduled_at, localeTag)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-semibold tabular-nums text-slate-800">
                    {formatRowTime(row.scheduled_at, localeTag)}
                  </td>
                  <td className="px-3 py-3.5">
                    <p className="font-bold leading-snug text-slate-900">{row.company_name}</p>
                    {row.is_parked ? (
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-violet-600">
                        {t('timetableRowParkedTag', 'Parked')}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    {!isPlaceholderPhone(row.phone) ? (
                      <a
                        href={`tel:${row.phone.replace(/\s/g, '')}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200/80 transition hover:bg-emerald-50 hover:text-emerald-900 hover:ring-emerald-200"
                      >
                        <Phone className="h-3 w-3 text-emerald-600" strokeWidth={2} />
                        {row.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400">{emptyMark}</span>
                    )}
                  </td>
                  <td className="max-w-[10rem] px-3 py-3.5 text-sm text-slate-700">
                    {row.contact_name || emptyMark}
                  </td>
                  <td className="max-w-[8rem] px-3 py-3.5 text-xs font-medium text-slate-600">
                    {row.purpose || emptyMark}
                  </td>
                  <td className="max-w-md px-3 py-3.5 text-sm leading-relaxed text-slate-600">
                    <p className="line-clamp-3 print:line-clamp-none">
                      {getActivityNotesLastSnippet(row.contact_profile ?? {}, row.notes, row.scheduled_at) ||
                        emptyMark}
                    </p>
                  </td>
                  <td className="px-3 py-3.5">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${outcomeBadgeClass(
                        row.outcome
                      )}`}
                    >
                      {outcomeLabel(row, t)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-xs font-medium tabular-nums text-slate-700">
                    {row.follow_up_at ? formatRowTime(row.follow_up_at, localeTag) : emptyMark}
                    {row.follow_up_at ? (
                      <span className="ml-1 block text-[10px] font-normal text-slate-500">
                        {formatRowDate(row.follow_up_at, localeTag)}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-xs font-bold text-slate-800">
                    {row.is_completed || row.outcome === 'no_trucks'
                      ? t('timetableDoneYes', 'Yes')
                      : t('timetableDoneNo', 'No')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-mono text-xs font-bold text-slate-600">
                    {row.buyer_name}
                  </td>
                  <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col gap-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => onOpenCallLog(row)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-[10px] font-bold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                      >
                        <PhoneCall className="h-3 w-3" strokeWidth={2} />
                        {t('timetableActionLogCall', 'Appointment')}
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenOffer(row)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-2.5 text-[10px] font-bold text-white shadow-md shadow-orange-900/20 transition hover:brightness-105 active:scale-[0.98]"
                      >
                        <Truck className="h-3 w-3" strokeWidth={2} />
                        {entryAnyOfferHasContent(row)
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
