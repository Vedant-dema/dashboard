import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  PhoneCall,
  Plus,
  Search,
  Sparkles,
  UserRound,
  Zap,
} from 'lucide-react';
import './timetable-print.css';
import type {
  TimetableCallLogInput,
  TimetableDbState,
  TimetableEntry,
  TimetableFilterMode,
  TimetableOfferInput,
} from '../../types/timetable';
import {
  addTimetableEntries,
  createDraftTimetableEntry,
  loadTimetableDb,
  nowIsoDateTime,
  saveTimetableDb,
  stripTimetableDemoBuyerRows,
  timetableRowIsMine,
  timetableRowIsOtherBuyer,
  upsertTimetableEntry,
} from '../../store/timetableStore';
import { localeTagForLanguage, useLanguage, type LanguageCode } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import type { DepartmentArea } from '../../types/departmentArea';
import { DEPARTMENT_I18N_KEY } from '../../types/departmentArea';
import { TimetableMiniCalendar } from './TimetableMiniCalendar';
import { TimetableTable } from './TimetableTable';
import { TimetableCallModal } from './TimetableCallModal';
import { TimetableContactDrawer } from './TimetableContactDrawer';
import { TimetableOfferModal } from './TimetableOfferModal';

type CreateFormState = {
  date: string;
  time: string;
  company_name: string;
  contact_name: string;
  phone: string;
  purpose: string;
};

function localIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToIso(iso: string, deltaDays: number): string {
  const base = new Date(`${iso}T12:00:00`);
  base.setDate(base.getDate() + deltaDays);
  return localIsoDate(base);
}

function monthRangeIso(anchorIso: string): { from: string; to: string } {
  const d = new Date(`${anchorIso}T12:00:00`);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { from: localIsoDate(start), to: localIsoDate(end) };
}

function normalizeIsoDateFromScheduled(scheduledAt: string): string {
  const raw = scheduledAt.trim();
  return raw.length >= 10 ? raw.slice(0, 10) : localIsoDate();
}

function parseDateForSort(raw: string): number {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return Number.MAX_SAFE_INTEGER;
  return ms;
}

function buyerCodeFromName(raw: string | undefined): string {
  const text = (raw ?? '').trim();
  if (!text) return 'ES';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}`.toUpperCase();
  return text.slice(0, 2).toUpperCase();
}

function joinNotes(existing: string, append: string): string {
  const base = existing.trim();
  const next = append.trim();
  if (!next) return base;
  if (!base) return next;
  return `${base}\n${next}`;
}

export function TimetablePage({ department }: { department?: DepartmentArea }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  const localeTag = localeTagForLanguage(language as LanguageCode);
  const todayIso = localIsoDate();

  const [db, setDb] = useState<TimetableDbState>(() => loadTimetableDb());
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<TimetableFilterMode>('all_day');
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(() => monthRangeIso(todayIso).from);
  const [rangeTo, setRangeTo] = useState(() => monthRangeIso(todayIso).to);
  const [toast, setToast] = useState<string | null>(null);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const dayPickerRef = useRef<HTMLDivElement>(null);
  const filtersMenuRef = useRef<HTMLDivElement>(null);
  const [callModalEntry, setCallModalEntry] = useState<TimetableEntry | null>(null);
  const [offerModalEntry, setOfferModalEntry] = useState<TimetableEntry | null>(null);
  const [contactDrawerEntryId, setContactDrawerEntryId] = useState<number | null>(null);
  const viewerBuyerCode = useMemo(() => buyerCodeFromName(user?.name), [user?.name]);
  const contactDrawerEntry = useMemo(
    () =>
      contactDrawerEntryId != null
        ? db.entries.find((e) => e.id === contactDrawerEntryId) ?? null
        : null,
    [contactDrawerEntryId, db.entries]
  );
  const [createForm, setCreateForm] = useState<CreateFormState>({
    date: todayIso,
    time: '09:00',
    company_name: '',
    contact_name: '',
    phone: '',
    purpose: '',
  });

  useEffect(() => {
    saveTimetableDb(db);
  }, [db]);

  useEffect(() => {
    const asDate = new Date(`${selectedDate}T12:00:00`);
    setViewYear(asDate.getFullYear());
    setViewMonth(asDate.getMonth());
    setCreateForm((prev) => (prev.date === selectedDate ? prev : { ...prev, date: selectedDate }));
  }, [selectedDate]);

  useEffect(() => {
    if (!showDayPicker) return;
    const onDocDown = (e: MouseEvent) => {
      if (dayPickerRef.current && !dayPickerRef.current.contains(e.target as Node)) {
        setShowDayPicker(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [showDayPicker]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onDocDown = (e: MouseEvent) => {
      if (filtersMenuRef.current && !filtersMenuRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [filtersOpen]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const viewerRows = useMemo(
    () => db.entries.filter((entry) => timetableRowIsMine(entry, viewerBuyerCode)),
    [db.entries, viewerBuyerCode]
  );

  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of viewerRows) {
      const dayIso = normalizeIsoDateFromScheduled(row.scheduled_at);
      counts[dayIso] = (counts[dayIso] ?? 0) + 1;
    }
    return counts;
  }, [viewerRows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return viewerRows
      .filter((row) => {
        const day = normalizeIsoDateFromScheduled(row.scheduled_at);
        if (filterMode === 'other_buyer_range') return day >= rangeFrom && day <= rangeTo;
        return day === selectedDate;
      })
      .filter((row) => {
        if (!q) return true;
        const haystack = `${row.company_name} ${row.contact_name} ${row.phone} ${row.notes} ${row.purpose}`.toLowerCase();
        return haystack.includes(q);
      })
      .filter((row) => {
        if (filterMode === 'open')
          return !row.is_completed && row.outcome !== 'no_trucks';
        if (filterMode === 'open_other_buyer')
          return (
            !row.is_completed &&
            row.outcome !== 'no_trucks' &&
            timetableRowIsOtherBuyer(row, viewerBuyerCode)
          );
        if (filterMode === 'other_buyer_range')
          return timetableRowIsOtherBuyer(row, viewerBuyerCode);
        if (filterMode === 'follow_up') return Boolean(row.follow_up_at);
        if (filterMode === 'offers') return row.outcome === 'has_trucks';
        if (filterMode === 'completed') return row.is_completed || row.outcome === 'no_trucks';
        if (filterMode === 'completed_no_followup')
          return (row.is_completed || row.outcome === 'no_trucks') && !row.follow_up_at;
        if (filterMode === 'parked') return row.is_parked;
        return true;
      })
      .filter((row) => {
        if (!showOffersOnly) return true;
        return row.outcome === 'has_trucks' || Boolean(row.offer);
      })
      .slice()
      .sort((a, b) => parseDateForSort(a.scheduled_at) - parseDateForSort(b.scheduled_at));
  }, [
    filterMode,
    rangeFrom,
    rangeTo,
    searchTerm,
    selectedDate,
    showOffersOnly,
    viewerBuyerCode,
    viewerRows,
  ]);

  const stats = useMemo(() => {
    const dayRows = viewerRows.filter((row) => normalizeIsoDateFromScheduled(row.scheduled_at) === selectedDate);
    return {
      total: dayRows.length,
      open: dayRows.filter((row) => !row.is_completed && row.outcome !== 'no_trucks').length,
      offers: dayRows.filter((row) => row.outcome === 'has_trucks').length,
      followUp: dayRows.filter((row) => Boolean(row.follow_up_at)).length,
    };
  }, [selectedDate, viewerRows]);

  const selectedDateLabel = useMemo(
    () =>
      new Date(`${selectedDate}T12:00:00`).toLocaleDateString(localeTag, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [localeTag, selectedDate]
  );

  const filterChipItems = useMemo(
    () =>
      [
        ['all_day', t('timetableFilterAllDay', 'All day')],
        ['open', t('timetableFilterUnfinished', 'Open calls')],
        ['open_other_buyer', t('timetableFilterUnfinishedOther', 'Open — other buyer')],
        ['other_buyer_range', t('timetableFilterOtherBuyerRange', 'Other buyers (range)')],
        ['follow_up', t('timetableFilterFollowUp', 'Follow-up')],
        ['offers', t('timetableFilterOffers', 'Offers')],
        ['completed', t('timetableFilterCompleted', 'Completed')],
        ['completed_no_followup', t('timetableFilterDoneNoFollowUp', 'Done without follow-up')],
        ['parked', t('timetableFilterParked', 'Parked')],
      ] as Array<[TimetableFilterMode, string]>,
    [t]
  );

  const filtersActive = useMemo(
    () => showOffersOnly || filterMode !== 'all_day',
    [filterMode, showOffersOnly]
  );

  const selectCalendarDay = useCallback((isoDate: string) => {
    setSelectedDate(isoDate);
  }, []);

  const onPickDayFromCalendar = useCallback((isoDate: string) => {
    setSelectedDate(isoDate);
    setShowDayPicker(false);
  }, []);

  const shiftSelectedDay = useCallback((delta: number) => {
    setSelectedDate((prev) => addDaysToIso(prev, delta));
  }, []);

  const prevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const createSlot = useCallback(() => {
    if (!createForm.company_name.trim()) return;
    const baseDraft = createDraftTimetableEntry(viewerBuyerCode);
    const scheduledAt = `${createForm.date}T${createForm.time}:00`;
    const payload: Omit<TimetableEntry, 'id'> = {
      ...baseDraft,
      buyer_name: viewerBuyerCode,
      scheduled_at: scheduledAt,
      company_name: createForm.company_name.trim(),
      contact_name: createForm.contact_name.trim(),
      phone: createForm.phone.trim(),
      purpose: createForm.purpose.trim(),
    };
    setDb((prev) => stripTimetableDemoBuyerRows(addTimetableEntries(prev, [payload])));
    setCreateForm((prev) => ({
      ...prev,
      company_name: '',
      contact_name: '',
      phone: '',
      purpose: '',
    }));
    setShowCreatePanel(false);
  }, [createForm, viewerBuyerCode]);

  const applyCallLog = useCallback(
    (payload: TimetableCallLogInput) => {
      if (!callModalEntry) return;
      const updated: TimetableEntry = {
        ...callModalEntry,
        notes: joinNotes(callModalEntry.notes, payload.note_append),
        outcome: payload.outcome,
        follow_up_at:
          payload.outcome === 'follow_up' || payload.outcome === 'has_trucks'
            ? payload.follow_up_at
            : null,
        is_completed: payload.outcome === 'no_trucks',
        last_called_at: nowIsoDateTime(),
      };
      setDb((prev) => upsertTimetableEntry(prev, updated));
      setCallModalEntry(null);
      if (updated.outcome === 'has_trucks') {
        setOfferModalEntry(updated);
      }
    },
    [callModalEntry]
  );

  const applyOffer = useCallback(
    (payload: TimetableOfferInput) => {
      if (!offerModalEntry) return;
      const nowIso = nowIsoDateTime();
      const updated: TimetableEntry = {
        ...offerModalEntry,
        outcome: 'has_trucks',
        is_completed: false,
        offer: {
          captured_at: nowIso,
          ...payload,
        },
      };
      setDb((prev) => upsertTimetableEntry(prev, updated));
      setOfferModalEntry(null);
    },
    [offerModalEntry]
  );

  const persistContactEntry = useCallback(
    (updated: TimetableEntry) => {
      setDb((prev) => upsertTimetableEntry(prev, updated));
      setToast(t('timetableContactSaved', 'Contact saved.'));
    },
    [setDb, t]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(165deg,#eef2ff_0%,#f8fafc_38%,#ecfdf5_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4] [background-image:radial-gradient(circle_at_1px_1px,rgb(100_116_139/0.14)_1px,transparent_0)] [background-size:24px_24px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 -z-10 h-[28rem] w-[28rem] rounded-full bg-emerald-400/25 blur-[100px] motion-safe:animate-timetable-blob motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 -z-10 h-[22rem] w-[22rem] rounded-full bg-indigo-400/20 blur-[90px] motion-safe:animate-timetable-blob motion-reduce:animate-none [animation-delay:-7s]"
        aria-hidden
      />

      <div className="timetable-print-root flex min-h-0 flex-1 flex-col gap-5 p-4 pb-10 md:gap-7 md:p-6">
        <header className="order-1 overflow-hidden rounded-3xl border border-slate-800/50 bg-[#06060d] shadow-[0_20px_60px_-15px_rgba(15,23,42,0.45)] ring-1 ring-white/[0.06]">
          <div className="relative px-5 py-6 md:px-8 md:py-8">
            <div className="pointer-events-none absolute -right-16 -top-32 h-[22rem] w-[22rem] rounded-full bg-indigo-500/25 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none [animation-delay:-11s]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/25 to-transparent" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent blur-sm" />
            <div className="relative flex flex-col gap-8 motion-safe:animate-timetable-fade-up motion-reduce:animate-none lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="min-w-0 flex-1">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-gradient-to-r from-emerald-500/15 to-teal-500/10 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200 shadow-sm shadow-emerald-950/20">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300 motion-safe:animate-pulse motion-reduce:animate-none" strokeWidth={2} />
                  {t('timetableBadgePurchase', 'Purchase desk')}
                </p>
                <h1 className="text-balance bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent md:text-3xl md:leading-tight">
                  {t('timetablePageTitle', 'Purchase call timetable')}
                </h1>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                  {t('timetableDailyOverview', 'Daily overview')}
                </p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
                  {t(
                    'timetablePageSubtitle',
                    'Your personal queue for outbound calls — fast logging, follow-ups, and offer capture.'
                  )}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/10">
                    <UserRound className="h-4 w-4 text-slate-400" strokeWidth={2} />
                    <span className="font-medium text-slate-200">{user?.name || t('commonUser', 'User')}</span>
                  </span>
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold uppercase tracking-tight text-white shadow-lg shadow-violet-950/40 ring-2 ring-white/10"
                    title={t('timetableOwnerCode', 'Owner code')}
                  >
                    {viewerBuyerCode}
                  </span>
                  {department ? (
                    <span className="text-slate-500">
                      {t('customersArea', 'Area')}:{' '}
                      <span className="font-semibold text-slate-200">
                        {t(DEPARTMENT_I18N_KEY[department], department)}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
              <div
                className="grid w-full shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:max-w-[min(100%,28rem)] lg:gap-3"
                aria-label={t('timetableHeaderSummary', 'Day summary')}
              >
                {(
                  [
                    {
                      value: stats.total,
                      label: t('commonTotal', 'Total'),
                      icon: LayoutGrid,
                      valueClass: 'text-white',
                      labelClass: 'text-slate-300',
                      iconClass: 'text-slate-400',
                      cardClass: 'border-white/10 bg-white/[0.07]',
                    },
                    {
                      value: stats.open,
                      label: t('timetableStatOpen', 'Open'),
                      icon: Zap,
                      valueClass: 'text-amber-300',
                      labelClass: 'text-amber-300/90',
                      iconClass: 'text-amber-400/90',
                      cardClass: 'border-amber-500/15 bg-amber-500/[0.08]',
                    },
                    {
                      value: stats.offers,
                      label: t('timetableStatOffers', 'Offers'),
                      icon: Sparkles,
                      valueClass: 'text-emerald-400',
                      labelClass: 'text-emerald-400/90',
                      iconClass: 'text-emerald-400/85',
                      cardClass: 'border-emerald-500/15 bg-emerald-500/[0.08]',
                    },
                    {
                      value: stats.followUp,
                      label: t('timetableStatFollowUp', 'Follow-up'),
                      icon: BarChart3,
                      valueClass: 'text-cyan-300',
                      labelClass: 'text-cyan-300/90',
                      iconClass: 'text-cyan-400/90',
                      cardClass: 'border-cyan-500/15 bg-cyan-500/[0.08]',
                    },
                  ] as const
                ).map(({ value, label, icon: Icon, valueClass, labelClass, iconClass, cardClass }, idx) => (
                  <div
                    key={label}
                    style={{ animationDelay: `${idx * 90}ms` }}
                    className={`rounded-2xl border p-3 text-center ring-1 ring-white/[0.06] backdrop-blur-md transition duration-300 will-change-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 motion-safe:animate-timetable-stat motion-reduce:animate-none md:p-3.5 ${cardClass}`}
                  >
                    <Icon className={`mx-auto mb-1.5 h-4 w-4 ${iconClass}`} strokeWidth={2} />
                    <p className={`text-2xl font-bold tabular-nums tracking-tight ${valueClass}`}>{value}</p>
                    <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.14em] ${labelClass}`}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <main className="order-2 flex min-h-0 flex-1 flex-col gap-4 motion-safe:animate-timetable-fade-up motion-reduce:animate-none [animation-delay:80ms] [animation-fill-mode:both]">
            <div className="no-print relative z-10 overflow-visible rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/[0.03] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-emerald-400/30 before:to-transparent md:p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
                      <div className="relative flex shrink-0 flex-col" ref={filtersMenuRef}>
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {t('timetableFilterLabel', 'Filter')}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDayPicker(false);
                            setFiltersOpen((o) => !o);
                          }}
                          aria-expanded={filtersOpen}
                          aria-haspopup="dialog"
                          aria-label={t('timetableFiltersMenuAria', 'Open filters')}
                          className={`relative mt-2 flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition ${
                            filtersOpen
                              ? 'bg-slate-900 text-white ring-slate-900'
                              : filtersActive
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80 hover:bg-emerald-100/80'
                                : 'bg-slate-100/80 text-slate-600 ring-slate-200/60 hover:bg-white hover:text-slate-900'
                          }`}
                        >
                          <Filter className="h-5 w-5" strokeWidth={2} />
                          {filtersActive && !filtersOpen ? (
                            <span
                              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"
                              aria-hidden
                            />
                          ) : null}
                        </button>
                        {filtersOpen ? (
                          <div
                            className="absolute left-0 top-[calc(100%+0.35rem)] z-[62] w-[min(calc(100vw-2rem),24rem)] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.04]"
                            role="dialog"
                            aria-label={t('timetableFiltersTitle', 'Quick filters')}
                          >
                            <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-50/40 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-900">
                                {t('timetableFiltersTitle', 'Quick filters')}
                              </p>
                              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                                {t(
                                  'timetableFiltersSubtitle',
                                  'Refine which rows appear in the table below.'
                                )}
                              </p>
                            </div>
                            <div className="space-y-5 p-4">
                              <div>
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                  {t('timetableFiltersSectionOffers', 'Offer visibility')}
                                </p>
                                <button
                                  type="button"
                                  aria-pressed={showOffersOnly}
                                  onClick={() => setShowOffersOnly((v) => !v)}
                                  className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition ${
                                    showOffersOnly
                                      ? 'border-emerald-300/80 bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-500/15'
                                      : 'border-slate-200/80 bg-slate-50/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100/80'
                                  }`}
                                >
                                  <span>{t('timetableShowOffers', 'Show offers')}</span>
                                  <span
                                    className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                                      showOffersOnly ? 'bg-emerald-500' : 'bg-slate-300/90'
                                    }`}
                                    aria-hidden
                                  >
                                    <span
                                      className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
                                        showOffersOnly ? 'translate-x-5' : 'translate-x-0'
                                      }`}
                                    />
                                  </span>
                                </button>
                              </div>
                              <div className="border-t border-slate-100 pt-5">
                                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                  {t('timetableFiltersSectionModes', 'Row filters')}
                                </p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {filterChipItems.map(([mode, label]) => (
                                    <button
                                      key={mode}
                                      type="button"
                                      onClick={() => setFilterMode(mode)}
                                      className={`min-h-[2.5rem] rounded-xl px-3 py-2 text-left text-xs font-semibold leading-snug transition ${
                                        filterMode === mode
                                          ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                                          : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {filterMode === 'other_buyer_range' ? (
                                <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                    {t('timetableRangeTitle', 'Date range')}
                                  </p>
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                      {t('timetableDateFrom', 'From')}
                                      <input
                                        type="date"
                                        value={rangeFrom}
                                        onChange={(e) => setRangeFrom(e.target.value)}
                                        className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                      />
                                    </label>
                                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                      {t('timetableDateTo', 'To')}
                                      <input
                                        type="date"
                                        value={rangeTo}
                                        onChange={(e) => setRangeTo(e.target.value)}
                                        className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200/90 bg-white px-3 text-sm font-semibold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                      />
                                    </label>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {t('timetableSearch', 'Search')}
                        </span>
                        <div className="mt-2 flex min-h-11 min-w-0 items-center gap-3 rounded-xl bg-slate-100/80 px-4 ring-1 ring-slate-200/60 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/25">
                          <Search className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                          <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={t('timetableSearchPlaceholder', 'Company, contact, notes...')}
                            className="h-11 w-full min-w-0 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap lg:w-auto lg:shrink-0">
                    <div className="flex min-h-11 flex-1 items-stretch gap-0.5 rounded-2xl bg-gradient-to-b from-slate-100/95 to-slate-50/90 p-1 shadow-inner shadow-slate-900/5 ring-1 ring-slate-200/70 sm:min-w-0 sm:flex-initial">
                      <button
                        type="button"
                        onClick={() => shiftSelectedDay(-1)}
                        className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition duration-200 hover:bg-white hover:text-slate-900 hover:shadow-sm active:scale-95"
                        aria-label={t('timetablePrevDay', 'Previous day')}
                      >
                        <ChevronLeft className="h-5 w-5" strokeWidth={2} />
                      </button>
                      <div className="relative min-w-0 flex-1 sm:min-w-[11rem]" ref={dayPickerRef}>
                        <button
                          type="button"
                          onClick={() => {
                            setFiltersOpen(false);
                            setShowDayPicker((open) => !open);
                          }}
                          aria-expanded={showDayPicker}
                          aria-haspopup="dialog"
                          aria-label={t('timetableOpenDayPicker', 'Open calendar')}
                          className="flex h-10 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/50 transition hover:ring-emerald-300/50"
                        >
                          <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
                          <span className="truncate capitalize">{selectedDateLabel}</span>
                        </button>
                        {showDayPicker ? (
                          <div
                            className="absolute right-0 top-[calc(100%+0.35rem)] z-[60] w-[min(calc(100vw-2rem),20.5rem)] rounded-xl border border-slate-200/90 bg-white p-3 shadow-xl shadow-slate-900/15 ring-1 ring-slate-100 sm:left-0 sm:right-auto"
                            role="dialog"
                            aria-label={t('timetableMiniCalTitle', 'Jump to day')}
                          >
                            <TimetableMiniCalendar
                              localeTag={localeTag}
                              viewYear={viewYear}
                              viewMonth={viewMonth}
                              selectedDate={selectedDate}
                              dayCounts={dayCounts}
                              onPrevMonth={prevMonth}
                              onNextMonth={nextMonth}
                              onSelectDay={onPickDayFromCalendar}
                              title={t('timetableMiniCalTitle', 'Jump to day')}
                              prevLabel={t('timetablePrevMonth', 'Previous month')}
                              nextLabel={t('timetableNextMonth', 'Next month')}
                            />
                            <label className="mt-3 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                              {t('timetableExactDateLabel', 'Or pick exact date')}
                              <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => selectCalendarDay(e.target.value)}
                                className="mt-2 h-10 w-full rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 text-sm font-semibold text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                              />
                            </label>
                          </div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => shiftSelectedDay(1)}
                        className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition duration-200 hover:bg-white hover:text-slate-900 hover:shadow-sm active:scale-95"
                        aria-label={t('timetableNextDay', 'Next day')}
                      >
                        <ChevronRight className="h-5 w-5" strokeWidth={2} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowCreatePanel((prev) => !prev)}
                      className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 ring-1 ring-white/10 transition duration-300 hover:scale-[1.02] hover:shadow-emerald-900/35 hover:brightness-105 active:scale-[0.98]"
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                      {t('timetableNewAppointment', 'New appointment')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {showCreatePanel ? (
              <div className="no-print relative overflow-hidden rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/95 via-white to-teal-50/40 p-5 shadow-[0_24px_50px_-12px_rgba(5,150,105,0.2)] ring-1 ring-emerald-900/[0.04] motion-safe:animate-timetable-fade-up motion-reduce:animate-none">
                <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
                <div
                  className="pointer-events-none absolute -right-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-emerald-400/20 blur-3xl"
                  aria-hidden
                />
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                    <PhoneCall className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-900">
                    {t('timetableCreatePanelTitle', 'Create timetable row')}
                  </h2>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={createForm.company_name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, company_name: e.target.value }))}
                    placeholder={t('timetableColCompany', 'Company')}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    value={createForm.contact_name}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, contact_name: e.target.value }))}
                    placeholder={t('timetableColContact', 'Contact')}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    value={createForm.phone}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder={t('timetableColPhone', 'Phone')}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    value={createForm.purpose}
                    onChange={(e) => setCreateForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    placeholder={t('timetableColPurpose', 'Purpose')}
                    className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <div className="grid grid-cols-2 gap-3 md:col-span-2">
                    <input
                      type="date"
                      value={createForm.date}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <input
                      type="time"
                      value={createForm.time}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, time: e.target.value }))}
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2 border-t border-emerald-100/80 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreatePanel(false)}
                    className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {t('commonCancel', 'Cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={createSlot}
                    className="h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 text-sm font-bold text-white shadow-md shadow-emerald-900/20 transition hover:brightness-105"
                  >
                    {t('commonSave', 'Save')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="relative z-0 min-h-0 flex-1">
              <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md shadow-slate-900/20">
                      {t('timetableDailyQueue', 'Your queue')}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200/90 bg-white px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-600 shadow-sm">
                      {filteredRows.length} {t('timetableRowsLabel', 'rows')}
                    </span>
                  </div>
                  <p className="max-w-xl text-xs leading-relaxed text-slate-500 sm:border-l sm:border-slate-200 sm:pl-4">
                    {t('timetableQueueOpenRow', 'Click a row to open the customer contact workspace.')}
                  </p>
                </div>
              </div>
              <TimetableTable
                rows={filteredRows}
                localeTag={localeTag}
                t={t}
                onOpenContact={(row) => setContactDrawerEntryId(row.id)}
                onOpenCallLog={setCallModalEntry}
                onOpenOffer={setOfferModalEntry}
              />
            </div>
        </main>
      </div>

      {toast ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-[120] max-w-md -translate-x-1/2 px-4 motion-safe:animate-timetable-fade-up motion-reduce:animate-none"
          role="status"
        >
          <div className="pointer-events-auto rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-3.5 text-center text-sm font-semibold text-white shadow-2xl shadow-slate-900/50 ring-1 ring-white/10">
            {toast}
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-3 text-xs font-bold text-emerald-300 underline-offset-2 hover:underline"
            >
              {t('commonClose', 'Close')}
            </button>
          </div>
        </div>
      ) : null}

      <TimetableContactDrawer
        entry={contactDrawerEntry}
        localeTag={localeTag}
        t={t}
        onClose={() => setContactDrawerEntryId(null)}
        onPersist={persistContactEntry}
        onLogCall={(row) => setCallModalEntry(row)}
        onEditOffer={(row) => setOfferModalEntry(row)}
      />

      <TimetableCallModal
        entry={callModalEntry}
        t={t}
        onClose={() => setCallModalEntry(null)}
        onSave={applyCallLog}
      />

      <TimetableOfferModal
        entry={offerModalEntry}
        t={t}
        onClose={() => setOfferModalEntry(null)}
        onSave={applyOffer}
      />
    </div>
  );
}
