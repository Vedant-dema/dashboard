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
    <div className="timetable-page flex min-h-0 flex-1 flex-col bg-gradient-to-b from-slate-50 via-rose-50/40 to-amber-50/30 p-4 pb-10 md:p-6 print:bg-white print:p-2">
      {toast ? (
        <div
          className="fixed bottom-6 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg print:hidden"
          role="status"
        >
          {toast}
        </div>
      ) : null}

      <header className="relative mb-6 overflow-hidden rounded-3xl border border-rose-200/60 bg-gradient-to-br from-rose-950 via-rose-900 to-amber-950 p-5 shadow-xl shadow-rose-950/25 md:p-8 print:hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-rose-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100/90 ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              {t('timetableBadgePurchase', 'Purchase desk')}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              {t('timetablePageTitle', 'Call timetable')}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-rose-100/90">
              {t('timetableGreeting', 'Hello, {name} — plan supplier calls and capture truck leads in one place.').replace(
                '{name}',
                greetingName
              )}
            </p>
            {department ? (
              <p className="mt-2 text-xs text-rose-200/80">
                {t('customersArea', 'Area')}:{' '}
                <span className="font-semibold text-white">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2 rounded-2xl bg-black/20 p-4 ring-1 ring-white/10 backdrop-blur-sm md:min-w-[220px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-amber-100/80">
              {t('timetableProcessingPerson', 'Buyer / processor')}
            </label>
            <select
              value={processor}
              onChange={(e) => setProcessor(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/20 bg-white/95 px-3 text-sm font-medium text-rose-950 shadow-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
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
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,220px)_1fr_minmax(0,280px)] print:grid-cols-1">
        <aside className="flex flex-col gap-3 print:hidden">
          <div className="rounded-2xl border border-rose-200/60 bg-white/90 p-4 shadow-md shadow-rose-900/5 backdrop-blur-sm">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-rose-800/80">
              {t('timetableActionsTitle', 'Actions')}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={openNewModal}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 transition hover:from-rose-600 hover:to-rose-700"
              >
                <Plus className="h-4 w-4" />
                {t('timetableNewAppointment', 'New call slot')}
              </button>
              <button
                type="button"
                onClick={printTable}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
              >
                <Printer className="h-4 w-4" />
                {t('timetablePrint', 'Print list')}
              </button>
              <button
                type="button"
                onClick={insertFive}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50/90 text-sm font-semibold text-amber-950 transition hover:bg-amber-100"
              >
                <ListOrdered className="h-4 w-4" />
                {t('timetableInsertFive', 'Insert five drafts')}
              </button>
              <button
                type="button"
                onClick={() => setToast(t('timetableToastMoveSoon', 'Bulk move is coming soon.'))}
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ClipboardList className="h-4 w-4" />
                {t('timetableMoveInList', 'Move in list')}
              </button>
              <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2.5 text-sm font-medium text-rose-900">
                <input
                  type="checkbox"
                  checked={showOffersOnly}
                  onChange={(e) => setShowOffersOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-rose-300 text-rose-700 focus:ring-rose-500"
                />
                {t('timetableShowOffers', 'Offers only (KA)')}
              </label>
            </div>
          </div>
        </aside>

        <section className="glass-card flex min-h-[320px] flex-1 flex-col overflow-hidden border-rose-100/80 shadow-rose-900/10 print:border print:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-100/80 bg-gradient-to-r from-white to-rose-50/40 px-4 py-3 print:hidden">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-rose-700" />
              <h2 className="text-lg font-bold text-slate-800">
                {t('timetableDailyOverview', 'Daily overview')}
              </h2>
            </div>
            <p className="text-sm font-semibold text-rose-800">
              {t('timetableAppointmentCount', 'Rows: {n}').replace('{n}', String(filteredRows.length))}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
            <table className="min-w-[900px] w-full border-collapse text-left text-sm print:min-w-0">
              <thead>
                <tr className="sticky top-0 z-10 bg-rose-950/[0.06] text-xs font-bold uppercase tracking-wide text-rose-900/80 backdrop-blur-sm">
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColKaArt', 'Type')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColDate', 'Date')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColTime', 'Time')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColCompany', 'Company')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColPhone', 'Phone')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColContact', 'Contact')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColPurpose', 'Purpose')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColRemark', 'Notes')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColDone', 'Done')}</th>
                  <th className="border-b border-rose-100 px-3 py-3">{t('timetableColVp', 'Buyer')}</th>
                  <th className="border-b border-rose-100 px-3 py-3 print:hidden">{t('timetableColActions', 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                      {t('timetableEmpty', 'No rows for this view. Add a call or widen the date range.')}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-rose-50/80 transition hover:bg-rose-50/40 odd:bg-white/60"
                    >
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-700">
                          {row.kaArt}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{formatDateCell(row.datum)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">{row.zeit}</td>
                      <td className="max-w-[200px] px-3 py-2.5 font-medium text-slate-900 break-words">{row.firmenname}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{row.telefon || '—'}</td>
                      <td className="max-w-[140px] px-3 py-2.5 text-slate-700 break-words">{row.ansprechpartner || '—'}</td>
                      <td className="max-w-[120px] px-3 py-2.5 text-slate-700 break-words">{row.zweck}</td>
                      <td className="max-w-md px-3 py-2.5 text-slate-600 break-words whitespace-pre-wrap">{row.bemerkung}</td>
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleDone(row)}
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            row.erledigt
                              ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                              : 'bg-amber-100 text-amber-900 ring-1 ring-amber-200'
                          }`}
                        >
                          {row.erledigt ? t('timetableDoneYes', 'Yes') : t('timetableDoneNo', 'No')}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 font-semibold uppercase text-rose-800">{row.vp}</td>
                      <td className="px-3 py-2.5 print:hidden">
                        <div className="flex flex-wrap gap-1">
                          {row.telefon ? (
                            <a
                              href={`tel:${row.telefon.replace(/\s/g, '')}`}
                              className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 px-2 text-slate-700 hover:bg-slate-200"
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
                            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-amber-600 to-rose-700 px-2 text-xs font-semibold text-white shadow-sm hover:from-amber-500 hover:to-rose-600"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            {t('timetableRowTrucks', 'Trucks')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="flex flex-col gap-3 print:hidden">
          <div className="rounded-2xl border border-rose-200/60 bg-white/90 p-4 shadow-md shadow-rose-900/5 backdrop-blur-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-rose-800/80">
              {t('timetableFiltersTitle', 'Quick filters')}
            </p>
            <div className="flex flex-col gap-2">
              {filterButtons.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setFilterMode(b.id)}
                  className={`min-h-11 rounded-xl px-3 py-2 text-left text-sm font-semibold transition ${
                    filterMode === b.id
                      ? 'bg-gradient-to-r from-rose-700 to-amber-800 text-white shadow-md shadow-rose-900/20'
                      : 'border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200/50 bg-gradient-to-b from-amber-50/90 to-white p-4 shadow-md shadow-amber-900/5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-900/90">
              {t('timetableRangeTitle', 'Date range')}
            </p>
            <div className="mb-3 grid grid-cols-1 gap-2">
              <label className="block text-[10px] font-semibold text-amber-900/70">
                {t('timetableDateFrom', 'From')}
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-amber-200/80 bg-white px-2 text-sm"
                />
              </label>
              <label className="block text-[10px] font-semibold text-amber-900/70">
                {t('timetableDateTo', 'To')}
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="mt-1 h-11 w-full rounded-xl border border-amber-200/80 bg-white px-2 text-sm"
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
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center print:hidden"
          role="dialog"
          aria-modal
          aria-labelledby="timetable-new-title"
        >
          <div className="w-full max-w-lg rounded-3xl border border-rose-100 bg-white p-5 shadow-2xl shadow-rose-950/20 md:p-6">
            <h3 id="timetable-new-title" className="text-lg font-bold text-slate-900">
              {t('timetableModalNewTitle', 'New call slot')}
            </h3>
            <p className="mt-1 text-sm text-slate-500">{formatDateCell(selectedDate)}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">
                {t('timetableColKaArt', 'Type')}
                <input
                  value={newForm.kaArt}
                  onChange={(e) => setNewForm((f) => ({ ...f, kaArt: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                {t('timetableColTime', 'Time')}
                <input
                  type="time"
                  value={newForm.zeit}
                  onChange={(e) => setNewForm((f) => ({ ...f, zeit: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="col-span-1 text-xs font-semibold text-slate-600 sm:col-span-2">
                {t('timetableColCompany', 'Company')}
                <input
                  value={newForm.firmenname}
                  onChange={(e) => setNewForm((f) => ({ ...f, firmenname: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                {t('timetableColPhone', 'Phone')}
                <input
                  value={newForm.telefon}
                  onChange={(e) => setNewForm((f) => ({ ...f, telefon: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                {t('timetableColContact', 'Contact')}
                <input
                  value={newForm.ansprechpartner}
                  onChange={(e) => setNewForm((f) => ({ ...f, ansprechpartner: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="col-span-1 text-xs font-semibold text-slate-600 sm:col-span-2">
                {t('timetableColPurpose', 'Purpose')}
                <input
                  value={newForm.zweck}
                  onChange={(e) => setNewForm((f) => ({ ...f, zweck: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              <label className="col-span-1 text-xs font-semibold text-slate-600 sm:col-span-2">
                {t('timetableColRemark', 'Notes')}
                <textarea
                  value={newForm.bemerkung}
                  onChange={(e) => setNewForm((f) => ({ ...f, bemerkung: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('commonCancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={submitNew}
                className="h-11 rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 px-5 text-sm font-semibold text-white shadow-lg shadow-rose-900/25 hover:from-rose-600 hover:to-rose-700"
              >
                {t('commonSave', 'Save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {truckRow ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center print:hidden"
          role="dialog"
          aria-modal
          aria-labelledby="timetable-truck-title"
        >
          <div className="w-full max-w-lg rounded-3xl border border-amber-100 bg-gradient-to-b from-white to-amber-50/40 p-5 shadow-2xl md:p-6">
            <h3 id="timetable-truck-title" className="text-lg font-bold text-slate-900">
              {t('timetableModalTruckTitle', 'Trucks available')}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {truckRow.firmenname} · {formatDateCell(truckRow.datum)} {truckRow.zeit}
            </p>
            <p className="mt-2 text-sm text-amber-900/80">{t('timetableTruckHint', 'Capture what they offered — it is appended to notes.')}</p>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-slate-600">
                {t('timetableFieldVehicleTypes', 'Vehicles (e.g. 2× Transit, 1× 18t)')}
                <input
                  value={truckForm.vehicles}
                  onChange={(e) => setTruckForm((f) => ({ ...f, vehicles: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                {t('timetableFieldQuantity', 'Quantity / units')}
                <input
                  value={truckForm.qty}
                  onChange={(e) => setTruckForm((f) => ({ ...f, qty: e.target.value }))}
                  className="mt-1 h-11 w-full rounded-xl border border-amber-200 bg-white px-3 text-sm"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                {t('timetableFieldNotes', 'Extra notes')}
                <textarea
                  value={truckForm.notes}
                  onChange={(e) => setTruckForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setTruckRow(null)}
                className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('commonCancel', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={submitTruck}
                className="h-11 rounded-xl bg-gradient-to-r from-amber-600 to-rose-700 px-5 text-sm font-semibold text-white shadow-lg hover:from-amber-500 hover:to-rose-600"
              >
                {t('commonSave', 'Save')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
