import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  ListOrdered,
  Phone,
  Plus,
  Printer,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import type { DepartmentArea } from '../../types/departmentArea';
import { DEPARTMENT_I18N_KEY } from '../../types/departmentArea';
import type { TimetableDbState, TimetableEntry, TimetableFilterMode } from '../../types/timetable';
import {
  addTimetableEntries,
  loadTimetableDb,
  saveTimetableDb,
  upsertTimetableEntry,
} from '../../store/timetableStore';
import { TimetableMiniCalendar } from './TimetableMiniCalendar';

function sortByDateTime(a: TimetableEntry, b: TimetableEntry): number {
  const ta = `${a.datum}T${a.zeit}`;
  const tb = `${b.datum}T${b.zeit}`;
  return ta.localeCompare(tb);
}

export function TimetablePage({ department }: { department?: DepartmentArea }) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [db, setDb] = useState<TimetableDbState>(() => loadTimetableDb());
  const [processor, setProcessor] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rangeFrom, setRangeFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [rangeTo, setRangeTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [filterMode, setFilterMode] = useState<TimetableFilterMode>('day');
  const [showOffersOnly, setShowOffersOnly] = useState(false);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [showNewModal, setShowNewModal] = useState(false);
  const [truckRow, setTruckRow] = useState<TimetableEntry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [newForm, setNewForm] = useState({
    kaArt: 'A',
    zeit: '09:00',
    firmenname: '',
    telefon: '',
    ansprechpartner: '',
    zweck: '',
    bemerkung: '',
  });
  const [truckForm, setTruckForm] = useState({ vehicles: '', qty: '', notes: '' });

  const localeTag =
    language === 'de'
      ? 'de-DE'
      : language === 'fr'
        ? 'fr-FR'
        : language === 'es'
          ? 'es-ES'
          : language === 'it'
            ? 'it-IT'
            : language === 'pt'
              ? 'pt-PT'
              : language === 'tr'
                ? 'tr-TR'
                : language === 'ru'
                  ? 'ru-RU'
                  : language === 'ar'
                    ? 'ar-SA'
                    : language === 'zh'
                      ? 'zh-CN'
                      : language === 'ja'
                        ? 'ja-JP'
                        : language === 'hi'
                          ? 'hi-IN'
                          : 'en-GB';

  useEffect(() => {
    saveTimetableDb(db);
  }, [db]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const processorOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of db.entries) {
      if (e.vp) s.add(e.vp);
    }
    for (const x of ['es', 'tk', 'sf', 'la']) s.add(x);
    return ['', ...[...s].sort((a, b) => a.localeCompare(b))];
  }, [db.entries]);

  const filteredRows = useMemo(() => {
    let list = db.entries.filter((e) => e.datum >= rangeFrom && e.datum <= rangeTo);

    if (processor) {
      list = list.filter((e) => e.vp === processor);
    }

    if (showOffersOnly) {
      list = list.filter((e) => e.kaArt.toUpperCase() === 'KA');
    }

    switch (filterMode) {
      case 'unfinished':
        list = list.filter((e) => !e.erledigt);
        break;
      case 'unfinishedOther':
        list = list.filter((e) => !e.erledigt && (processor ? e.vp !== processor : true));
        break;
      case 'doneNoFollowUp':
        list = list.filter((e) => e.erledigt && !e.hasFollowUp);
        break;
      case 'parked':
        list = list.filter((e) => e.parked);
        break;
      case 'day':
      default:
        list = list.filter((e) => e.datum === selectedDate);
        break;
    }

    return list.slice().sort(sortByDateTime);
  }, [db.entries, filterMode, processor, rangeFrom, rangeTo, selectedDate, showOffersOnly]);

  const heroStats = useMemo(() => {
    const day = db.entries.filter((e) => e.datum === selectedDate);
    return {
      scheduled: day.length,
      open: day.filter((e) => !e.erledigt).length,
      offers: day.filter((e) => e.kaArt.toUpperCase() === 'KA').length,
    };
  }, [db.entries, selectedDate]);

  const filterButtons = useMemo(
    () =>
      [
        { id: 'day' as const, label: t('timetableFilterDayView', 'Selected day') },
        { id: 'unfinished' as const, label: t('timetableFilterUnfinished', 'Open calls') },
        {
          id: 'unfinishedOther' as const,
          label: t('timetableFilterUnfinishedOther', 'Open — other buyer'),
        },
        {
          id: 'doneNoFollowUp' as const,
          label: t('timetableFilterDoneNoFollowUp', 'Done without follow-up'),
        },
        { id: 'parked' as const, label: t('timetableFilterParked', 'Parked') },
      ] as const,
    [t]
  );

  const syncRangeToDay = useCallback((iso: string) => {
    setSelectedDate(iso);
    setRangeFrom(iso);
    setRangeTo(iso);
    const d = new Date(iso + 'T12:00:00');
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, []);

  const onSelectCalendarDay = useCallback(
    (iso: string) => {
      syncRangeToDay(iso);
      setFilterMode('day');
    },
    [syncRangeToDay]
  );

  const prevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  }, [viewMonth]);

  const nextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  }, [viewMonth]);

  const openNewModal = useCallback(() => {
    const defZweck = t('activityCall', 'Call / callback');
    setNewForm({
      kaArt: 'A',
      zeit: '09:00',
      firmenname: '',
      telefon: '',
      ansprechpartner: '',
      zweck: defZweck,
      bemerkung: '',
    });
    setShowNewModal(true);
  }, [t]);

  const submitNew = useCallback(() => {
    const vp = processor || 'es';
    const row: Omit<TimetableEntry, 'id'> = {
      kaArt: newForm.kaArt.trim() || 'A',
      datum: selectedDate,
      zeit: newForm.zeit.trim() || '09:00',
      firmenname: newForm.firmenname.trim() || '—',
      telefon: newForm.telefon.trim(),
      ansprechpartner: newForm.ansprechpartner.trim(),
      zweck: newForm.zweck.trim() || t('activityCall', 'Call / callback'),
      bemerkung: newForm.bemerkung.trim(),
      erledigt: false,
      vp,
      parked: false,
      hasFollowUp: false,
    };
    setDb((prev) => addTimetableEntries(prev, [row]));
    setShowNewModal(false);
    setToast(t('timetableToastSaved', 'Saved.'));
  }, [newForm, processor, selectedDate, t]);

  const submitTruck = useCallback(() => {
    if (!truckRow) return;
    const extra = [
      truckForm.vehicles.trim() && `${t('timetableFieldVehicleTypes', 'Vehicles')}: ${truckForm.vehicles.trim()}`,
      truckForm.qty.trim() && `${t('timetableFieldQuantity', 'Quantity')}: ${truckForm.qty.trim()}`,
      truckForm.notes.trim() && truckForm.notes.trim(),
    ]
      .filter(Boolean)
      .join(' · ');
    const bemerkung = extra ? `${truckRow.bemerkung}\n${extra}`.trim() : truckRow.bemerkung;
    const updated: TimetableEntry = {
      ...truckRow,
      bemerkung,
      hasFollowUp: true,
    };
    setDb((prev) => upsertTimetableEntry(prev, updated));
    setTruckRow(null);
    setTruckForm({ vehicles: '', qty: '', notes: '' });
    setToast(t('timetableToastTruckLogged', 'Truck availability logged.'));
  }, [truckForm, truckRow, t]);

  const toggleDone = useCallback((row: TimetableEntry) => {
    const updated = { ...row, erledigt: !row.erledigt };
    setDb((prev) => upsertTimetableEntry(prev, updated));
  }, []);

  const insertFive = useCallback(() => {
    const vp = processor || 'es';
    const slots = ['08:00', '09:30', '11:00', '13:00', '15:30'];
    const template = (i: number): Omit<TimetableEntry, 'id'> => ({
      kaArt: 'A',
      datum: selectedDate,
      zeit: slots[i] ?? '16:00',
      firmenname: t('timetablePlaceholderCompany', 'New supplier') + ` ${i + 1}`,
      telefon: '',
      ansprechpartner: '',
      zweck: t('activityCall', 'Call / callback'),
      bemerkung: '',
      erledigt: false,
      vp,
      parked: false,
      hasFollowUp: false,
    });
    setDb((prev) => addTimetableEntries(prev, [0, 1, 2, 3, 4].map(template)));
    setToast(t('timetableToastInsertedFive', 'Five draft rows added.'));
  }, [processor, selectedDate, t]);

  const printTable = useCallback(() => {
    window.print();
  }, []);

  const formatDateCell = useCallback(
    (iso: string) =>
      new Date(iso + 'T12:00:00').toLocaleDateString(localeTag, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    [localeTag]
  );

  const greetingName = user?.name?.trim() || t('timetableGreetingFallback', 'there');

  return (
    <div className="timetable-page relative flex min-h-0 flex-1 flex-col overflow-hidden p-4 pb-10 md:p-6 print:bg-white print:p-2">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-slate-50 print:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_120%_80%_at_0%_-20%,rgba(244,63,94,0.12),transparent_50%),radial-gradient(ellipse_90%_60%_at_100%_0%,rgba(99,102,241,0.08),transparent_45%),radial-gradient(ellipse_70%_50%_at_50%_100%,rgba(245,158,11,0.09),transparent_55%)] print:hidden"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] print:hidden [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:32px_32px] md:opacity-25"
        aria-hidden
      />

      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200/80 bg-emerald-50/95 px-4 py-3 text-sm font-medium text-emerald-900 shadow-2xl shadow-emerald-900/10 ring-1 ring-emerald-100/80 backdrop-blur-md print:hidden"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <header className="relative mb-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-rose-950 to-slate-900 p-5 shadow-2xl shadow-rose-950/30 ring-1 ring-white/10 md:mb-6 md:p-8 print:hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.04)_45%,transparent_50%)]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-0 h-px w-1/3 bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="min-w-0 flex-1 lg:border-l-2 lg:border-amber-400/50 lg:pl-6">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90 ring-1 ring-white/10 backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" strokeWidth={2} />
              {t('timetableBadgePurchase', 'Purchase desk')}
            </div>
            <h1 className="text-balance text-2xl font-bold tracking-tight text-white md:text-4xl md:leading-tight">
              {t('timetablePageTitle', 'Call timetable')}
            </h1>
            <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-slate-300 md:text-base">
              {t('timetableGreeting', 'Hello, {name} — plan supplier calls and capture truck leads in one place.').replace(
                '{name}',
                greetingName
              )}
            </p>
            {department ? (
              <p className="mt-3 text-xs font-medium text-slate-400">
                {t('customersArea', 'Area')}:{' '}
                <span className="text-white">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
              </p>
            ) : null}
            <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-md sm:gap-3">
              {[
                { v: heroStats.scheduled, label: t('timetableHeroStatScheduled', 'Scheduled today') },
                { v: heroStats.open, label: t('timetableHeroStatOpen', 'Open') },
                { v: heroStats.offers, label: t('timetableHeroStatOffers', 'Offers') },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-center ring-1 ring-white/5 backdrop-blur-md transition hover:bg-white/[0.07]"
                >
                  <p className="text-2xl font-semibold tabular-nums tracking-tight text-white md:text-3xl">{s.v}</p>
                  <p className="mt-1 text-[10px] font-medium uppercase leading-tight tracking-wide text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-4 ring-1 ring-white/5 backdrop-blur-md md:w-full md:max-w-xs lg:min-w-[240px]">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/70">
              {t('timetableProcessingPerson', 'Buyer / processor')}
            </label>
            <select
              value={processor}
              onChange={(e) => setProcessor(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/15 bg-white px-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            >
              <option value="">{t('timetableAllProcessors', 'Everyone')}</option>
              {processorOptions
                .filter(Boolean)
                .map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
            </select>
            <p className="text-[11px] leading-snug text-slate-400">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(localeTag, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </header>

      <div className="relative z-0 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,240px)_1fr_minmax(0,300px)] print:grid-cols-1">
        <aside className="flex flex-col gap-3 print:hidden">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100/80 backdrop-blur-xl">
            <p className="mb-4 border-l-4 border-rose-500 pl-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              {t('timetableActionsTitle', 'Actions')}
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={openNewModal}
                className="group flex h-11 items-center gap-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 px-3 text-sm font-semibold text-white shadow-lg shadow-rose-900/25 transition active:scale-[0.98] hover:shadow-xl hover:shadow-rose-900/30"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20 transition group-hover:bg-white/25">
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <span className="text-left">{t('timetableNewAppointment', 'New call slot')}</span>
              </button>
              <button
                type="button"
                onClick={printTable}
                className="group flex h-11 items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white active:scale-[0.98]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/60 text-slate-700 transition group-hover:bg-slate-200">
                  <Printer className="h-4 w-4" />
                </span>
                {t('timetablePrint', 'Print list')}
              </button>
              <button
                type="button"
                onClick={insertFive}
                className="group flex h-11 items-center gap-3 rounded-xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-orange-50/80 px-3 text-sm font-semibold text-amber-950 transition hover:border-amber-300 active:scale-[0.98]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200/50 text-amber-900">
                  <ListOrdered className="h-4 w-4" />
                </span>
                {t('timetableInsertFive', 'Insert five drafts')}
              </button>
              <button
                type="button"
                onClick={() => setToast(t('timetableToastMoveSoon', 'Bulk move is coming soon.'))}
                className="group flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <ClipboardList className="h-4 w-4" />
                </span>
                {t('timetableMoveInList', 'Move in list')}
              </button>
              <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-xl border border-violet-200/60 bg-violet-50/40 px-3 py-3 text-sm font-medium text-violet-950 transition hover:bg-violet-50/70">
                <input
                  type="checkbox"
                  checked={showOffersOnly}
                  onChange={(e) => setShowOffersOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-violet-300 text-violet-600 focus:ring-violet-500"
                />
                {t('timetableShowOffers', 'Offers only (KA)')}
              </label>
            </div>
          </div>
        </aside>

        <section className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-xl shadow-slate-900/[0.06] ring-1 ring-slate-100/90 backdrop-blur-xl print:border print:shadow-none">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-rose-50/30 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-600 to-rose-800 text-white shadow-md shadow-rose-900/25">
                <CalendarDays className="h-5 w-5" strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900 md:text-lg">
                  {t('timetableDailyOverview', 'Daily overview')}
                </h2>
                <p className="text-xs text-slate-500">{t('timetableTableToolbarHint', 'Sorted by time · tap Done to toggle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold tabular-nums text-white shadow-md">
                {t('timetableAppointmentCount', 'Rows: {n}').replace('{n}', String(filteredRows.length))}
              </span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm print:min-w-0">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-900 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300 shadow-sm">
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColKaArt', 'Type')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColDate', 'Date')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColTime', 'Time')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColCompany', 'Company')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColPhone', 'Phone')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColContact', 'Contact')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColPurpose', 'Purpose')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColRemark', 'Notes')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColDone', 'Done')}</th>
                  <th className="px-3 py-3.5 font-semibold">{t('timetableColVp', 'Buyer')}</th>
                  <th className="px-3 py-3.5 print:hidden">{t('timetableColActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-16 text-center">
                      <p className="mx-auto max-w-sm text-sm font-medium text-slate-500">
                        {t('timetableEmpty', 'No rows for this view. Add a call or widen the date range.')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const isKa = row.kaArt.toUpperCase() === 'KA';
                    const accentOpen = !row.erledigt;
                    return (
                      <tr
                        key={row.id}
                        className={`group border-b border-slate-100/90 transition-colors duration-150 hover:bg-gradient-to-r hover:from-rose-50/50 hover:to-transparent ${
                          accentOpen ? 'border-l-[3px] border-l-amber-400 hover:border-l-amber-500' : 'border-l-[3px] border-l-transparent'
                        } ${row.parked ? 'bg-violet-50/25' : ''}`}
                      >
                        <td className="px-3 py-3 align-middle">
                          <span
                            className={`inline-flex rounded-lg bg-gradient-to-br px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-white shadow-sm ${
                              isKa ? 'from-violet-600 to-indigo-700' : 'from-sky-500 to-blue-700'
                            }`}
                          >
                            {row.kaArt}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600 tabular-nums">{formatDateCell(row.datum)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-slate-900">{row.zeit}</td>
                        <td className="max-w-[200px] px-3 py-3 font-semibold text-slate-900 break-words">{row.firmenname}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600 tabular-nums">{row.telefon || '—'}</td>
                        <td className="max-w-[140px] px-3 py-3 text-slate-700 break-words">{row.ansprechpartner || '—'}</td>
                        <td className="max-w-[120px] px-3 py-3 text-slate-600 break-words">{row.zweck}</td>
                        <td className="max-w-md px-3 py-3 text-sm leading-relaxed text-slate-600 break-words whitespace-pre-wrap">
                          {row.bemerkung}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <button
                            type="button"
                            onClick={() => toggleDone(row)}
                            className={`rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                              row.erledigt
                                ? 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-300/80 hover:bg-emerald-500/25'
                                : 'bg-amber-400/20 text-amber-950 ring-1 ring-amber-400/60 hover:bg-amber-400/30'
                            }`}
                          >
                            {row.erledigt ? t('timetableDoneYes', 'Yes') : t('timetableDoneNo', 'No')}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-800 ring-1 ring-slate-200/80">
                            {row.vp}
                          </span>
                        </td>
                        <td className="px-3 py-3 print:hidden">
                          <div className="flex flex-wrap gap-1.5 opacity-90 transition group-hover:opacity-100">
                            {row.telefon ? (
                              <a
                                href={`tel:${row.telefon.replace(/\s/g, '')}`}
                                className="inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl bg-slate-100 px-2 text-slate-700 ring-1 ring-slate-200/80 transition hover:bg-slate-200 hover:ring-slate-300"
                                title={t('timetableRowCall', 'Call')}
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => {
                                setTruckRow(row);
                                setTruckForm({ vehicles: '', qty: '', notes: '' });
                              }}
                              className="inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 px-2.5 text-xs font-bold text-white shadow-md shadow-orange-900/20 transition hover:brightness-105 active:scale-[0.97]"
                            >
                              <Truck className="h-3.5 w-3.5" strokeWidth={2.5} />
                              {t('timetableRowTrucks', 'Trucks')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="flex flex-col gap-3 print:hidden">
          <div className="rounded-2xl border border-slate-200/90 bg-white/85 p-4 shadow-lg shadow-slate-900/5 ring-1 ring-slate-100/80 backdrop-blur-xl">
            <p className="mb-3 border-l-4 border-indigo-500 pl-3 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              {t('timetableFiltersTitle', 'Quick filters')}
            </p>
            <div className="flex flex-col gap-2">
              {filterButtons.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setFilterMode(b.id)}
                  className={`relative min-h-11 overflow-hidden rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition active:scale-[0.99] ${
                    filterMode === b.id
                      ? 'bg-gradient-to-r from-slate-900 via-rose-900 to-slate-900 text-white shadow-lg shadow-slate-900/25 ring-1 ring-white/10'
                      : 'border border-slate-200/90 bg-slate-50/80 text-slate-800 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {filterMode === b.id ? (
                    <span className="absolute right-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                  ) : null}
                  <span className="pr-4">{b.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40 p-4 shadow-lg shadow-amber-900/10 ring-1 ring-amber-100/60 backdrop-blur-xl">
            <p className="mb-3 border-l-4 border-amber-500 pl-3 text-xs font-bold uppercase tracking-[0.15em] text-amber-900/80">
              {t('timetableRangeTitle', 'Date range')}
            </p>
            <div className="mb-3 grid grid-cols-1 gap-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900/60">
                {t('timetableDateFrom', 'From')}
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-amber-200/90 bg-white/95 px-3 text-sm font-medium text-slate-900 shadow-inner shadow-amber-900/5 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-amber-900/60">
                {t('timetableDateTo', 'To')}
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="mt-1.5 h-11 w-full rounded-xl border border-amber-200/90 bg-white/95 px-3 text-sm font-medium text-slate-900 shadow-inner shadow-amber-900/5 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                />
              </label>
            </div>
            <TimetableMiniCalendar
              localeTag={localeTag}
              viewYear={viewYear}
              viewMonth={viewMonth}
              selectedDate={selectedDate}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onSelectDay={onSelectCalendarDay}
              titleLabel={t('timetableMiniCalTitle', 'Jump to day')}
              prevLabel={t('timetablePrevMonth', 'Previous month')}
              nextLabel={t('timetableNextMonth', 'Next month')}
            />
          </div>
        </aside>
      </div>

      {showNewModal ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-md sm:items-center print:hidden"
          role="dialog"
          aria-modal
          aria-labelledby="timetable-new-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/30 ring-1 ring-white/60 md:p-0">
            <div className="h-1.5 bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500" />
            <div className="p-5 md:p-6">
              <h3 id="timetable-new-title" className="text-xl font-bold tracking-tight text-slate-900">
                {t('timetableModalNewTitle', 'New call slot')}
              </h3>
              <p className="mt-1 text-sm font-medium text-slate-500">{formatDateCell(selectedDate)}</p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('timetableColKaArt', 'Type')}
                  <input
                    value={newForm.kaArt}
                    onChange={(e) => setNewForm((f) => ({ ...f, kaArt: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium transition focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('timetableColTime', 'Time')}
                  <input
                    type="time"
                    value={newForm.zeit}
                    onChange={(e) => setNewForm((f) => ({ ...f, zeit: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium transition focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </label>
                <label className="col-span-1 text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  {t('timetableColCompany', 'Company')}
                  <input
                    value={newForm.firmenname}
                    onChange={(e) => setNewForm((f) => ({ ...f, firmenname: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium transition focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('timetableColPhone', 'Phone')}
                  <input
                    value={newForm.telefon}
                    onChange={(e) => setNewForm((f) => ({ ...f, telefon: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium transition focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('timetableColContact', 'Contact')}
                  <input
                    value={newForm.ansprechpartner}
                    onChange={(e) => setNewForm((f) => ({ ...f, ansprechpartner: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium transition focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </label>
                <label className="col-span-1 text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  {t('timetableColPurpose', 'Purpose')}
                  <input
                    value={newForm.zweck}
                    onChange={(e) => setNewForm((f) => ({ ...f, zweck: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-medium transition focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </label>
                <label className="col-span-1 text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2">
                  {t('timetableColRemark', 'Notes')}
                  <textarea
                    value={newForm.bemerkung}
                    onChange={(e) => setNewForm((f) => ({ ...f, bemerkung: e.target.value }))}
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm transition focus:border-rose-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('commonCancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={submitNew}
                  className="h-11 rounded-xl bg-gradient-to-r from-rose-600 to-rose-800 px-6 text-sm font-bold text-white shadow-lg shadow-rose-900/30 transition hover:brightness-105 active:scale-[0.98]"
                >
                  {t('commonSave', 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {truckRow ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-md sm:items-center print:hidden"
          role="dialog"
          aria-modal
          aria-labelledby="timetable-truck-title"
        >
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-amber-200/60 bg-gradient-to-b from-white via-amber-50/30 to-orange-50/40 shadow-2xl shadow-amber-900/20 ring-1 ring-amber-100/50">
            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600" />
            <div className="p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-orange-900/25">
                  <Truck className="h-6 w-6" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <h3 id="timetable-truck-title" className="text-xl font-bold tracking-tight text-slate-900">
                    {t('timetableModalTruckTitle', 'Trucks available')}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    {truckRow.firmenname} · {formatDateCell(truckRow.datum)} {truckRow.zeit}
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-sm text-amber-950/90">
                {t('timetableTruckHint', 'Capture what they offered — it is appended to notes.')}
              </p>
              <div className="mt-5 space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('timetableFieldVehicleTypes', 'Vehicles (e.g. 2× Transit, 1× 18t)')}
                  <input
                    value={truckForm.vehicles}
                    onChange={(e) => setTruckForm((f) => ({ ...f, vehicles: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-amber-200/90 bg-white px-3 text-sm font-medium shadow-inner shadow-amber-900/5 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('timetableFieldQuantity', 'Quantity / units')}
                  <input
                    value={truckForm.qty}
                    onChange={(e) => setTruckForm((f) => ({ ...f, qty: e.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border border-amber-200/90 bg-white px-3 text-sm font-medium shadow-inner shadow-amber-900/5 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                  />
                </label>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('timetableFieldNotes', 'Extra notes')}
                  <textarea
                    value={truckForm.notes}
                    onChange={(e) => setTruckForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="mt-1.5 w-full rounded-xl border border-amber-200/90 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25"
                  />
                </label>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-amber-200/40 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setTruckRow(null)}
                  className="h-11 rounded-xl border border-slate-200 bg-white/80 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t('commonCancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={submitTruck}
                  className="h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 text-sm font-bold text-white shadow-lg shadow-orange-900/25 transition hover:brightness-105 active:scale-[0.98]"
                >
                  {t('commonSave', 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
