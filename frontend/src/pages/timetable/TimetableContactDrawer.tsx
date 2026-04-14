import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, ExternalLink, MapPin, Phone, Plus, Sparkles, Trash2, Truck, X } from 'lucide-react';
import type {
  TimetableContactProfile,
  TimetableEntry,
  TimetableOverviewKundeDraft,
  TimetableTruckOffer,
  TimetableVehicleDisplayExtra,
} from '../../types/timetable';
import type { KundenStamm } from '../../types/kunden';
import { loadKundenDb, resolveKundeForTimetableRow } from '../../store/kundenStore';
import { GlobalAddressSearch, type GlobalAddressResult } from '../../components/GlobalAddressSearch';
import { safeWebsiteHref } from '../../common/utils/websiteHref';
import {
  ADRESSE_COLORS,
  ADRESSE_TYP_I18N,
  ADRESSE_TYPEN,
  landCodeToArtLand,
} from '../../features/customers/mappers/customerFormConstants';
import { emptyContactPerson, ensureProfile, EMPTY_OFFER, offerHasContent } from './contactDrawerFormUtils';
import { inputClass, labelClass, textareaClass } from './contactDrawerFormClasses';
import { TimetableOfferGeneratorBlock } from './components/TimetableOfferGeneratorBlock';
import { TimetableOfferMinimalBlock } from './components/TimetableOfferMinimalBlock';
import {
  emptyOverviewAdresse,
  formatOverviewAddressLine,
  normalizeTimetableOverviewKunde,
  timetableOverviewFromEntry,
} from './timetableOverviewKunde';
import { TimetableExtraKontakteBlock } from './components/TimetableExtraKontakteBlock';

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
    (draft.company_name || '').trim() ||
    t('timetableContactAiNoCompany', 'Company not set');
  const contact =
    (draft.contact_name || '').trim() ||
    t('timetableContactAiNoPerson', 'Contact not named');
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
        'Trucks signal — vehicle offer is not edited in this view.'
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
        'No correspondence text on file for this row in the current view.'
      )
    );
  }
  return bullets.slice(0, 5);
}

function vehicleExtraHasContent(v: TimetableVehicleDisplayExtra | undefined): boolean {
  if (!v) return false;
  if (v.body_type?.trim()) return true;
  if (v.registration_mm_yyyy?.trim()) return true;
  if (v.processor_name?.trim()) return true;
  if (v.processor_entered?.trim()) return true;
  if (v.processor_fetched?.trim()) return true;
  if (v.processor_negotiated?.trim()) return true;
  if (v.mileage_replacement_km != null) return true;
  if (v.customer_price_eur != null) return true;
  if (v.sold) return true;
  if (v.deregistered) return true;
  return false;
}

const ART_LAND_OPTIONS = ['IL', 'EU', 'Drittland'] as const;

const ZUSTAENDIGE_OPTIONS = [
  'nicht zugeordnet',
  'Liciu Ana-Maria',
  'Mitsos Deligiannis',
  'Anna Schmidt',
  'Team Verkauf',
];

const TT_KUNDE_PANEL_SURFACE = 'overflow-hidden rounded-2xl';
const TT_KUNDE_SECTION_TITLE = 'text-sm font-bold uppercase tracking-[0.08em] text-slate-700';

function mergeMasterOverview(base: TimetableOverviewKundeDraft, mk: KundenStamm): TimetableOverviewKundeDraft {
  const first = base.adressen[0] ?? emptyOverviewAdresse('addr-0');
  const land = (mk.land_code ?? first.land_code).trim() || first.land_code;
  return normalizeTimetableOverviewKunde({
    ...base,
    kunden_nr: mk.kunden_nr?.trim() || base.kunden_nr,
    branche: (mk.branche ?? base.branche).trim(),
    firmenvorsatz: (mk.firmenvorsatz ?? base.firmenvorsatz).trim(),
    firmenname: (mk.firmenname ?? base.firmenname).trim(),
    website: (mk.internet_adr ?? base.website).trim(),
    customer_type:
      mk.customer_type === 'legal_entity'
        ? 'legal_entity'
        : mk.customer_type === 'natural_person'
          ? 'natural_person'
          : base.customer_type,
    customer_status:
      mk.status === 'inactive' || mk.status === 'blocked' || mk.status === 'active'
        ? mk.status
        : base.customer_status,
    adressen: [
      {
        ...first,
        strasse: (mk.strasse ?? first.strasse).trim(),
        plz: (mk.plz ?? first.plz).trim(),
        ort: (mk.ort ?? first.ort).trim(),
        land_code: land,
        art_land_code: (
          (mk.art_land_code || mk.tax_country_type_code || '').trim() || landCodeToArtLand(land)
        ).slice(0, 32),
        ust_id_nr: (mk.ust_id_nr ?? first.ust_id_nr).trim(),
        steuer_nr: (mk.steuer_nr ?? first.steuer_nr).trim(),
      },
      ...base.adressen.slice(1),
    ],
  });
}

async function copyTextToClipboard(text: string): Promise<void> {
  const v = text.trim();
  if (!v) return;
  try {
    await navigator.clipboard.writeText(v);
  } catch {
    /* ignore */
  }
}

/** Staggered entrance for smart summary card (motion-safe). */
function overviewStaggerClass(ms: number): string {
  return `motion-safe:animate-contact-card-in motion-reduce:animate-none [animation-delay:${ms}ms]`;
}

function ContactSmartSummaryCard({
  bullets,
  t,
  variant = 'inline',
}: {
  bullets: string[];
  t: (key: string, fallback: string) => string;
  /** `dropdown` = inside toolbar popover (no page-level stagger). */
  variant?: 'inline' | 'dropdown';
}) {
  const shell =
    variant === 'dropdown'
      ? 'relative overflow-hidden rounded-2xl border border-blue-200/45 bg-gradient-to-br from-blue-50/90 via-white/75 to-slate-50/50 p-3.5 shadow-none ring-1 ring-blue-500/[0.08] backdrop-blur-md sm:p-4'
      : `relative overflow-hidden rounded-3xl border border-blue-200/45 bg-gradient-to-br from-blue-50/85 via-white/60 to-indigo-50/40 p-4 shadow-[0_24px_56px_-24px_rgba(30,58,138,0.22)] backdrop-blur-xl ring-1 ring-blue-500/[0.08] sm:p-5 ${overviewStaggerClass(0)}`;

  return (
    <div className={shell}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-400/20 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-40 rounded-full bg-indigo-400/18 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none [animation-delay:-11s]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div
          className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-600/35 ring-2 ring-white/30 ${variant === 'dropdown' ? 'h-9 w-9' : 'h-11 w-11'}`}
        >
          <Sparkles
            className={variant === 'dropdown' ? 'h-4 w-4' : 'h-5 w-5'}
            strokeWidth={2}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-bold tracking-tight text-slate-900 ${variant === 'dropdown' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}
            >
              {t('timetableContactAiTitle', 'Smart summary')}
            </h3>
            <span className="rounded-full bg-blue-600/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-900 ring-1 ring-blue-500/25">
              {t('timetableContactAiBadge', 'Live')}
            </span>
          </div>
          <ul className="mt-3 space-y-2.5" aria-label={t('timetableContactAiAria', 'Smart summary bullets')}>
            {bullets.map((line, i) => (
              <li
                key={`${i}-${line.slice(0, 12)}`}
                className={`flex gap-2.5 leading-snug text-slate-700 ${variant === 'dropdown' ? 'text-xs sm:text-sm' : 'text-sm'} ${variant === 'inline' ? overviewStaggerClass(70 + i * 55) : ''}`}
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-blue-500 to-sky-400 shadow-sm shadow-blue-500/40"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p
            className={`mt-3.5 leading-relaxed text-slate-500 ${variant === 'dropdown' ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs'}`}
          >
            {t(
              'timetableContactAiDisclaimer',
              'Built from your fields on this device — no cloud AI, nothing sent online.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
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
  /** Split master/contact vs. offer so the offer generator is not shown on the call workspace. */
  const [drawerWorkspaceTab, setDrawerWorkspaceTab] = useState<'call' | 'offer'>('call');
  const smartSummaryRef = useRef<HTMLDivElement>(null);
  const prevEntryIdRef = useRef<number | null>(null);

  useEffect(() => {
    const onKunden = () => setKundenDbTick((n) => n + 1);
    window.addEventListener('dema-kunden-db-changed', onKunden);
    return () => window.removeEventListener('dema-kunden-db-changed', onKunden);
  }, []);

  useEffect(() => {
    setDrawerWorkspaceTab('call');
  }, [entry?.id]);

  useLayoutEffect(() => {
    if (!entry) {
      setDraft(null);
      prevEntryIdRef.current = null;
      return;
    }
    const needReset =
      prevEntryIdRef.current === null || prevEntryIdRef.current !== entry.id;
    if (needReset) {
      const next = cloneEntry(entry);
      const pr = { ...(next.contact_profile ?? {}) };
      if (!pr.overview_kunde) {
        let o = timetableOverviewFromEntry(next);
        const mk = resolveKundeForTimetableRow(loadKundenDb(), next.company_name, pr.customer_number);
        if (mk) o = mergeMasterOverview(o, mk);
        pr.overview_kunde = normalizeTimetableOverviewKunde(o);
      }
      const contacts = pr.contacts ?? [];
      if (contacts.length === 0 && (next.contact_name.trim() || next.phone.trim())) {
        const ec = emptyContactPerson();
        pr.contacts = [
          {
            ...ec,
            name: next.contact_name.trim() || ec.name,
            telefon: next.phone.trim() || ec.telefon,
          },
        ];
      }
      next.contact_profile = pr;
      setDraft(next);
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
    setSmartSummaryOpen(false);
  }, [entry?.id]);

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

  const smartBullets = useMemo(() => {
    if (!draft) return [] as string[];
    return getContactSmartBullets(draft, ensureProfile(draft), localeTag, t);
  }, [draft, localeTag, t]);

  const masterKundeForHeader = useMemo(() => {
    if (!draft) return null;
    const pr = ensureProfile(draft);
    return resolveKundeForTimetableRow(loadKundenDb(), draft.company_name, pr.customer_number);
  }, [draft, kundenDbTick]);

  /** CRM snapshot: master DB first, then contact_profile, then translated demo placeholders. */
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

  const patchOverviewKunde = useCallback(
    (fn: (k: TimetableOverviewKundeDraft) => TimetableOverviewKundeDraft) => {
      patchDraft((prev) => {
        const pr = ensureProfile(prev);
        const cur = pr.overview_kunde ?? timetableOverviewFromEntry(prev);
        return {
          ...prev,
          contact_profile: {
            ...pr,
            overview_kunde: normalizeTimetableOverviewKunde(fn(cur)),
          },
        };
      });
    },
    [patchDraft]
  );

  const setOfferField = useCallback(
    (patch: Partial<TimetableTruckOffer>) => {
      patchDraft((prev) => {
        const cur = prev.offer ?? { ...EMPTY_OFFER };
        return { ...prev, offer: { ...cur, ...patch } };
      });
    },
    [patchDraft]
  );

  const setVehicleExtra = useCallback(
    (patch: Partial<TimetableVehicleDisplayExtra>) => {
      patchDraft((prev) => {
        const pr = ensureProfile(prev);
        return {
          ...prev,
          contact_profile: {
            ...pr,
            vehicle_extra: { ...(pr.vehicle_extra ?? {}), ...patch },
          },
        };
      });
    },
    [patchDraft]
  );

  const handleSave = useCallback(() => {
    if (!draft || !entry) return;
    const next = cloneEntry(draft);
    const nowIso = new Date().toISOString();

    const prSave = next.contact_profile ? { ...next.contact_profile } : undefined;
    const ov = prSave?.overview_kunde;
    if (ov?.firmenname?.trim()) next.company_name = ov.firmenname.trim();
    const c0 = prSave?.contacts?.[0];
    if (c0?.name?.trim()) next.contact_name = c0.name.trim();
    if (c0?.telefon?.trim()) next.phone = c0.telefon.trim();
    if (prSave) next.contact_profile = prSave;

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
  const overview = normalizeTimetableOverviewKunde(
    draft.contact_profile?.overview_kunde ?? timetableOverviewFromEntry(draft)
  );
  const offer = draft.offer ?? EMPTY_OFFER;
  const ve = p.vehicle_extra ?? {};
  const companyTitle =
    (overview.firmenname || draft.company_name).trim() || t('commonPlaceholderDash', '—');
  const addressLine = formatOverviewAddressLine(overview);
  const safeAdresseIdx = Math.min(
    Math.max(0, overview.active_adresse_idx ?? 0),
    Math.max(0, overview.adressen.length - 1)
  );
  const activeAddr = overview.adressen[safeAdresseIdx] ?? overview.adressen[0]!;
  const adCol = ADRESSE_COLORS[safeAdresseIdx % ADRESSE_COLORS.length]!;
  const adInitials = activeAddr.ort
    ? activeAddr.ort.slice(0, 2).toUpperCase()
    : String(safeAdresseIdx + 1);

  const statusChipLabel =
    overview.customer_status === 'active'
      ? t('newCustomerStatusActive', 'Active')
      : overview.customer_status === 'inactive'
        ? t('newCustomerStatusInactive', 'Inactive')
        : t('newCustomerStatusBlocked', 'Blocked');

  const patchAdresseIdx = (idx: number, patch: Partial<(typeof overview.adressen)[0]>) => {
    patchOverviewKunde((k0) => {
      const list = [...k0.adressen];
      const cur = list[idx];
      if (!cur) return k0;
      list[idx] = { ...cur, ...patch };
      return { ...k0, adressen: list };
    });
  };

  const modalUi = (
    <div
      className="customers-modal-genz-backdrop dema-modal-backdrop-vibe fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="customers-modal-genz-panel relative flex w-full min-w-0 max-h-[92vh] max-w-[min(118rem,99vw)] flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-contact-drawer-title"
      >
        <div className="customers-modal-genz-topline pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px]" aria-hidden />
        <div className="customers-modal-genz-header relative shrink-0 border-b border-transparent px-4 py-2.5 pr-14 sm:pl-5 sm:pr-16 md:pr-20">
          <button
            type="button"
            onClick={onClose}
            className="customers-modal-genz-icon-btn absolute right-2 top-2 rounded p-2"
            aria-label={t('commonClose', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="customers-modal-genz-header-summary space-y-2">
                <p className="customers-modal-genz-header-eyeline">
                  {t('timetableContactHeaderEyeline', 'Calendar · customer contact')}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="timetable-contact-drawer-title"
                    className="min-w-0 max-w-full text-lg font-bold tracking-tight sm:text-xl"
                  >
                    <span className="customers-modal-genz-header-link truncate">{companyTitle}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => void copyTextToClipboard(companyTitle)}
                    disabled={!companyTitle.trim()}
                    className="customers-modal-genz-icon-btn shrink-0 rounded-md p-1 transition disabled:pointer-events-none disabled:opacity-30"
                    aria-label={t('newCustomerCopyCompanyNameAria', 'Copy company name')}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="customers-modal-genz-mode-badge shrink-0 rounded-md px-2 py-0.5 text-xs">
                    {t('timetableContactCalendarEditBadge', '(Edit)')}
                  </span>
                </div>
                <div className="customers-modal-genz-header-address-row flex items-start gap-2.5 text-lg font-bold leading-snug tracking-tight sm:gap-3 sm:text-xl">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 sm:mt-1.5 sm:h-6 sm:w-6" aria-hidden />
                  <span className="block min-w-0 flex-1">
                    <span className="inline-block max-w-full align-top leading-snug">
                      <span className="customers-modal-genz-header-link inline align-top break-words">
                        {addressLine.trim() ? addressLine : t('commonPlaceholderDash', '—')}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyTextToClipboard(addressLine)}
                        disabled={!addressLine.trim()}
                        className="customers-modal-genz-icon-btn ml-1 inline-flex shrink-0 align-top rounded-md p-1 transition disabled:pointer-events-none disabled:opacity-30 sm:ml-1.5"
                        aria-label={t('newCustomerCopyAddressAria', 'Copy address')}
                      >
                        <Copy className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                      </button>
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="customers-modal-genz-h-chip customers-modal-genz-h-chip--metric cursor-default text-[11px]">
                    {outcomeLabel(draft, t)}
                  </span>
                  <span
                    data-dema-chip="tt-status"
                    className="customers-modal-genz-h-chip customers-modal-genz-h-chip--metric cursor-default"
                  >
                    {t('newCustomerLabelStatus', 'Status')}: {statusChipLabel}
                  </span>
                  <span
                    data-dema-chip="tt-slot"
                    className="customers-modal-genz-h-chip customers-modal-genz-h-chip--metric cursor-default tabular-nums"
                  >
                    {slotDate} · {slotTime}
                  </span>
                  {draft.is_parked ? (
                    <span className="customers-modal-genz-h-chip">{t('timetableFilterParked', 'Parked')}</span>
                  ) : null}
                  {p.purchase_confirmed ? (
                    <span className="customers-modal-genz-h-chip">{t('timetableContactPurchaseConfirmed', 'Purchase confirmed')}</span>
                  ) : null}
                  <div
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white/80 px-1.5 py-0.5"
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
                      className="h-7 w-7 border-0 bg-transparent text-center text-xs font-semibold text-slate-800 outline-none ring-0"
                    />
                    <span className="text-[10px] text-slate-400">/</span>
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
                      className="h-7 w-9 border-0 bg-transparent text-center text-xs font-semibold text-slate-800 outline-none ring-0"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="customers-modal-genz-header-meta flex shrink-0 flex-col gap-2 text-right text-sm sm:text-base">
              <div>
                <p className="customers-modal-genz-header-meta-label">
                  {t('timetableContactAufnahmeMeta', 'Appointment')}
                </p>
                <p className="customers-modal-genz-header-meta-value tabular-nums">
                  {slotDate} · {slotTime}
                </p>
              </div>
              <div>
                <p className="customers-modal-genz-header-meta-label">{t('customersLabelCustomerNr', 'Customer no.')}</p>
                <p className="customers-modal-genz-header-meta-value font-mono tabular-nums">
                  {headerCrmDisplay.kuNr}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200/70 bg-gradient-to-b from-white to-slate-50/90 px-3 pb-2 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-4 sm:pb-2 sm:pt-2.5 md:px-5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
            <div
              role="tablist"
              aria-label={t('timetableContactDrawerTabsAria', 'Contact workspace')}
              className="flex min-w-0 shrink-0 flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-2"
            >
              <button
                type="button"
                role="tab"
                id="tt-drawer-tab-call"
                aria-selected={drawerWorkspaceTab === 'call'}
                aria-controls="tt-drawer-panel-call"
                onClick={() => setDrawerWorkspaceTab('call')}
                className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold transition duration-200 active:scale-[0.98] sm:h-9 sm:rounded-xl sm:px-3.5 sm:text-xs ${
                  drawerWorkspaceTab === 'call'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/25 ring-1 ring-white/10 hover:brightness-105'
                    : 'border border-blue-200/90 bg-white text-blue-950 shadow-sm ring-1 ring-blue-900/5 hover:border-blue-300 hover:bg-blue-50/80'
                }`}
              >
                <Phone className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
                <span>{t('timetableContactDrawerTabCall', 'Call & contact')}</span>
              </button>
              <button
                type="button"
                role="tab"
                id="tt-drawer-tab-offer"
                aria-selected={drawerWorkspaceTab === 'offer'}
                aria-controls="tt-drawer-panel-offer"
                onClick={() => setDrawerWorkspaceTab('offer')}
                className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold transition duration-200 active:scale-[0.98] sm:h-9 sm:rounded-xl sm:px-3.5 sm:text-xs ${
                  drawerWorkspaceTab === 'offer'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-900/20 ring-1 ring-white/15 hover:brightness-105'
                    : 'border border-slate-200/90 bg-white text-slate-800 shadow-sm ring-1 ring-slate-900/5 hover:border-amber-200 hover:bg-amber-50/60'
                }`}
              >
                <Truck className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
                <span>{t('timetableContactColOffer', 'Offer')}</span>
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
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-[115] w-[min(calc(100vw-1.5rem),22rem)] max-h-[min(65dvh,26rem)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-2xl shadow-blue-900/18 ring-1 ring-slate-900/[0.06] backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/90"
                  >
                    <ContactSmartSummaryCard bullets={smartBullets} t={t} variant="dropdown" />
                  </div>
                ) : null}
              </div>
            </div>
            </div>
          </div>

          <div
            className="customers-modal-genz-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 has-edit-side sm:px-6 sm:py-5"
            role="region"
            aria-label={t('timetableContactDrawerBodyAria', 'Customer contact — main area')}
          >
            <div
              className={`grid items-stretch gap-5 md:gap-6 ${
                drawerWorkspaceTab === 'call'
                  ? 'grid-cols-1 lg:grid-cols-3 min-[1420px]:grid-cols-3'
                  : 'grid-cols-1'
              }`}
            >
              {drawerWorkspaceTab === 'call' ? (
                <div
                  id="tt-drawer-panel-call"
                  role="tabpanel"
                  aria-labelledby="tt-drawer-tab-call"
                  className="contents"
                >
              <div
                className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--1 min-w-0 space-y-4 border border-slate-200/60 bg-white/90 p-5 shadow-sm sm:p-6 ${TT_KUNDE_PANEL_SURFACE} lg:col-span-1`}
              >
                <p className={`${TT_KUNDE_SECTION_TITLE} customers-modal-genz-kunde-col-title--1`}>
                  {t('customerModalColStammdaten', 'Master data')}
                </p>
                <div>
                  <label className={labelClass}>{t('newCustomerLabelFirmenvorsatz', 'Company prefix')}</label>
                  <input
                    type="text"
                    value={overview.firmenvorsatz}
                    onChange={(e) =>
                      patchOverviewKunde((k) => ({ ...k, firmenvorsatz: e.target.value }))
                    }
                    className={`${inputClass} min-h-[44px]`}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('newCustomerLabelFirmenname', 'Company name')}</label>
                  <input
                    type="text"
                    value={overview.firmenname}
                    onChange={(e) =>
                      patchOverviewKunde((k) => ({ ...k, firmenname: e.target.value }))
                    }
                    className={`${inputClass} min-h-[44px]`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  {overview.adressen.map((ad, i) => {
                    const dc = ADRESSE_COLORS[i % ADRESSE_COLORS.length]!;
                    const isActive = i === safeAdresseIdx;
                    return (
                      <button
                        key={ad.id}
                        type="button"
                        onClick={() => patchOverviewKunde((k) => ({ ...k, active_adresse_idx: i }))}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                          isActive
                            ? `${dc.activePill} text-white shadow-sm`
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-white/60' : dc.dotActive}`} />
                        {t(...(ADRESSE_TYP_I18N[ad.typ] ?? [ad.typ, ad.typ]))}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() =>
                      patchOverviewKunde((k) => {
                        const nextTyp = ADRESSE_TYPEN[k.adressen.length] ?? 'Sonstiges';
                        return {
                          ...k,
                          adressen: [
                            ...k.adressen,
                            { ...emptyOverviewAdresse(`addr-${k.adressen.length}-${Date.now()}`), typ: nextTyp },
                          ],
                          active_adresse_idx: k.adressen.length,
                        };
                      })
                    }
                    className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Plus className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                    {t('newCustomerAdresseNewBtn', 'New')}
                  </button>
                </div>
                <div className="customers-modal-genz-frost-card overflow-hidden rounded-2xl border border-white/60">
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${adCol.activePill}`}
                      >
                        {adInitials}
                      </div>
                      <select
                        value={activeAddr.typ}
                        onChange={(e) => patchAdresseIdx(safeAdresseIdx, { typ: e.target.value })}
                        className="cursor-pointer border-0 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
                      >
                        {ADRESSE_TYPEN.map((typ) => (
                          <option key={typ} value={typ}>
                            {t(...(ADRESSE_TYP_I18N[typ] ?? [typ, typ]))}
                          </option>
                        ))}
                      </select>
                    </div>
                    {overview.adressen.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          patchOverviewKunde((k) => {
                            const list = k.adressen.filter((_, i) => i !== safeAdresseIdx);
                            return {
                              ...k,
                              adressen: list.length ? list : [emptyOverviewAdresse('addr-0')],
                              active_adresse_idx: Math.max(0, safeAdresseIdx - 1),
                            };
                          })
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        title={t('newCustomerAdresseRemove', 'Remove address')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-2 p-3">
                    <div>
                      <label className={labelClass}>{t('globalAddrSearchLabel', 'Address search (worldwide)')}</label>
                      <GlobalAddressSearch
                        onSelect={(r: GlobalAddressResult) => {
                          const road = r.strasse?.trim();
                          const line1 =
                            road && road.length > 0
                              ? road
                              : (r.label.split(',')[0]?.trim() ?? '');
                          const code = (r.land_code ?? '').toUpperCase();
                          const landOk = /^[A-Z]{2}$/.test(code);
                          patchAdresseIdx(safeAdresseIdx, {
                            strasse: line1,
                            plz: r.plz ?? '',
                            ort: r.ort ?? '',
                            ...(landOk
                              ? { land_code: code, art_land_code: landCodeToArtLand(code) }
                              : {}),
                          });
                        }}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('newCustomerLabelStrasse', 'Street')}</label>
                      <input
                        type="text"
                        value={activeAddr.strasse}
                        onChange={(e) => patchAdresseIdx(safeAdresseIdx, { strasse: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>{t('newCustomerLabelPLZ', 'ZIP')}</label>
                        <input
                          type="text"
                          value={activeAddr.plz}
                          onChange={(e) => patchAdresseIdx(safeAdresseIdx, { plz: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{t('newCustomerLabelOrt', 'City')}</label>
                        <input
                          type="text"
                          value={activeAddr.ort}
                          onChange={(e) => patchAdresseIdx(safeAdresseIdx, { ort: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>{t('newCustomerLabelLand', 'Country')}</label>
                        <input
                          type="text"
                          value={activeAddr.land_code}
                          onChange={(e) => {
                            const code = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
                            patchAdresseIdx(safeAdresseIdx, {
                              land_code: code,
                              art_land_code: landCodeToArtLand(code || 'DE'),
                            });
                          }}
                          className={inputClass}
                          maxLength={2}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{t('newCustomerLabelArtLand', 'Country type')}</label>
                        <select
                          value={activeAddr.art_land_code}
                          onChange={(e) =>
                            patchAdresseIdx(safeAdresseIdx, { art_land_code: e.target.value })
                          }
                          className={inputClass}
                        >
                          {ART_LAND_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>{t('newCustomerLabelUstIdNr', 'VAT ID no.')}</label>
                        <input
                          type="text"
                          value={activeAddr.ust_id_nr}
                          onChange={(e) => patchAdresseIdx(safeAdresseIdx, { ust_id_nr: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{t('newCustomerLabelSteuerNr', 'Tax no.')}</label>
                        <input
                          type="text"
                          value={activeAddr.steuer_nr}
                          onChange={(e) => patchAdresseIdx(safeAdresseIdx, { steuer_nr: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>{t('customersLabelWebsite', 'Website')}</label>
                      <input
                        type="text"
                        value={overview.website}
                        onChange={(e) => patchOverviewKunde((k) => ({ ...k, website: e.target.value }))}
                        className={inputClass}
                        placeholder={t('newCustomerPhWebsite', 'www.example.com')}
                        inputMode="url"
                        autoComplete="url"
                      />
                      {(() => {
                        const href = safeWebsiteHref(overview.website);
                        if (!href) return null;
                        return (
                          <p className="mt-1.5 min-w-0 text-xs">
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-full items-center gap-1 font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                            >
                              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                              <span className="truncate">{t('customersWebsiteOpenLink', 'Open website')}</span>
                            </a>
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--2 flex min-w-0 flex-col gap-3 border border-slate-200/60 bg-white/90 p-5 shadow-sm sm:p-6 ${TT_KUNDE_PANEL_SURFACE} lg:col-span-1`}
              >
                <TimetableExtraKontakteBlock
                  contacts={p.contacts}
                  patchDraft={patchDraft}
                  t={t}
                  fieldIdPrefix="tt-drawer-kontakt"
                  sectionTitleClassName={TT_KUNDE_SECTION_TITLE}
                  sectionTitleColSuffix="--2"
                  showCustomersStyleAppointments
                  appointmentHistory={p.appointment_history}
                />
              </div>

              <div
                className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--4 flex min-h-[min(70dvh,22rem)] min-w-0 flex-col border border-slate-200/60 bg-white/90 p-5 shadow-sm sm:p-6 ${TT_KUNDE_PANEL_SURFACE} lg:col-span-1 lg:min-h-[min(78dvh,28rem)]`}
              >
                <p
                  id="tt-drawer-bemerkungen-heading"
                  className={`${TT_KUNDE_SECTION_TITLE} customers-modal-genz-kunde-col-title--4 shrink-0`}
                >
                  {t('timetableContactBemerkungen', 'Remarks')}
                </p>
                <textarea
                  id="tt-drawer-bemerkungen"
                  aria-labelledby="tt-drawer-bemerkungen-heading"
                  value={draft.notes}
                  onChange={(e) => patchDraft((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={t(
                    'timetableContactTableNotesPh',
                    'Short notes visible in the timetable row.'
                  )}
                  className={`${textareaClass} mt-2 min-h-[min(58dvh,18rem)] flex-1 resize-y lg:min-h-0`}
                  spellCheck
                />
              </div>
                </div>
              ) : (
              <div
                id="tt-drawer-panel-offer"
                role="tabpanel"
                aria-labelledby="tt-drawer-tab-offer"
                className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--3 min-w-0 w-full space-y-4 border border-slate-200/60 bg-white/90 p-5 shadow-sm sm:p-6 ${TT_KUNDE_PANEL_SURFACE} grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6`}
              >
                <div className="min-w-0">
                  <TimetableOfferGeneratorBlock
                    rowKey={String(draft.id)}
                    setOfferField={setOfferField}
                    setVehicleExtra={setVehicleExtra}
                    onGeneratorApplied={() => setDirty(true)}
                    t={t}
                  />
                </div>
                <div className="min-w-0 space-y-4">
                  <p className={`${TT_KUNDE_SECTION_TITLE} customers-modal-genz-kunde-col-title--3`}>
                    {t('timetableContactColOffer', 'Offer')}
                  </p>
                  <div className="customers-modal-genz-frost-card rounded-2xl border border-white/60 p-4">
                    <TimetableOfferMinimalBlock
                      offer={offer}
                      vehicleExtra={ve}
                      setOfferField={setOfferField}
                      setVehicleExtra={setVehicleExtra}
                      onOpenFullOfferModal={() => onEditOffer(draft)}
                      t={t}
                    />
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>

          <div
            className={`customers-modal-genz-footer shrink-0 border-t px-4 py-3 is-edit-footer border-slate-200/80 sm:px-6`}
          >
            {dirty ? (
              <div
                className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                role="status"
              >
                {t('customer360UnsavedChanges', 'You have unsaved changes.')}
              </div>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                <label className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                  {t('newCustomerZustaendige', 'Responsible person')}
                </label>
                <select
                  value={p.zustaendige_person ?? 'nicht zugeordnet'}
                  onChange={(e) =>
                    patchDraft((prev) => {
                      const pr = ensureProfile(prev);
                      pr.zustaendige_person = e.target.value;
                      return { ...prev, contact_profile: { ...pr } };
                    })
                  }
                  className="h-11 min-h-[44px] w-full rounded border border-neutral-300 bg-white px-3 text-sm text-slate-800 sm:h-9 sm:min-h-0 sm:w-auto sm:max-w-xs"
                >
                  {ZUSTAENDIGE_OPTIONS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={!dirty}
                  className="customers-modal-genz-btn-cancel rounded px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t('timetableContactDiscard', 'Discard')}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  {t('timetableContactSave', 'Save contact')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalUi, document.body) : null;
}
