import { useEffect, useRef, useState } from 'react';
import { CalendarPlus, Plus, Trash2, X } from 'lucide-react';
import type {
  TimetableAppointmentHistoryRow,
  TimetableContactPerson,
  TimetableEntry,
} from '../../../types/timetable';
import { commitAsciiNormalized } from '../../../common/utils/commitAsciiNormalized';
import {
  transliterateToAscii,
  transliterateToAsciiMultiline,
} from '../../../common/utils/transliterateToAscii';
import { emptyAppointmentRow, emptyContactPerson, ensureProfile } from '../contactDrawerFormUtils';
import { normalizePhoneValue } from '../../../features/customers/mappers/customerFormMapper';
import {
  customerModalKontaktInputClass,
  customerModalKontaktLabelClass,
  customerModalKontaktNewBtnClass,
  customerModalKundeSectionTitleClass,
} from '../contactDrawerFormClasses';

const KONTAKT_COLORS: { dotActive: string; activePill: string }[] = [
  { dotActive: 'bg-slate-500', activePill: 'bg-slate-700' },
  { dotActive: 'bg-slate-500', activePill: 'bg-slate-700' },
  { dotActive: 'bg-slate-500', activePill: 'bg-slate-700' },
  { dotActive: 'bg-slate-500', activePill: 'bg-slate-700' },
  { dotActive: 'bg-slate-500', activePill: 'bg-slate-700' },
  { dotActive: 'bg-slate-500', activePill: 'bg-slate-700' },
  { dotActive: 'bg-slate-500', activePill: 'bg-slate-700' },
  { dotActive: 'bg-slate-500', activePill: 'bg-slate-700' },
];

export type TimetableExtraKontakteBlockProps = {
  contacts: TimetableContactPerson[] | undefined;
  patchDraft: (updater: (prev: TimetableEntry) => TimetableEntry) => void;
  t: (key: string, fallback: string) => string;
  /** Optional id prefix for form fields (overview vs wide form). */
  fieldIdPrefix: string;
  /** Section heading row (title + New) — hide when the parent shell already provides the title (e.g. `OverviewPanel`). */
  showSectionToolbar?: boolean;
  /** When `showSectionToolbar` is false: show only a right-aligned “New” row under the parent title. */
  showEmbeddedAddRow?: boolean;
  /** Section heading class when `showSectionToolbar` is true. */
  sectionTitleClassName?: string;
  /** Optional BEM suffix for column title (e.g. `--2`); defaults to `--3`. */
  sectionTitleColSuffix?: string;
  /** Parent increments after adding a contact from an external header — focus last pill. */
  appendFocusTick?: number;
  /** When true: second “Termine” card under the contact card, matching `CustomersPage` / edit customer modal. */
  showCustomersStyleAppointments?: boolean;
  /** Current `contact_profile.appointment_history` (read-only slice from parent draft). */
  appointmentHistory?: TimetableAppointmentHistoryRow[];
};

export function TimetableExtraKontakteBlock({
  contacts,
  patchDraft,
  t,
  fieldIdPrefix,
  showSectionToolbar = true,
  showEmbeddedAddRow = true,
  sectionTitleClassName = customerModalKundeSectionTitleClass,
  sectionTitleColSuffix = '--3',
  appendFocusTick,
  showCustomersStyleAppointments = false,
  appointmentHistory,
}: TimetableExtraKontakteBlockProps) {
  const list = contacts ?? [];
  const [activeIdx, setActiveIdx] = useState(0);
  const appendTickRef = useRef<number | undefined>(undefined);
  const [terminFormOpen, setTerminFormOpen] = useState(false);
  const [terminDatum, setTerminDatum] = useState('');
  const [terminZeit, setTerminZeit] = useState('');
  const [terminZweck, setTerminZweck] = useState('');
  const termine = appointmentHistory ?? [];

  useEffect(() => {
    setActiveIdx((i) => {
      if (list.length === 0) return 0;
      return Math.min(Math.max(0, i), list.length - 1);
    });
  }, [list.length]);

  useEffect(() => {
    if (appendFocusTick === undefined) return;
    if (appendFocusTick <= 0) {
      appendTickRef.current = appendFocusTick;
      return;
    }
    if (appendTickRef.current !== appendFocusTick && list.length > 0) {
      setActiveIdx(list.length - 1);
      appendTickRef.current = appendFocusTick;
    }
  }, [appendFocusTick, list.length]);

  const safeIdx = list.length ? Math.min(activeIdx, list.length - 1) : 0;
  const k = list[safeIdx];

  const updateAt = (idx: number, patch: Partial<TimetableContactPerson>) => {
    patchDraft((prev) => {
      const pr = ensureProfile(prev);
      const next = [...(pr.contacts ?? [])];
      const cur = next[idx];
      if (!cur) return prev;
      next[idx] = { ...cur, ...patch };
      return { ...prev, contact_profile: { ...pr, contacts: next } };
    });
  };

  const addContact = () => {
    const newIdx = list.length;
    patchDraft((prev) => {
      const pr = ensureProfile(prev);
      const next = [...(pr.contacts ?? []), emptyContactPerson()];
      return { ...prev, contact_profile: { ...pr, contacts: next } };
    });
    setActiveIdx(newIdx);
  };

  const patchAppointmentHistory = (nextList: TimetableAppointmentHistoryRow[]) => {
    patchDraft((prev) => {
      const pr = ensureProfile(prev);
      return {
        ...prev,
        contact_profile: {
          ...pr,
          appointment_history: nextList.length ? nextList : undefined,
        },
      };
    });
  };

  const handleAddTermin = () => {
    if (!terminDatum || !terminZweck.trim()) return;
    const row: TimetableAppointmentHistoryRow = {
      ...emptyAppointmentRow(),
      date: terminDatum,
      time: terminZeit,
      purpose: terminZweck.trim(),
    };
    patchAppointmentHistory([...termine, row]);
    setTerminFormOpen(false);
    setTerminDatum('');
    setTerminZeit('');
    setTerminZweck('');
  };

  return (
    <div className="flex flex-col gap-3">
      {showSectionToolbar ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p
              className={`${sectionTitleClassName} customers-modal-genz-kunde-col-title${sectionTitleColSuffix}`}
            >
              {t('customerModalColKontakt', 'Contact person')}
            </p>
          </div>
          <button type="button" onClick={addContact} className={customerModalKontaktNewBtnClass}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t('newCustomerKontaktNewBtn', 'New')}
          </button>
        </div>
      ) : showEmbeddedAddRow ? (
        <div className="flex justify-end">
          <button type="button" onClick={addContact} className={customerModalKontaktNewBtnClass}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {t('newCustomerKontaktNewBtn', 'New')}
          </button>
        </div>
      ) : null}

      {list.length === 0 ? (
        <p className="text-xs leading-relaxed text-slate-500">
          {t('timetableContactNoExtraContacts', 'None')}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {list.map((c, i) => {
              const dc = KONTAKT_COLORS[i % KONTAKT_COLORS.length]!;
              const isActive = i === safeIdx;
              const label =
                c.name || t('newCustomerKontaktDefaultLabel', 'Contact {n}').replace('{n}', String(i + 1));
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                    isActive
                      ? `${dc.activePill} text-white shadow-sm`
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white/60' : dc.dotActive}`} />
                  <span className="max-w-[10rem] truncate">{label}</span>
                </button>
              );
            })}
          </div>

          {k ? (
            <div className="customers-modal-genz-kontakt-nested-card overflow-hidden rounded-2xl border border-white/60">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      KONTAKT_COLORS[safeIdx % KONTAKT_COLORS.length]!.activePill
                    }`}
                  >
                    {k.name
                      ? k.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      : String(safeIdx + 1)}
                  </div>
                  <span className="truncate text-sm font-semibold text-slate-700">
                    {k.name ||
                      t('newCustomerKontaktDefaultLabel', 'Contact {n}').replace('{n}', String(safeIdx + 1))}
                  </span>
                </div>
                {list.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      patchDraft((prev) => {
                        const pr = ensureProfile(prev);
                        const next = (pr.contacts ?? []).filter((_, i) => i !== safeIdx);
                        return { ...prev, contact_profile: { ...pr, contacts: next } };
                      });
                      setActiveIdx(Math.max(0, safeIdx - 1));
                    }}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title={t('newCustomerKontaktRemove', 'Remove contact')}
                    aria-label={t('newCustomerKontaktRemove', 'Remove contact')}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>

              <div className="space-y-2 p-3">
                <div>
                  <label className={customerModalKontaktLabelClass} htmlFor={`${fieldIdPrefix}-name-${k.id}`}>
                    {t('newCustomerLabelName', 'Name')}
                    {safeIdx === 0 ? <span className="text-red-500"> *</span> : null}
                  </label>
                  <input
                    id={`${fieldIdPrefix}-name-${k.id}`}
                    type="text"
                    value={k.name}
                    onChange={(e) => updateAt(safeIdx, { name: e.target.value })}
                    onBlur={(e) =>
                      commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                        updateAt(safeIdx, { name: v })
                      )
                    }
                    onCompositionEnd={(e) =>
                      commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                        updateAt(safeIdx, { name: v })
                      )
                    }
                    className={customerModalKontaktInputClass}
                    placeholder={t('newCustomerNamePh', 'First and last name')}
                  />
                </div>

                <div>
                  <label className={customerModalKontaktLabelClass} htmlFor={`${fieldIdPrefix}-rolle-${k.id}`}>
                    {t('newCustomerLabelRolle', 'Function / Role')}
                  </label>
                  <select
                    id={`${fieldIdPrefix}-rolle-${k.id}`}
                    value={k.rolle}
                    onChange={(e) => updateAt(safeIdx, { rolle: e.target.value })}
                    className="h-9 w-full rounded border border-neutral-300 bg-white px-2.5 text-sm text-slate-700 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
                  >
                    <option value="">{t('newCustomerRolleDefault', '— Select role —')}</option>
                    <option value="Geschäftsführer">Geschäftsführer / Geschäftsführerin</option>
                    <option value="Prokurist">Prokurist / Prokuristin</option>
                    <option value="Fuhrparkleiter">Fuhrparkleiter / -leiterin</option>
                    <option value="Disponent">Disponent / Disponentin</option>
                    <option value="Verkaufsleiter">Verkaufsleiter / -leiterin</option>
                    <option value="Einkäufer">Einkäufer / Einkäuferin</option>
                    <option value="Buchhalter">Buchhalter / Buchhalterin</option>
                    <option value="Werkstattleiter">Werkstattleiter / -leiterin</option>
                    <option value="Fahrer">Fahrer / Fahrerin</option>
                    <option value="Sekretariat">Sekretariat / Empfang</option>
                    <option value="Sonstiges">Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label className={customerModalKontaktLabelClass} htmlFor={`${fieldIdPrefix}-tel-${k.id}`}>
                    {t('newCustomerLabelTelefon', 'Phone')}
                  </label>
                  <input
                    id={`${fieldIdPrefix}-tel-${k.id}`}
                    type="tel"
                    value={k.telefon}
                    onChange={(e) => updateAt(safeIdx, { telefon: e.target.value })}
                    onBlur={(e) => updateAt(safeIdx, { telefon: normalizePhoneValue(e.target.value) })}
                    className={customerModalKontaktInputClass}
                    placeholder={t('newCustomerPhPhone', '+49 30 1234567')}
                  />
                </div>

                <div>
                  <label className={customerModalKontaktLabelClass} htmlFor={`${fieldIdPrefix}-handy-${k.id}`}>
                    {t('newCustomerLabelHandy', 'Mobile')}
                  </label>
                  <input
                    id={`${fieldIdPrefix}-handy-${k.id}`}
                    type="tel"
                    value={k.handy}
                    onChange={(e) => updateAt(safeIdx, { handy: e.target.value })}
                    onBlur={(e) => updateAt(safeIdx, { handy: normalizePhoneValue(e.target.value) })}
                    className={customerModalKontaktInputClass}
                    placeholder={t('newCustomerPhMobile', '+49 170 1234567')}
                  />
                </div>

                <div>
                  <label className={customerModalKontaktLabelClass} htmlFor={`${fieldIdPrefix}-email-${k.id}`}>
                    {t('newCustomerLabelEmail', 'E-mail')}
                  </label>
                  <input
                    id={`${fieldIdPrefix}-email-${k.id}`}
                    type="email"
                    value={k.email}
                    onChange={(e) => updateAt(safeIdx, { email: e.target.value })}
                    className={customerModalKontaktInputClass}
                    placeholder={t('newCustomerPhEmail', 'name@company.com')}
                  />
                </div>

                <div>
                  <label className={customerModalKontaktLabelClass} htmlFor={`${fieldIdPrefix}-bem-${k.id}`}>
                    {t('newCustomerLabelKontaktBemerkung', 'Note')}
                  </label>
                  <textarea
                    id={`${fieldIdPrefix}-bem-${k.id}`}
                    value={k.bemerkung}
                    onChange={(e) => updateAt(safeIdx, { bemerkung: e.target.value })}
                    onBlur={(e) =>
                      commitAsciiNormalized(e.target, transliterateToAsciiMultiline, (v) =>
                        updateAt(safeIdx, { bemerkung: v })
                      )
                    }
                    onCompositionEnd={(e) =>
                      commitAsciiNormalized(e.currentTarget, transliterateToAsciiMultiline, (v) =>
                        updateAt(safeIdx, { bemerkung: v })
                      )
                    }
                    rows={2}
                    className={`${customerModalKontaktInputClass} min-h-[60px] resize-y py-2`}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </>
      )}

      {showCustomersStyleAppointments ? (
        <div className="mt-2 min-w-0 space-y-2">
          <section className="customers-modal-genz-frost-card flex min-h-0 flex-col rounded-2xl border border-white/60 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {t('customersAppointmentsTitle', 'Appointments')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setTerminFormOpen((v) => !v);
                  setTerminDatum('');
                  setTerminZeit('');
                  setTerminZweck('');
                }}
                className="flex items-center gap-1 rounded border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-neutral-50"
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                {t('customersNewAppointment', 'New appointment')}
              </button>
            </div>

            {terminFormOpen ? (
              <div className="mb-3 flex flex-col gap-2 rounded border border-neutral-200 bg-neutral-50 p-3">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={terminDatum}
                    onChange={(e) => setTerminDatum(e.target.value)}
                    className="h-8 flex-1 rounded border border-neutral-300 bg-white px-2.5 text-xs focus:border-neutral-600 focus:outline-none"
                  />
                  <input
                    type="time"
                    value={terminZeit}
                    onChange={(e) => setTerminZeit(e.target.value)}
                    className="h-8 w-28 rounded border border-neutral-300 bg-white px-2.5 text-xs focus:border-neutral-600 focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={terminZweck}
                  onChange={(e) => setTerminZweck(e.target.value)}
                  placeholder={t('customersTerminZweckPh', 'Purpose / subject')}
                  className="h-8 w-full rounded border border-neutral-300 bg-white px-2.5 text-xs focus:border-neutral-600 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddTermin}
                    disabled={!terminDatum || !terminZweck.trim()}
                    className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
                  >
                    {t('commonSave', 'Save')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerminFormOpen(false)}
                    className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-neutral-50"
                  >
                    {t('commonCancel', 'Cancel')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="max-h-56 overflow-x-auto overflow-y-auto rounded border border-neutral-200">
              <table className="w-full min-w-[280px] text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">{t('customersApptDate', 'Date')}</th>
                    <th className="px-3 py-2">{t('customersApptTime', 'Time')}</th>
                    <th className="px-3 py-2">{t('customersApptPurpose', 'Purpose')}</th>
                    <th className="px-3 py-2 text-center">{t('customersApptDone', 'Done')}</th>
                    <th className="w-8 px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-600">
                  {termine.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                        {t('customersNoAppointments', 'No appointments available')}
                      </td>
                    </tr>
                  ) : (
                    termine.map((termin, terminIdx) => (
                      <tr
                        key={`${terminIdx}-${termin.date}-${termin.purpose}`}
                        className={termin.done ? 'opacity-50' : ''}
                      >
                        <td className="px-3 py-2 tabular-nums">{termin.date}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {termin.time?.trim() ? termin.time : t('commonPlaceholderDash', '—')}
                        </td>
                        <td className={`px-3 py-2 ${termin.done ? 'line-through' : ''}`}>{termin.purpose}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={termin.done}
                            onChange={() => {
                              const list = [...termine];
                              list[terminIdx] = { ...list[terminIdx]!, done: !list[terminIdx]!.done };
                              patchAppointmentHistory(list);
                            }}
                            className="h-3.5 w-3.5 rounded border-neutral-300 accent-neutral-700"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              patchAppointmentHistory(termine.filter((_, i) => i !== terminIdx));
                            }}
                            className="rounded p-0.5 text-slate-300 hover:text-red-500"
                            aria-label={t('commonRemove', 'Remove')}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
