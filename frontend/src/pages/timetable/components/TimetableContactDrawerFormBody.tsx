import { useMemo, useState } from 'react';
import { FileText, MapPin, Package, Truck, UserRound, Users } from 'lucide-react';
import type {
  TimetableContactProfile,
  TimetableEntry,
  TimetableOutcome,
  TimetableTruckOffer,
  TimetableVehicleDisplayExtra,
} from '../../../types/timetable';
import { CONTACT_DRAWER_SECTION_IDS } from '../contactDrawerSectionIds';
import {
  emptyAppointmentRow,
  emptyAssignment,
  ensureProfile,
  formatEur,
  fromDatetimeLocalValue,
  entryAnyOfferHasContent,
  offerHasContent,
  OUTCOME_ORDER,
  toDatetimeLocalValue,
} from '../contactDrawerFormUtils';
import {
  inputClass,
  labelClass,
  overviewAddBtnClass,
  overviewFieldClass,
  overviewInputClass,
  overviewLabelClass,
  overviewNotesTextareaClass,
  textareaClass,
} from '../contactDrawerFormClasses';
import { ContactCard } from './contactDrawerCards';
import { TimetableActivityNotesThread } from './TimetableActivityNotesThread';
import { TimetableExtraKontakteBlock } from './TimetableExtraKontakteBlock';

export type TimetableContactDrawerFormBodyProps = {
  draft: TimetableEntry;
  p: TimetableContactProfile;
  offer: TimetableTruckOffer;
  ve: TimetableVehicleDisplayExtra;
  localeTag: string;
  t: (key: string, fallback: string) => string;
  outcomeLabels: Record<TimetableOutcome, string>;
  patchDraft: (updater: (prev: TimetableEntry) => TimetableEntry) => void;
  setOfferField: (patch: Partial<TimetableTruckOffer>) => void;
  setVehicleExtra: (patch: Partial<TimetableVehicleDisplayExtra>) => void;
};

/** Taller sticky pill grid (2–3 rows on narrow) + toolbar — keep section headings clear. */
const sectionScrollClass = 'scroll-mt-36 sm:scroll-mt-32';

export function TimetableContactDrawerFormBody({
  draft,
  p,
  offer,
  ve,
  localeTag,
  t,
  outcomeLabels,
  patchDraft,
  setOfferField,
  setVehicleExtra,
}: TimetableContactDrawerFormBodyProps) {
  const apptCount = (p.appointment_history ?? []).length;
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="grid min-h-0 w-full grid-cols-1 gap-4 xl:grid-cols-2 2xl:gap-5">
      
      <section
        id={CONTACT_DRAWER_SECTION_IDS.contact}
        className={`${sectionScrollClass} xl:col-span-1`}
        tabIndex={-1}
        role="region"
        aria-labelledby="timetable-contact-heading-contact"
      >
        <ContactCard
          icon={UserRound}
          titleId="timetable-contact-heading-contact"
          title={t('timetableContactSectionContactTitle', 'Contact & appointment')}
          subtitle={t(
            'timetableContactSectionContactSubtitle',
            'Identity, slot, outcome, and completion flags in one place.'
          )}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className={overviewFieldClass}>
                <span className={overviewLabelClass}>{t('timetableColCompany', 'Company')}</span>
                <input
                  value={draft.company_name}
                  onChange={(e) => patchDraft((prev) => ({ ...prev, company_name: e.target.value }))}
                  className={overviewInputClass}
                />
              </label>
              <label className={overviewFieldClass}>
                <span className={overviewLabelClass}>{t('timetableColContact', 'Contact')}</span>
                <input
                  value={draft.contact_name}
                  onChange={(e) => patchDraft((prev) => ({ ...prev, contact_name: e.target.value }))}
                  className={overviewInputClass}
                />
              </label>
              <label className={overviewFieldClass}>
                <span className={overviewLabelClass}>{t('timetableColPhone', 'Phone')}</span>
                <input
                  value={draft.phone}
                  onChange={(e) => patchDraft((prev) => ({ ...prev, phone: e.target.value }))}
                  className={overviewInputClass}
                  inputMode="tel"
                />
              </label>
              <label className={overviewFieldClass}>
                <span className={overviewLabelClass}>{t('timetableColPurpose', 'Purpose')}</span>
                <input
                  value={draft.purpose}
                  onChange={(e) => patchDraft((prev) => ({ ...prev, purpose: e.target.value }))}
                  className={overviewInputClass}
                />
              </label>
              <label className={overviewFieldClass}>
                <span className={overviewLabelClass}>{t('timetableColVp', 'Buyer')}</span>
                <input
                  value={draft.buyer_name}
                  onChange={(e) => patchDraft((prev) => ({ ...prev, buyer_name: e.target.value }))}
                  className={overviewInputClass}
                />
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <label className={overviewFieldClass}>
                <span className={overviewLabelClass}>
                  {t('timetableContactSlotDateTime', 'Appointment date & time')}
                </span>
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(draft.scheduled_at)}
                  onChange={(e) => {
                    const iso = fromDatetimeLocalValue(e.target.value);
                    if (iso) patchDraft((prev) => ({ ...prev, scheduled_at: iso }));
                  }}
                  className={overviewInputClass}
                />
              </label>
              <label className={overviewFieldClass}>
                <span className={overviewLabelClass}>
                  {t('timetableFieldFollowUpAt', 'Follow-up date & time')}
                </span>
                <input
                  type="datetime-local"
                  value={toDatetimeLocalValue(draft.follow_up_at)}
                  onChange={(e) => {
                    const iso = fromDatetimeLocalValue(e.target.value);
                    patchDraft((prev) => ({ ...prev, follow_up_at: iso }));
                  }}
                  className={overviewInputClass}
                />
              </label>
              <label className={overviewFieldClass}>
                <span className={overviewLabelClass}>{t('timetableFieldOutcome', 'Call outcome')}</span>
                <select
                  value={draft.outcome}
                  onChange={(e) => {
                    const o = e.target.value as TimetableOutcome;
                    patchDraft((prev) => ({
                      ...prev,
                      outcome: o,
                      is_completed: o === 'no_trucks',
                      follow_up_at: o === 'follow_up' || o === 'has_trucks' ? prev.follow_up_at : null,
                    }));
                  }}
                  className={overviewInputClass}
                >
                  {OUTCOME_ORDER.map((o) => (
                    <option key={o} value={o}>
                      {outcomeLabels[o]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-col gap-3 rounded-2xl border border-blue-200/40 bg-white/45 p-3 shadow-inner shadow-blue-900/[0.03] backdrop-blur-sm">
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={draft.is_completed}
                    onChange={(e) => patchDraft((prev) => ({ ...prev, is_completed: e.target.checked }))}
                    className="h-4 w-4 rounded-md border-slate-300 text-blue-600 transition focus:ring-2 focus:ring-blue-400/40"
                  />
                  {t('timetableColDone', 'Done')}
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={draft.is_parked}
                    onChange={(e) => patchDraft((prev) => ({ ...prev, is_parked: e.target.checked }))}
                    className="h-4 w-4 rounded-md border-slate-300 text-sky-600 transition focus:ring-2 focus:ring-blue-400/40"
                  />
                  {t('timetableContactParkedLabel', 'Parked')}
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={!!p.purchase_confirmed}
                    onChange={(e) =>
                      patchDraft((prev) => {
                        const pr = ensureProfile(prev);
                        pr.purchase_confirmed = e.target.checked;
                        return { ...prev, contact_profile: { ...pr } };
                      })
                    }
                    className="h-4 w-4 rounded-md border-slate-300 text-blue-600 transition focus:ring-2 focus:ring-blue-400/40"
                  />
                  {t('timetableContactPurchaseConfirmed', 'Purchase confirmed')}
                </label>
              </div>
            </div>
          </div>
        </ContactCard>
      </section>

      <section
        id={CONTACT_DRAWER_SECTION_IDS.location}
        className={`${sectionScrollClass} xl:col-span-1`}
        tabIndex={-1}
        role="region"
        aria-labelledby="timetable-contact-heading-location"
      >
        <ContactCard
          icon={MapPin}
          titleId="timetable-contact-heading-location"
          title={t('timetableContactSectionLocationTitle', 'Location & overview')}
          subtitle={t(
            'timetableContactSectionLocationSubtitle',
            'Address and fleet summary; dated call notes are under Correspondence & notes or Customer → Remarks.'
          )}
        >
          <div className="flex w-full flex-col gap-4">
            <label className={`${overviewFieldClass} w-full`}>
              <span className={overviewLabelClass}>{t('timetableContactAddress', 'Address')}</span>
              <textarea
                value={p.address ?? ''}
                onChange={(e) =>
                  patchDraft((prev) => {
                    const pr = ensureProfile(prev);
                    pr.address = e.target.value || undefined;
                    return { ...prev, contact_profile: { ...pr } };
                  })
                }
                rows={5}
                className={`${overviewNotesTextareaClass} min-h-[6.75rem] w-full`}
              />
            </label>
            <label className={`${overviewFieldClass} w-full`}>
              <span className={overviewLabelClass}>{t('timetableContactFleet', 'Fleet')}</span>
              <textarea
                value={p.fleet_summary ?? ''}
                onChange={(e) =>
                  patchDraft((prev) => {
                    const pr = ensureProfile(prev);
                    pr.fleet_summary = e.target.value || undefined;
                    return { ...prev, contact_profile: { ...pr } };
                  })
                }
                rows={5}
                className={`${overviewNotesTextareaClass} min-h-[6.75rem] w-full`}
              />
            </label>
          </div>
        </ContactCard>
      </section>

      <section
        id={CONTACT_DRAWER_SECTION_IDS.people}
        className={`${sectionScrollClass} xl:col-span-1`}
        tabIndex={-1}
        role="region"
        aria-labelledby="timetable-contact-heading-people"
      >
        <ContactCard
          icon={Users}
          titleId="timetable-contact-heading-people"
          title={t('timetableContactSectionPeopleTitle', 'People & assignment')}
          subtitle={t(
            'timetableContactSectionPeopleSubtitle',
            'Additional contacts and processor history side by side on wide screens.'
          )}
        >
          <div className="grid gap-4 2xl:grid-cols-2">
            <div>
              <TimetableExtraKontakteBlock
                contacts={p.contacts}
                patchDraft={patchDraft}
                t={t}
                fieldIdPrefix="tt-form-extra"
              />
            </div>

            <div>
              <div className="mb-3 flex flex-col gap-2 border-b border-slate-200/50 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
                  {t('timetableContactAssignments', 'Assignment')}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    patchDraft((prev) => {
                      const pr = ensureProfile(prev);
                      pr.assignment_history = [...(pr.assignment_history ?? []), emptyAssignment()];
                      return { ...prev, contact_profile: { ...pr } };
                    })
                  }
                  className={overviewAddBtnClass}
                >
                  {t('timetableContactAddRow', 'Add')}
                </button>
              </div>
              <div className="space-y-3">
                {(p.assignment_history ?? []).length === 0 ? (
                  <p className="text-xs leading-relaxed text-slate-500">
                    {t('timetableContactNoAssignments', 'None')}
                  </p>
                ) : null}
                {(p.assignment_history ?? []).map((a, idx) => (
                  <div key={idx} className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
                    <label className={overviewFieldClass}>
                      <span className={overviewLabelClass}>{t('timetableContactProcessor', 'Processor')}</span>
                      <input
                        value={a.name}
                        onChange={(e) =>
                          patchDraft((prev) => {
                            const pr = ensureProfile(prev);
                            const list = [...(pr.assignment_history ?? [])];
                            list[idx] = { ...list[idx], name: e.target.value };
                            pr.assignment_history = list;
                            return { ...prev, contact_profile: { ...pr } };
                          })
                        }
                        className={overviewInputClass}
                      />
                    </label>
                    <label className={overviewFieldClass}>
                      <span className={overviewLabelClass}>{t('timetableContactSince', 'Since')}</span>
                      <input
                        value={a.since ?? ''}
                        onChange={(e) =>
                          patchDraft((prev) => {
                            const pr = ensureProfile(prev);
                            const list = [...(pr.assignment_history ?? [])];
                            list[idx] = { ...list[idx], since: e.target.value || undefined };
                            pr.assignment_history = list;
                            return { ...prev, contact_profile: { ...pr } };
                          })
                        }
                        className={overviewInputClass}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        patchDraft((prev) => {
                          const pr = ensureProfile(prev);
                          pr.assignment_history = (pr.assignment_history ?? []).filter((_, i) => i !== idx);
                          return { ...prev, contact_profile: { ...pr } };
                        })
                      }
                      className="text-xs font-semibold text-rose-600 hover:underline"
                    >
                      {t('timetableContactRemoveRow', 'Remove')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ContactCard>
      </section>

      <section
        id={CONTACT_DRAWER_SECTION_IDS.history}
        className={`${sectionScrollClass} xl:col-span-1`}
        tabIndex={-1}
        role="region"
        aria-labelledby="timetable-contact-heading-history"
      >
        <details
          className="rounded-2xl border border-slate-200/80 bg-white/50 ring-1 ring-slate-900/[0.04] open:bg-white/70"
          open={historyOpen}
          onToggle={(e) => setHistoryOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="timetable-contact-heading-history"
                className="text-base font-semibold tracking-tight text-slate-900"
              >
                {t('timetableContactSectionHistory', 'Further customer appointments')}
                <span className="ml-2 text-sm font-normal text-slate-500">({apptCount})</span>
              </h2>
              <span className="text-xs font-semibold text-blue-700">
                {historyOpen ? t('timetableContactHistoryCollapse', 'Tap to collapse') : t('timetableContactHistoryExpand', 'Tap to expand')}
              </span>
            </div>
          </summary>
          <div className="border-t border-slate-200/60 px-4 pb-5 pt-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-xl text-sm leading-relaxed text-slate-500">
                {t('timetableContactSectionHistoryHint', 'Chronological log — same customer')}
              </p>
              <button
                type="button"
                onClick={() =>
                  patchDraft((prev) => {
                    const pr = ensureProfile(prev);
                    pr.appointment_history = [...(pr.appointment_history ?? []), emptyAppointmentRow()];
                    return { ...prev, contact_profile: { ...pr } };
                  })
                }
                className="h-11 shrink-0 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
              >
                {t('timetableContactAddAppointment', 'Add appointment')}
              </button>
            </div>
            {apptCount === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 py-12 text-center">
                <p className="text-sm text-slate-500">
                  {t('timetableContactEmptyHistory', 'No additional appointments on file.')}
                </p>
              </div>
            ) : (
              <ul className="space-y-5">
                {(p.appointment_history ?? []).map((row, idx) => (
                  <li
                    key={idx}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {t('timetableContactAppointmentCardLabel', 'Appointment')} {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          patchDraft((prev) => {
                            const pr = ensureProfile(prev);
                            pr.appointment_history = (pr.appointment_history ?? []).filter((_, i) => i !== idx);
                            return { ...prev, contact_profile: { ...pr } };
                          })
                        }
                        className="text-sm font-semibold text-rose-600 hover:underline"
                      >
                        {t('timetableContactRemoveRow', 'Remove')}
                      </button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className={labelClass}>
                        {t('timetableColDate', 'Date')}
                        <input
                          value={row.date}
                          onChange={(e) =>
                            patchDraft((prev) => {
                              const pr = ensureProfile(prev);
                              const list = [...(pr.appointment_history ?? [])];
                              list[idx] = { ...list[idx], date: e.target.value };
                              pr.appointment_history = list;
                              return { ...prev, contact_profile: { ...pr } };
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className={labelClass}>
                        {t('timetableColTime', 'Time')}
                        <input
                          value={row.time}
                          onChange={(e) =>
                            patchDraft((prev) => {
                              const pr = ensureProfile(prev);
                              const list = [...(pr.appointment_history ?? [])];
                              list[idx] = { ...list[idx], time: e.target.value };
                              pr.appointment_history = list;
                              return { ...prev, contact_profile: { ...pr } };
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className={`${labelClass} sm:col-span-2`}>
                        {t('timetableColPurpose', 'Purpose')}
                        <input
                          value={row.purpose}
                          onChange={(e) =>
                            patchDraft((prev) => {
                              const pr = ensureProfile(prev);
                              const list = [...(pr.appointment_history ?? [])];
                              list[idx] = { ...list[idx], purpose: e.target.value };
                              pr.appointment_history = list;
                              return { ...prev, contact_profile: { ...pr } };
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className={`${labelClass} sm:col-span-2`}>
                        {t('timetableColRemark', 'Notes')}
                        <textarea
                          value={row.remark}
                          onChange={(e) =>
                            patchDraft((prev) => {
                              const pr = ensureProfile(prev);
                              const list = [...(pr.appointment_history ?? [])];
                              list[idx] = { ...list[idx], remark: e.target.value };
                              pr.appointment_history = list;
                              return { ...prev, contact_profile: { ...pr } };
                            })
                          }
                          rows={2}
                          className={textareaClass}
                        />
                      </label>
                      <div className="flex items-center sm:col-span-2">
                        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={row.done}
                            onChange={(e) =>
                              patchDraft((prev) => {
                                const pr = ensureProfile(prev);
                                const list = [...(pr.appointment_history ?? [])];
                                list[idx] = { ...list[idx], done: e.target.checked };
                                pr.appointment_history = list;
                                return { ...prev, contact_profile: { ...pr } };
                              })
                            }
                            className="h-5 w-5 rounded border-slate-300 text-slate-900"
                          />
                          {t('timetableColDone', 'Done')}
                        </label>
                      </div>
                      <label className={labelClass}>
                        {t('timetableContactVpShort', 'By')}
                        <input
                          value={row.initials}
                          onChange={(e) =>
                            patchDraft((prev) => {
                              const pr = ensureProfile(prev);
                              const list = [...(pr.appointment_history ?? [])];
                              list[idx] = { ...list[idx], initials: e.target.value };
                              pr.appointment_history = list;
                              return { ...prev, contact_profile: { ...pr } };
                            })
                          }
                          className={`${inputClass} font-mono`}
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </section>

      <section
        id={CONTACT_DRAWER_SECTION_IDS.vehicle}
        className={`${sectionScrollClass} xl:col-span-2`}
        tabIndex={-1}
        role="region"
        aria-labelledby="timetable-contact-heading-vehicle"
      >
        <div className="space-y-8">
          <ContactCard
            icon={Truck}
            titleId="timetable-contact-heading-vehicle"
            title={t('timetableContactSectionVehicle', 'Vehicle offer')}
            subtitle={t(
              'timetableContactVehicleInlineHint',
              'Edit here or use the full offer dialog — both stay on this row after Save.'
            )}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <label className={labelClass}>
                {t('timetableOfferVehicleType', 'Vehicle type')}
                <input
                  value={offer.vehicle_type}
                  onChange={(e) => setOfferField({ vehicle_type: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t('timetableOfferBrand', 'Brand')}
                <input
                  value={offer.brand}
                  onChange={(e) => setOfferField({ brand: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t('timetableOfferModel', 'Model')}
                <input
                  value={offer.model}
                  onChange={(e) => setOfferField({ model: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t('timetableOfferLocation', 'Location')}
                <input
                  value={offer.location}
                  onChange={(e) => setOfferField({ location: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t('timetableOfferYear', 'Year')}
                <input
                  value={offer.year != null ? String(offer.year) : ''}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setOfferField({ year: v ? Number(v) : null });
                  }}
                  className={inputClass}
                  inputMode="numeric"
                />
              </label>
              <label className={labelClass}>
                {t('timetableOfferMileage', 'Mileage (km)')}
                <input
                  value={offer.mileage_km != null ? String(offer.mileage_km) : ''}
                  onChange={(e) => {
                    const v = e.target.value.trim().replace(',', '.');
                    setOfferField({
                      mileage_km: v ? (Number.isFinite(Number(v)) ? Number(v) : null) : null,
                    });
                  }}
                  className={inputClass}
                  inputMode="decimal"
                />
              </label>
              <label className={labelClass}>
                {t('timetableOfferQuantity', 'Quantity')}
                <input
                  value={offer.quantity != null ? String(offer.quantity) : ''}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setOfferField({
                      quantity: v ? (Number.isFinite(Number(v)) ? Number(v) : null) : null,
                    });
                  }}
                  className={inputClass}
                  inputMode="numeric"
                />
              </label>
              <label className={labelClass}>
                {t('timetableOfferExpectedPrice', 'Expected price (EUR)')}
                <input
                  value={offer.expected_price_eur != null ? String(offer.expected_price_eur) : ''}
                  onChange={(e) => {
                    const v = e.target.value.trim().replace(',', '.');
                    setOfferField({
                      expected_price_eur: v ? (Number.isFinite(Number(v)) ? Number(v) : null) : null,
                    });
                  }}
                  className={inputClass}
                  inputMode="decimal"
                />
              </label>
              <label className={`sm:col-span-2 xl:col-span-3 ${labelClass}`}>
                {t('timetableOfferNotes', 'Offer notes')}
                <textarea
                  value={offer.notes}
                  onChange={(e) => setOfferField({ notes: e.target.value })}
                  rows={3}
                  className={textareaClass}
                />
              </label>
            </div>
            {!entryAnyOfferHasContent(draft) ? (
              <p className="mt-5 text-sm leading-relaxed text-slate-500">
                {t(
                  'timetableContactEmptyVehicle',
                  'No offer captured — use Add offer when the customer has stock.'
                )}
              </p>
            ) : (
              <p className="mt-5 text-sm text-slate-600">
                {t('timetableOfferExpectedPrice', 'Expected price (EUR)')}:{' '}
                <span className="font-semibold text-blue-900">
                  {formatEur(offer.expected_price_eur, localeTag)}
                </span>
              </p>
            )}
          </ContactCard>

          <ContactCard
            icon={Package}
            className="border-blue-100/90 bg-gradient-to-br from-blue-50/80 via-white to-white ring-blue-100/50"
            title={t('timetableContactVehicleExtra', 'Registration & status')}
            subtitle={t(
              'timetableContactVehicleExtraHint',
              'Registration, pricing context, and who touched the offer.'
            )}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <label className={labelClass}>
                {t('timetableContactBodyType', 'Body')}
                <input
                  value={ve.body_type ?? ''}
                  onChange={(e) => setVehicleExtra({ body_type: e.target.value || undefined })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t('timetableContactRegistration', 'Registration')}
                <input
                  value={ve.registration_mm_yyyy ?? ''}
                  onChange={(e) => setVehicleExtra({ registration_mm_yyyy: e.target.value || undefined })}
                  className={inputClass}
                  placeholder={t('timetableContactRegistrationPh', 'MM/YYYY')}
                />
              </label>
              <label className={labelClass}>
                {t('timetableContactMileageReplacement', 'Replacement engine km')}
                <input
                  value={ve.mileage_replacement_km != null ? String(ve.mileage_replacement_km) : ''}
                  onChange={(e) => {
                    const v = e.target.value.trim().replace(',', '.');
                    setVehicleExtra({
                      mileage_replacement_km: v ? (Number.isFinite(Number(v)) ? Number(v) : null) : null,
                    });
                  }}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-800">
                {t('timetableContactPriceCustomer', 'Customer price')}
                <input
                  value={ve.customer_price_eur != null ? String(ve.customer_price_eur) : ''}
                  onChange={(e) => {
                    const v = e.target.value.trim().replace(',', '.');
                    setVehicleExtra({
                      customer_price_eur: v ? (Number.isFinite(Number(v)) ? Number(v) : null) : null,
                    });
                  }}
                  className={inputClass}
                />
              </label>
              <label className={`${labelClass} sm:col-span-2 xl:col-span-3`}>
                {t('timetableContactProcessor', 'Processor')}
                <input
                  value={ve.processor_name ?? ''}
                  onChange={(e) => setVehicleExtra({ processor_name: e.target.value || undefined })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t('timetableContactProcessorEntered', 'Entered by')}
                <input
                  value={ve.processor_entered ?? ''}
                  onChange={(e) => setVehicleExtra({ processor_entered: e.target.value || undefined })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t('timetableContactProcessorFetched', 'Fetched by')}
                <input
                  value={ve.processor_fetched ?? ''}
                  onChange={(e) => setVehicleExtra({ processor_fetched: e.target.value || undefined })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t('timetableContactProcessorNegotiated', 'Negotiated by')}
                <input
                  value={ve.processor_negotiated ?? ''}
                  onChange={(e) => setVehicleExtra({ processor_negotiated: e.target.value || undefined })}
                  className={inputClass}
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-8 rounded-xl border border-blue-100/70 bg-white/60 p-4">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={!!ve.sold}
                  onChange={(e) => setVehicleExtra({ sold: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-slate-900"
                />
                {t('timetableContactSold', 'Sold')}
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={!!ve.deregistered}
                  onChange={(e) => setVehicleExtra({ deregistered: e.target.checked })}
                  className="h-5 w-5 rounded border-slate-300 text-slate-900"
                />
                {t('timetableContactDeregistered', 'Deregistered')}
              </label>
            </div>
          </ContactCard>
        </div>
      </section>
      <section
        id={CONTACT_DRAWER_SECTION_IDS.activity}
        className={`${sectionScrollClass} xl:col-span-2`}
        tabIndex={-1}
        role="region"
        aria-labelledby="timetable-contact-heading-activity"
      >
        <ContactCard
          icon={FileText}
          className="border-slate-200/80 bg-gradient-to-b from-white/92 to-slate-50/70"
          titleId="timetable-contact-heading-activity"
          title={t('timetableContactSectionActivity', 'Correspondence & notes')}
          subtitle={t(
            'timetableContactSectionActivityHint',
            'Letters, e-mail drafts, and free-form history'
          )}
        >
          <TimetableActivityNotesThread
            draft={draft}
            profile={p}
            patchDraft={patchDraft}
            localeTag={localeTag}
            t={t}
            layout="formSection"
          />
        </ContactCard>
      </section>
    </div>
  );
}
