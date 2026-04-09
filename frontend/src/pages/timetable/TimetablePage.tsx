import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  Filter,
  LayoutGrid,
  PhoneCall,
  Plus,
  Search,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from 'lucide-react';
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
  upsertTimetableEntry,
} from '../../store/timetableStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import type { DepartmentArea } from '../../types/departmentArea';
import { DEPARTMENT_I18N_KEY } from '../../types/departmentArea';
import { TimetableMiniCalendar } from './TimetableMiniCalendar';
import { TimetableTable } from './TimetableTable';
import { TimetableCallModal } from './TimetableCallModal';
import { TimetableOfferModal } from './TimetableOfferModal';

type CreateFormState = {
  date: string;
  time: string;
  company_name: string;
  contact_name: string;
  phone: string;
  purpose: string;
};

type TimetableSummaryTab = 'today' | 'pipeline' | 'performance';

function localIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function pickLocaleTag(language: string): string {
  if (language === 'de') return 'de-DE';
  if (language === 'fr') return 'fr-FR';
  if (language === 'es') return 'es-ES';
  if (language === 'it') return 'it-IT';
  if (language === 'pt') return 'pt-PT';
  if (language === 'tr') return 'tr-TR';
  if (language === 'ru') return 'ru-RU';
  if (language === 'ar') return 'ar-SA';
  if (language === 'zh') return 'zh-CN';
  if (language === 'ja') return 'ja-JP';
  if (language === 'hi') return 'hi-IN';
  return 'en-GB';
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

function parseIsoDayToMs(isoDate: string): number {
  return Date.parse(`${isoDate}T00:00:00`);
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

  const localeTag = pickLocaleTag(language);
  const todayIso = localIsoDate();

  const [db, setDb] = useState<TimetableDbState>(() => loadTimetableDb());
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<TimetableFilterMode>('all_day');
  const [summaryTab, setSummaryTab] = useState<TimetableSummaryTab>('today');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [callModalEntry, setCallModalEntry] = useState<TimetableEntry | null>(null);
  const [offerModalEntry, setOfferModalEntry] = useState<TimetableEntry | null>(null);
  const viewerBuyerCode = useMemo(() => buyerCodeFromName(user?.name), [user?.name]);
  const [createForm, setCreateForm] = useState<CreateFormState>({
    date: todayIso,
    time: '09:00',
    company_name: '',
    contact_name: '',
    phone: '',
    purpose: 'Outbound call',
  });

  useEffect(() => {
    saveTimetableDb(db);
  }, [db]);

  const viewerRows = useMemo(
    () => db.entries.filter((entry) => entry.buyer_name === viewerBuyerCode),
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
      .filter((row) => normalizeIsoDateFromScheduled(row.scheduled_at) === selectedDate)
      .filter((row) => {
        if (!q) return true;
        const haystack = `${row.company_name} ${row.contact_name} ${row.phone} ${row.notes} ${row.purpose}`.toLowerCase();
        return haystack.includes(q);
      })
      .filter((row) => {
        if (filterMode === 'open') return !row.is_completed && row.outcome !== 'no_trucks';
        if (filterMode === 'follow_up') return Boolean(row.follow_up_at);
        if (filterMode === 'offers') return row.outcome === 'has_trucks';
        if (filterMode === 'completed') return row.is_completed || row.outcome === 'no_trucks';
        return true;
      })
      .slice()
      .sort((a, b) => parseDateForSort(a.scheduled_at) - parseDateForSort(b.scheduled_at));
  }, [filterMode, searchTerm, selectedDate, viewerRows]);

  const stats = useMemo(() => {
    const dayRows = viewerRows.filter((row) => normalizeIsoDateFromScheduled(row.scheduled_at) === selectedDate);
    return {
      total: dayRows.length,
      open: dayRows.filter((row) => !row.is_completed && row.outcome !== 'no_trucks').length,
      offers: dayRows.filter((row) => row.outcome === 'has_trucks').length,
      followUp: dayRows.filter((row) => Boolean(row.follow_up_at)).length,
    };
  }, [selectedDate, viewerRows]);

  const insightStats = useMemo(() => {
    const selectedDayMs = parseIsoDayToMs(selectedDate);
    const endWeekMs = selectedDayMs + 6 * 24 * 60 * 60 * 1000;

    const nextWeekRows = viewerRows.filter((row) => {
      const dayMs = parseIsoDayToMs(normalizeIsoDateFromScheduled(row.scheduled_at));
      return dayMs >= selectedDayMs && dayMs <= endWeekMs;
    });

    const dueTodayFollowUps = viewerRows.filter(
      (row) => row.follow_up_at && normalizeIsoDateFromScheduled(row.follow_up_at) === selectedDate
    ).length;

    const calledRows = viewerRows.filter((row) => Boolean(row.last_called_at));
    const wonRows = viewerRows.filter((row) => row.outcome === 'has_trucks');
    const noTruckRows = viewerRows.filter((row) => row.outcome === 'no_trucks');
    const followUpRows = viewerRows.filter((row) => row.outcome === 'follow_up');
    const conversionPct = calledRows.length ? Math.round((wonRows.length / calledRows.length) * 100) : 0;

    const topCompanies = viewerRows
      .reduce<Record<string, number>>((acc, row) => {
        if (!row.company_name.trim()) return acc;
        const key = row.company_name.trim();
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});

    const topCompanyRows = Object.entries(topCompanies)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3);

    return {
      dueTodayFollowUps,
      nextWeekTotal: nextWeekRows.length,
      nextWeekOpen: nextWeekRows.filter((row) => !row.is_completed && row.outcome !== 'no_trucks').length,
      conversionPct,
      calledTotal: calledRows.length,
      wonTotal: wonRows.length,
      noTrucksTotal: noTruckRows.length,
      followUpTotal: followUpRows.length,
      topCompanyRows,
    };
  }, [selectedDate, viewerRows]);

  const selectCalendarDay = useCallback((isoDate: string) => {
    setSelectedDate(isoDate);
    setCreateForm((prev) => ({ ...prev, date: isoDate }));
    const asDate = new Date(`${isoDate}T12:00:00`);
    setViewYear(asDate.getFullYear());
    setViewMonth(asDate.getMonth());
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
      purpose: createForm.purpose.trim() || baseDraft.purpose,
    };
    setDb((prev) => addTimetableEntries(prev, [payload]));
    setCreateForm((prev) => ({
      ...prev,
      company_name: '',
      contact_name: '',
      phone: '',
      purpose: 'Outbound call',
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

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(165deg,#f8fafc_0%,#ecfeff_35%,#f5f3ff_70%,#fffbeb_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgb(148_163_184/0.22)_1px,transparent_0)] [background-size:24px_24px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_60%_at_100%_-10%,rgba(16,185,129,0.14),transparent_50%),radial-gradient(ellipse_70%_50%_at_0%_80%,rgba(99,102,241,0.12),transparent_55%)]"
        aria-hidden
      />

      <div className="flex min-h-0 flex-1 flex-col gap-6 p-4 pb-10 md:gap-8 md:p-6">
        <header className="order-1 overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-slate-950 shadow-2xl shadow-slate-900/40 ring-1 ring-white/10">
          <div className="relative px-5 py-6 md:px-8 md:py-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-violet-600/25 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end">
              <div className="min-w-0">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-200">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2} />
                  {t('timetableBadgePurchase', 'Purchase desk')}
                </p>
                <h1 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.35rem] lg:leading-tight">
                  {t('timetablePageTitle', 'Timetable')}
                </h1>
                <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-slate-300 md:text-base">
                  {t(
                    'timetablePageSubtitle',
                    'Personal queue for your outbound calls with fast logging, follow-ups, and offer capture.'
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1 ring-1 ring-white/10">
                    <UserRound className="h-3.5 w-3.5 text-slate-300" />
                    <span className="text-slate-200">{user?.name || t('commonUser', 'User')}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-300">
                    <Target className="h-3.5 w-3.5" />
                    {viewerBuyerCode}
                  </span>
                  {department ? (
                    <span className="text-slate-500">
                      {t('customersArea', 'Area')}:{' '}
                      <span className="font-semibold text-slate-300">
                        {t(DEPARTMENT_I18N_KEY[department], department)}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
                {[
                  { value: stats.total, label: t('commonTotal', 'Total'), icon: LayoutGrid, tone: 'text-white' },
                  { value: stats.open, label: t('timetableStatOpen', 'Open'), icon: Zap, tone: 'text-amber-300' },
                  {
                    value: stats.offers,
                    label: t('timetableStatOffers', 'Offers'),
                    icon: Sparkles,
                    tone: 'text-emerald-300',
                  },
                  {
                    value: stats.followUp,
                    label: t('timetableStatFollowUp', 'Follow-up'),
                    icon: BarChart3,
                    tone: 'text-cyan-300',
                  },
                ].map(({ value, label, icon: Icon, tone }) => (
                  <div
                    key={label}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] p-3 text-center ring-1 ring-white/5 transition hover:bg-white/[0.09] md:p-3.5"
                  >
                    <Icon className="mx-auto mb-1 h-4 w-4 text-slate-500 opacity-80 transition group-hover:text-slate-400" />
                    <p className={`text-2xl font-bold tabular-nums tracking-tight ${tone}`}>{value}</p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="order-2 flex min-h-0 flex-1 flex-col gap-6 xl:grid xl:grid-cols-12 xl:items-start xl:gap-6">
          <aside className="flex flex-col gap-4 xl:sticky xl:top-4 xl:col-span-4 xl:order-1 xl:max-w-none">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/90 p-1 shadow-xl shadow-slate-900/[0.06] ring-1 ring-slate-100/80 backdrop-blur-xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
              <div className="p-4 pt-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      {t('timetableSelectedDay', 'Selected day')}
                    </p>
                    <p className="mt-1 text-xl font-bold capitalize tracking-tight text-slate-900 md:text-2xl">
                      {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(localeTag, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-900/25">
                    <CalendarDays className="h-6 w-6" strokeWidth={2} />
                  </span>
                </div>
                <TimetableMiniCalendar
                  localeTag={localeTag}
                  viewYear={viewYear}
                  viewMonth={viewMonth}
                  selectedDate={selectedDate}
                  dayCounts={dayCounts}
                  onPrevMonth={prevMonth}
                  onNextMonth={nextMonth}
                  onSelectDay={selectCalendarDay}
                  title={t('timetableMiniCalTitle', 'Jump to day')}
                  prevLabel={t('timetablePrevMonth', 'Previous month')}
                  nextLabel={t('timetableNextMonth', 'Next month')}
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-5 shadow-lg shadow-slate-900/[0.05] ring-1 ring-slate-100/90 backdrop-blur-xl">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <UserRound className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-700">
                  {t('timetableQueueSummary', 'Summary')}
                </h2>
              </div>
              <div className="mb-4 flex gap-1 rounded-2xl bg-slate-100/90 p-1">
                {([
                  ['today', t('timetableSummaryTabToday', 'Today')],
                  ['pipeline', t('timetableSummaryTabPipeline', 'Pipeline')],
                  ['performance', t('timetableSummaryTabPerformance', 'Performance')],
                ] as Array<[TimetableSummaryTab, string]>).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSummaryTab(tab)}
                    className={`min-h-10 flex-1 rounded-xl px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide transition ${
                      summaryTab === tab
                        ? 'bg-white text-slate-900 shadow-md shadow-slate-900/10 ring-1 ring-slate-200/80'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            {summaryTab === 'today' ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryDate', 'Date')}</span>
                  <strong className="text-slate-900">
                    {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(localeTag, {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
                  </strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryRowsShown', 'Rows shown')}</span>
                  <strong className="text-slate-900">{filteredRows.length}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryNeedsFollowUp', 'Follow-ups due')}</span>
                  <strong className="text-slate-900">{insightStats.dueTodayFollowUps}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryOwner', 'Owner')}</span>
                  <strong className="text-slate-900">{viewerBuyerCode}</strong>
                </div>
              </div>
            ) : null}

            {summaryTab === 'pipeline' ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryWeekTotal', 'Next 7 days')}</span>
                  <strong className="text-slate-900">{insightStats.nextWeekTotal}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryWeekOpen', 'Open in pipeline')}</span>
                  <strong className="text-slate-900">{insightStats.nextWeekOpen}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableStatFollowUp', 'Follow-up')}</span>
                  <strong className="text-slate-900">{insightStats.followUpTotal}</strong>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="mb-1 text-slate-600">{t('timetableSummaryTopAccounts', 'Top accounts')}</p>
                  {insightStats.topCompanyRows.length ? (
                    <ul className="space-y-1">
                      {insightStats.topCompanyRows.map(([company, count]) => (
                        <li key={company} className="flex items-center justify-between text-xs text-slate-700">
                          <span className="line-clamp-1 max-w-[200px]">{company}</span>
                          <strong>{count}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">{t('timetableEmptyRows', 'No timetable rows match the selected filters.')}</p>
                  )}
                </div>
              </div>
            ) : null}

            {summaryTab === 'performance' ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryCallsLogged', 'Calls logged')}</span>
                  <strong className="text-slate-900">{insightStats.calledTotal}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryOffersWon', 'Offers captured')}</span>
                  <strong className="text-slate-900">{insightStats.wonTotal}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-slate-600">{t('timetableSummaryNoTrucks', 'No-truck outcomes')}</span>
                  <strong className="text-slate-900">{insightStats.noTrucksTotal}</strong>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2">
                  <span className="text-emerald-800">{t('timetableSummaryConversion', 'Offer conversion')}</span>
                  <strong className="text-emerald-900">{insightStats.conversionPct}%</strong>
                </div>
              </div>
            ) : null}
            </div>
          </aside>

          <main className="order-3 flex min-h-[50vh] flex-1 flex-col gap-4 xl:order-2 xl:col-span-8">
            <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-4 shadow-xl shadow-slate-900/[0.05] ring-1 ring-slate-100/90 backdrop-blur-xl md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <label className="min-w-0 flex-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {t('timetableSearch', 'Search')}
                  <span className="mt-2 flex h-12 items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 px-4 ring-1 ring-slate-100/80 transition focus-within:border-emerald-300/80 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2} />
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('timetableSearchPlaceholder', 'Company, contact, notes...')}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                  </span>
                </label>
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto lg:shrink-0">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:min-w-[10.5rem]">
                    {t('timetableSelectedDay', 'Selected day')}
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => selectCalendarDay(e.target.value)}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200/90 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreatePanel((prev) => !prev)}
                    className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/25 transition hover:brightness-110 active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" strokeWidth={2.5} />
                    {t('timetableNewSlot', 'New call slot')}
                  </button>
                </div>
              </div>
            </div>

            {showCreatePanel ? (
              <div className="relative overflow-hidden rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 via-white to-white p-5 shadow-xl shadow-emerald-900/10 ring-1 ring-emerald-100/80">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
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

            <div className="rounded-3xl border border-slate-200/90 bg-slate-900/[0.03] p-4 ring-1 ring-slate-200/60 backdrop-blur-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Filter className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                  {t('timetableFiltersTitle', 'Quick filters')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['all_day', t('timetableFilterAllDay', 'All day')],
                    ['open', t('timetableFilterOpen', 'Open')],
                    ['follow_up', t('timetableFilterFollowUp', 'Follow-up')],
                    ['offers', t('timetableFilterOffers', 'Offers')],
                    ['completed', t('timetableFilterCompleted', 'Completed')],
                  ] as Array<[TimetableFilterMode, string]>
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFilterMode(mode)}
                    className={`min-h-10 rounded-full px-4 py-2 text-xs font-bold transition active:scale-[0.98] ${
                      filterMode === mode
                        ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 ring-2 ring-emerald-400/60'
                        : 'border border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">
                  {t('timetableDailyQueue', 'Your queue')}
                  <span className="ml-2 font-mono text-xs font-normal text-slate-500">
                    {filteredRows.length} {t('timetableRowsLabel', 'rows')}
                  </span>
                </p>
              </div>
              <TimetableTable
                rows={filteredRows}
                localeTag={localeTag}
                t={t}
                onOpenCallLog={setCallModalEntry}
                onOpenOffer={setOfferModalEntry}
              />
            </div>
          </main>
        </div>

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
    </div>
  );
}
