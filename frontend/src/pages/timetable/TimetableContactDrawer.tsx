import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Building2, PhoneCall, Sparkles, Truck, X } from 'lucide-react';
import type {
  TimetableContactProfile,
  TimetableEntry,
  TimetableTruckOffer,
  TimetableVehicleDisplayExtra,
} from '../../types/timetable';
import { loadKundenDb, resolveKundeForTimetableRow } from '../../store/kundenStore';
import {
  EMPTY_OFFER,
  ensureProfile,
  offerHasContent,
  vehicleExtraHasContent,
} from './contactDrawerFormUtils';
import { headerCodesInputClass } from './contactDrawerFormClasses';
import { ContactSmartSummaryCard } from './components/contactDrawerCards';
import { TimetableContactDrawerFormBody } from './components/TimetableContactDrawerFormBody';
import { TimetableContactDrawerSectionNav } from './components/TimetableContactDrawerSectionNav';

export { CONTACT_DRAWER_SECTION_IDS } from './contactDrawerSectionIds';

type Props = {
  entry: TimetableEntry | null;
  localeTag: string;
  t: (key: string, fallback: string) => string;
  onClose: () => void;
  onPersist: (entry: TimetableEntry) => void;
  onLogCall: (entry: TimetableEntry) => void;
  onEditOffer: (entry: TimetableEntry) => void;
};

function cloneEntry(e: TimetableEntry): TimetableEntry {
  return JSON.parse(JSON.stringify(e)) as TimetableEntry;
}

function formatRowDateTime(raw: string, localeTag: string): { date: string; time: string } {
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return { date: raw, time: '' };
  const d = new Date(ms);
  return {
    date: d.toLocaleDateString(localeTag, { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' }),
  };
}

function kaArtFromRow(row: TimetableEntry): string {
  if (row.outcome === 'has_trucks' || row.offer) return 'KA';
  return 'A';
}

function outcomeLabel(entry: TimetableEntry, t: (key: string, fallback: string) => string): string {
  if (entry.outcome === 'has_trucks') return t('timetableOutcomeHasTrucks', 'Has trucks');
  if (entry.outcome === 'follow_up') return t('timetableOutcomeFollowUp', 'Follow-up');
  if (entry.outcome === 'no_trucks') return t('timetableOutcomeNoTrucks', 'No trucks');
  return t('timetableOutcomePending', 'Pending');
}

/** On-device “smart summary” lines — derived from row + profile only (no API). */
function getContactSmartBullets(
  draft: TimetableEntry,
  profile: TimetableContactProfile,
  localeTag: string,
  t: (key: string, fallback: string) => string
): string[] {
  const bullets: string[] = [];
  const company =
    (draft.company_name || '').trim() || t('timetableContactAiNoCompany', 'Company not set');
  const contact =
    (draft.contact_name || '').trim() || t('timetableContactAiNoPerson', 'Contact not named');
  bullets.push(
    t('timetableContactAiBulletCall', '{company} · {contact}')
      .replace('{company}', company)
      .replace('{contact}', contact)
  );
  const { date, time } = formatRowDateTime(draft.scheduled_at, localeTag);
  const slot = time ? `${date} · ${time}` : date || t('commonPlaceholderDash', '—');
  bullets.push(
    t('timetableContactAiBulletStatus', '{outcome} · {slot}')
      .replace('{outcome}', outcomeLabel(draft, t))
      .replace('{slot}', slot)
  );
  if (offerHasContent(draft.offer)) {
    const o = draft.offer!;
    const detailRaw =
      [o.brand, o.model].filter(Boolean).join(' ').trim() ||
      o.vehicle_type.trim() ||
      t('timetableContactAiOfferGeneric', 'Details on file');
    const detail = detailRaw.length > 52 ? `${detailRaw.slice(0, 49)}…` : detailRaw;
    bullets.push(t('timetableContactAiBulletOffer', 'Offer: {detail}').replace('{detail}', detail));
  } else if (draft.outcome === 'has_trucks') {
    bullets.push(
      t(
        'timetableContactAiBulletOfferGap',
        'Trucks signal — capture the vehicle in the Vehicle section.'
      )
    );
  }
  const act = (profile.activity_notes || '').trim();
  if (act) {
    const snippet = act.length > 64 ? `${act.slice(0, 61)}…` : act;
    bullets.push(
      t('timetableContactAiBulletActivity', 'Correspondence: {snippet}').replace('{snippet}', snippet)
    );
  } else {
    bullets.push(
      t(
        'timetableContactAiBulletActivityEmpty',
        'No correspondence text yet — use the Correspondence section.'
      )
    );
  }
  return bullets.slice(0, 5);
}

function outcomePillClass(outcome: TimetableEntry['outcome']): string {
  switch (outcome) {
    case 'has_trucks':
      return 'bg-blue-500/20 text-blue-100 ring-blue-400/35';
    case 'follow_up':
      return 'bg-sky-500/20 text-sky-100 ring-sky-400/35';
    case 'no_trucks':
      return 'bg-slate-500/25 text-slate-200 ring-slate-400/25';
    default:
      return 'bg-indigo-500/20 text-indigo-100 ring-indigo-400/30';
  }
}

export function TimetableContactDrawer({
  entry,
  localeTag,
  t,
  onClose,
  onPersist,
  onLogCall,
  onEditOffer,
}: Props) {
  const [draft, setDraft] = useState<TimetableEntry | null>(null);
  const [dirty, setDirty] = useState(false);
  const [smartSummaryOpen, setSmartSummaryOpen] = useState(false);
  const [kundenDbTick, setKundenDbTick] = useState(0);
  const smartSummaryRef = useRef<HTMLDivElement>(null);
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const prevEntryIdRef = useRef<number | null>(null);

  useEffect(() => {
    const onKunden = () => setKundenDbTick((n) => n + 1);
    window.addEventListener('dema-kunden-db-changed', onKunden);
    return () => window.removeEventListener('dema-kunden-db-changed', onKunden);
  }, []);

  useLayoutEffect(() => {
    if (!entry) {
      setDraft(null);
      prevEntryIdRef.current = null;
      return;
    }
    const needReset = prevEntryIdRef.current === null || prevEntryIdRef.current !== entry.id;
    if (needReset) {
      setDraft(cloneEntry(entry));
      setDirty(false);
    }
    prevEntryIdRef.current = entry.id;
  }, [entry]);

  const entryFingerprint = useMemo(() => (entry ? JSON.stringify(entry) : ''), [entry]);

  useEffect(() => {
    if (!entryFingerprint || dirty) return;
    let parsed: TimetableEntry;
    try {
      parsed = JSON.parse(entryFingerprint) as TimetableEntry;
    } catch {
      return;
    }
    setDraft((current) => {
      if (!current || current.id !== parsed.id) return current;
      return cloneEntry(parsed);
    });
  }, [entryFingerprint, dirty]);

  useEffect(() => {
    if (!smartSummaryOpen) return;
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (smartSummaryRef.current && !smartSummaryRef.current.contains(node)) {
        setSmartSummaryOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [smartSummaryOpen]);

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (smartSummaryOpen) {
          setSmartSummaryOpen(false);
          return;
        }
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [entry, onClose, smartSummaryOpen]);

  const outcomeLabels = useMemo(
    () => ({
      pending: t('timetableOutcomePending', 'Pending'),
      follow_up: t('timetableOutcomeFollowUp', 'Follow-up'),
      has_trucks: t('timetableOutcomeHasTrucks', 'Has trucks'),
      no_trucks: t('timetableOutcomeNoTrucks', 'No trucks'),
    }),
    [t]
  );

  const smartBullets = useMemo(() => {
    if (!draft) return [] as string[];
    return getContactSmartBullets(draft, ensureProfile(draft), localeTag, t);
  }, [draft, localeTag, t]);

  const masterKundeForHeader = useMemo(() => {
    if (!draft) return null;
    const pr = ensureProfile(draft);
    return resolveKundeForTimetableRow(loadKundenDb(), draft.company_name, pr.customer_number);
  }, [draft, kundenDbTick]);

  const headerCrmDisplay = useMemo(() => {
    if (!draft) {
      return {
        kuNr: '',
        branche: '',
      };
    }
    const pr = ensureProfile(draft);
    const kuM = masterKundeForHeader?.kunden_nr;
    const brM = masterKundeForHeader?.branche?.trim();
    const kuP = pr.customer_number?.trim();
    const brP = pr.industry?.trim();
    const demoKu = t('timetableContactDemoKuNr', '35258');
    const demoBr = t('timetableContactDemoBranche', 'Logistics');
    const kuNr = kuM ?? kuP ?? demoKu;
    const branche = brM ?? brP ?? demoBr;
    return {
      kuNr,
      branche,
    };
  }, [draft, masterKundeForHeader, t]);

  const patchDraft = useCallback((updater: (prev: TimetableEntry) => TimetableEntry) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return updater(prev);
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!draft || !entry) return;
    const next = cloneEntry(draft);
    const nowIso = new Date().toISOString();

    if (offerHasContent(next.offer)) {
      const o = next.offer!;
      next.offer = {
        ...o,
        captured_at: o.captured_at?.trim() ? o.captured_at : nowIso,
      };
    } else {
      next.offer = null;
    }

    const p = next.contact_profile;
    if (p?.vehicle_extra && !vehicleExtraHasContent(p.vehicle_extra)) {
      delete p.vehicle_extra;
    }
    if (p && !p.purchase_confirmed) {
      delete p.purchase_confirmed;
    }

    onPersist(next);
    setDirty(false);
  }, [draft, entry, onPersist]);

  const handleDiscard = useCallback(() => {
    if (!entry) return;
    setDraft(cloneEntry(entry));
    setDirty(false);
  }, [entry]);

  if (!entry || !draft) return null;

  const p = ensureProfile(draft);
  const { date: slotDate, time: slotTime } = formatRowDateTime(draft.scheduled_at, localeTag);
  const offer = draft.offer ?? EMPTY_OFFER;

  const setOfferField = (patch: Partial<TimetableTruckOffer>) => {
    patchDraft((prev) => {
      const base = prev.offer ? { ...prev.offer } : { ...EMPTY_OFFER };
      return { ...prev, offer: { ...base, ...patch } };
    });
  };

  const ve = p.vehicle_extra ?? {};

  const setVehicleExtra = (patch: Partial<TimetableVehicleDisplayExtra>) => {
    patchDraft((prev) => {
      const pr = ensureProfile(prev);
      const cur = { ...(pr.vehicle_extra ?? {}), ...patch };
      pr.vehicle_extra = cur;
      return { ...prev, contact_profile: { ...pr } };
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#20060d]/75 via-slate-950/55 to-[#081223]/65 p-1 backdrop-blur-[7px] sm:p-1.5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex h-[min(96dvh,calc(100dvh-6px))] max-h-[min(96dvh,calc(100dvh-6px))] w-[min(112rem,calc(100vw-6px))] max-w-[min(112rem,calc(100vw-6px))] flex-col overflow-hidden rounded-[1.7rem] border border-white/25 bg-gradient-to-b from-slate-50/98 via-blue-50/[0.2] to-slate-100/[0.35] shadow-[0_32px_64px_-16px_rgba(15,23,42,0.45)] shadow-blue-900/12 ring-1 ring-slate-900/10 motion-safe:animate-timetable-fade-up motion-reduce:animate-none sm:h-[min(96dvh,calc(100dvh-10px))] sm:max-h-[min(96dvh,calc(100dvh-10px))] sm:w-[min(112rem,calc(100vw-10px))] sm:max-w-[min(112rem,calc(100vw-10px))] lg:w-[min(112rem,calc(100vw-20px))] lg:max-w-[min(112rem,calc(100vw-20px))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-contact-drawer-title"
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-r from-[#2b0b14] via-[#111827] to-[#10233f] px-3.5 py-3 pr-12 text-white sm:px-5 sm:py-3.5 sm:pr-14 md:pr-[4.25rem]">
          <div
            className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-blue-600/18 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-indigo-600/16 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none [animation-delay:-9s]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-1/4 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-sky-500/14 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none [animation-delay:-5s]"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-300/35 via-sky-300/25 to-transparent" />
          <p className="relative text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/95">
            {t('timetableContactTitle', 'Customer contact')}
          </p>
          <h2
            id="timetable-contact-drawer-title"
            className="relative mt-1.5 text-balance bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-lg font-semibold tracking-tight text-transparent sm:mt-2 sm:text-xl sm:leading-snug"
          >
            {draft.company_name || t('commonPlaceholderDash', '—')}
          </h2>
          <div className="relative mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-1.5 sm:mt-3 sm:gap-x-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold leading-none ring-1 ${outcomePillClass(draft.outcome)}`}
            >
              {outcomeLabel(draft, t)}
            </span>
            <div
              className="flex items-center gap-0.5 rounded-md border border-white/[0.18] bg-white/[0.08] px-1.5 py-0.5 ring-1 ring-white/[0.05] focus-within:border-blue-400/55 focus-within:ring-2 focus-within:ring-blue-400/25"
              title={t('timetableContactCardClassification', 'Codes & profile')}
            >
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                aria-label={t('timetableColKa', 'Ka')}
                placeholder={t('timetableColKaPh', 'A')}
                value={draft.legacy_ka ?? ''}
                onChange={(e) =>
                  patchDraft((prev) => ({ ...prev, legacy_ka: e.target.value || undefined }))
                }
                className={`${headerCodesInputClass} w-7 text-center font-mono sm:w-8`}
              />
              <span className="select-none px-0.5 text-[10px] text-slate-500" aria-hidden>
                /
              </span>
              <input
                type="text"
                inputMode="text"
                autoComplete="off"
                aria-label={t('timetableColArte', 'Subtype')}
                placeholder={kaArtFromRow(draft)}
                value={draft.legacy_arte ?? ''}
                onChange={(e) =>
                  patchDraft((prev) => ({ ...prev, legacy_arte: e.target.value || undefined }))
                }
                className={`${headerCodesInputClass} w-9 text-center font-mono sm:w-10`}
              />
            </div>
            <span className="select-none text-[10px] text-slate-600" aria-hidden>
              ·
            </span>
            <div
              role="group"
              aria-label={t(
                'timetableContactCrmSnapshotAria',
                'Customer master: customer number and industry'
              )}
              className="flex min-w-0 max-w-[min(100%,19rem)] items-center gap-2 rounded-lg border border-blue-500/40 bg-gradient-to-r from-blue-600/[0.12] via-slate-900/35 to-sky-500/[0.08] px-2 py-1 shadow-inner shadow-black/15 ring-1 ring-inset ring-white/[0.06] sm:max-w-md sm:flex-1 sm:gap-2.5 sm:px-2.5 sm:py-1.5"
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-500/28 text-sky-200/95 shadow-sm shadow-black/20"
                aria-hidden
              >
                <Building2 className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <div className="flex min-w-0 flex-1 items-end gap-2 sm:gap-3">
                <div className="min-w-0 shrink-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {t('customersLabelCustomerNr', 'Customer no.')}
                  </p>
                  <p className="font-mono text-sm font-bold leading-none tabular-nums tracking-tight text-white sm:text-[0.95rem]">
                    {headerCrmDisplay.kuNr}
                  </p>
                </div>
                <span className="pb-0.5 text-[10px] text-slate-600" aria-hidden>
                  ·
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    {t('newCustomerLabelBranche', 'Industry')}
                  </p>
                  <p className="truncate text-xs font-semibold leading-tight text-slate-100">
                    {headerCrmDisplay.branche}
                  </p>
                </div>
              </div>
            </div>
            <span className="select-none text-[10px] text-slate-600" aria-hidden>
              ·
            </span>
            <span className="text-xs tabular-nums text-slate-200 sm:text-[13px]">
              {slotDate} · {slotTime}
            </span>
            {draft.is_parked ? (
              <span className="rounded-md bg-sky-500/20 px-2 py-0.5 text-[11px] font-semibold leading-none text-sky-100 ring-1 ring-sky-400/35">
                {t('timetableFilterParked', 'Parked')}
              </span>
            ) : null}
            {p.purchase_confirmed ? (
              <span className="rounded-md bg-blue-500/22 px-2 py-0.5 text-[11px] font-semibold leading-none text-blue-100 ring-1 ring-blue-400/35">
                {t('timetableContactPurchaseConfirmed', 'Purchase confirmed')}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 ring-1 ring-white/0 transition hover:bg-white/10 hover:text-white hover:ring-white/15 sm:right-2.5 sm:top-2.5 sm:p-2 md:right-3 md:top-3"
            aria-label={t('commonClose', 'Close')}
          >
            <X className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" strokeWidth={2} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/95 px-3 pb-2 pt-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:px-4 sm:pb-2 sm:pt-2 md:px-5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-transparent pb-2 sm:flex-nowrap">
              <div className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2">
                <button
                  type="button"
                  onClick={() => onLogCall(draft)}
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 text-[11px] font-semibold text-white shadow-md shadow-blue-900/25 ring-1 ring-white/10 transition duration-200 hover:brightness-105 active:scale-[0.98] sm:h-9 sm:gap-1.5 sm:rounded-xl sm:px-3.5 sm:text-xs"
                >
                  <PhoneCall className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {t('timetableContactLogCall', 'Log call')}
                </button>
                <button
                  type="button"
                  onClick={() => onEditOffer(draft)}
                  disabled={draft.outcome !== 'has_trucks'}
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-blue-200/90 bg-white px-3 text-[11px] font-semibold text-blue-950 shadow-sm ring-1 ring-blue-900/5 transition hover:border-blue-300 hover:bg-blue-50/80 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:gap-1.5 sm:rounded-xl sm:px-3.5 sm:text-xs"
                >
                  <Truck className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                  {draft.offer
                    ? t('timetableContactEditOffer', 'Edit offer')
                    : t('timetableContactAddOffer', 'Add offer')}
                </button>
              </div>

              <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                <div className="relative shrink-0" ref={smartSummaryRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setSmartSummaryOpen((o) => !o);
                    }}
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-blue-200/80 bg-gradient-to-r from-white to-blue-50/50 px-2 text-[11px] font-semibold text-blue-950 shadow-sm shadow-blue-900/[0.06] transition hover:border-blue-300 hover:shadow-md active:scale-[0.98] sm:h-9 sm:gap-1.5 sm:rounded-xl sm:px-3 sm:text-xs"
                    aria-expanded={smartSummaryOpen}
                    aria-haspopup="dialog"
                    aria-controls="timetable-contact-smart-summary-popover"
                    aria-label={t('timetableContactAiTitle', 'Smart summary')}
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                    <span className="max-[400px]:sr-only">
                      {t('timetableContactAiTitle', 'Smart summary')}
                    </span>
                  </button>
                  {smartSummaryOpen ? (
                    <div
                      id="timetable-contact-smart-summary-popover"
                      role="dialog"
                      aria-label={t('timetableContactAiTitle', 'Smart summary')}
                      className="absolute right-0 top-[calc(100%+0.5rem)] z-[115] w-[min(calc(100vw-1.5rem),22rem)] max-h-[min(65dvh,26rem)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl shadow-blue-900/18 ring-1 ring-slate-900/[0.06] backdrop-blur-xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      <ContactSmartSummaryCard bullets={smartBullets} t={t} variant="dropdown" />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <TimetableContactDrawerSectionNav ref={scrollBodyRef} t={t}>
            <TimetableContactDrawerFormBody
              key={draft.id}
              draft={draft}
              p={p}
              offer={offer}
              ve={ve}
              localeTag={localeTag}
              t={t}
              outcomeLabels={outcomeLabels}
              patchDraft={patchDraft}
              setOfferField={setOfferField}
              setVehicleExtra={setVehicleExtra}
            />
          </TimetableContactDrawerSectionNav>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/45 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ring-2 ring-white ${
                dirty
                  ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.55)] motion-safe:animate-pulse motion-reduce:animate-none'
                  : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.45)]'
              }`}
              aria-hidden
            />
            <p className="min-w-0 text-xs font-medium text-slate-600 sm:text-[13px]">
              {dirty
                ? t('timetableContactUnsaved', 'You have unsaved changes.')
                : t('timetableContactSavedState', 'All changes saved to this device.')}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!dirty}
              className="h-9 min-w-[6.5rem] rounded-lg border border-slate-200/90 bg-white px-4 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:h-9 sm:rounded-xl sm:px-5 sm:text-sm"
            >
              {t('timetableContactDiscard', 'Discard')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 min-w-[8.5rem] rounded-lg bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 text-xs font-semibold text-white shadow-md shadow-slate-900/20 ring-1 ring-white/10 transition duration-200 hover:brightness-110 active:scale-[0.98] sm:rounded-xl sm:px-6 sm:text-sm"
            >
              {t('timetableContactSave', 'Save contact')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
