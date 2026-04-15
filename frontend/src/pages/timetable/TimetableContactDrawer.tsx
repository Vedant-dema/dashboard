import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Maximize2,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
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
import {
  createEmptyTruckOffer,
  emptyContactPerson,
  ensureOfferIdsAndSelection,
  ensureProfile,
  finalizeOffersForPersist,
  getActivityNotesLastSnippet,
  offerHasContent,
  withAutoNegotiationRoundsForEntry,
} from './contactDrawerFormUtils';
import { inputClass, labelClass, textareaClass } from './contactDrawerFormClasses';
import { TimetableActivityNotesThread } from './components/TimetableActivityNotesThread';
import { TimetableOfferGeneratorBlock } from './components/TimetableOfferGeneratorBlock';
import { TimetableOfferNegotiationHistory } from './components/TimetableOfferNegotiationHistory';
import { TimetableOfferMemoryPanel } from './components/TimetableOfferMemoryPanel';
import { TimetableOfferVehicleStrip } from './components/TimetableOfferVehicleStrip';
import { TimetableOfferMinimalBlock } from './components/TimetableOfferMinimalBlock';
import {
  emptyOverviewAdresse,
  formatOverviewAddressLine,
  normalizeTimetableOverviewKunde,
  timetableOverviewFromEntry,
} from './timetableOverviewKunde';
import { TimetableExtraKontakteBlock } from './components/TimetableExtraKontakteBlock';
import {
  collectTimetableOfferMemory,
  offerHasVehicleIdentity,
  type TimetableOfferMemoryItem,
} from './timetableOfferMemory';
import { useAuth } from '../../contexts/AuthContext';

type Props = {
  entry: TimetableEntry | null;
  allEntries: TimetableEntry[];
  localeTag: string;
  t: (key: string, fallback: string) => string;
  onClose: () => void;
  onPersist: (entry: TimetableEntry) => void;
  onLogCall: (entry: TimetableEntry) => void;
};

type DrawerWorkspaceTab = 'call' | 'offer';

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

/** Map row outcome to existing `data-dema-chip` palettes (same orbit ring as customer / Kalender chips). */
function timetableOutcomeToDemaChip(outcome: TimetableEntry['outcome']): string {
  if (outcome === 'has_trucks') return 'status-active';
  if (outcome === 'follow_up') return 'doc-calm';
  if (outcome === 'no_trucks') return 'vat-invalid';
  return 'vat-unknown';
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
  const offerLine = (draft.offers ?? []).find((o) => offerHasContent(o));
  if (offerLine) {
    const o = offerLine;
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
  const act = getActivityNotesLastSnippet(profile, draft.notes, draft.scheduled_at);
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
            <span className="tt-drawer-ai-live-tag rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ring-1">
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
  allEntries,
  localeTag,
  t,
  onClose,
  onPersist,
  onLogCall,
}: Props) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<TimetableEntry | null>(null);
  const [dirty, setDirty] = useState(false);
  const [smartSummaryOpen, setSmartSummaryOpen] = useState(false);
  const [kundenDbTick, setKundenDbTick] = useState(0);
  /** Split master/contact vs. offer so the offer generator is not shown on the call workspace. */
  const [drawerWorkspaceTab, setDrawerWorkspaceTab] = useState<DrawerWorkspaceTab>('call');
  const [bemerkungenComfortOpen, setBemerkungenComfortOpen] = useState(false);
  const [copyFlash, setCopyFlash] = useState<'ok' | 'err' | null>(null);
  const smartSummaryRef = useRef<HTMLDivElement>(null);
  const prevEntryIdRef = useRef<number | null>(null);
  const copyFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const companyFieldAnchorRef = useRef<HTMLDivElement>(null);
  const addressBlockAnchorRef = useRef<HTMLDivElement>(null);

  const copyWithFlash = useCallback(async (text: string) => {
    const v = text.trim();
    if (!v) return;
    try {
      await navigator.clipboard.writeText(v);
      setCopyFlash('ok');
    } catch {
      setCopyFlash('err');
    }
    if (copyFlashTimerRef.current) clearTimeout(copyFlashTimerRef.current);
    copyFlashTimerRef.current = setTimeout(() => setCopyFlash(null), 2000);
  }, []);

  const goToCompanyFromSummary = useCallback(() => {
    companyFieldAnchorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  const goToAddressFromSummary = useCallback(() => {
    addressBlockAnchorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, []);

  useEffect(() => {
    setCopyFlash(null);
  }, [entry?.id]);

  useEffect(
    () => () => {
      if (copyFlashTimerRef.current) clearTimeout(copyFlashTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const onKunden = () => setKundenDbTick((n) => n + 1);
    window.addEventListener('dema-kunden-db-changed', onKunden);
    return () => window.removeEventListener('dema-kunden-db-changed', onKunden);
  }, []);

  useEffect(() => {
    setDrawerWorkspaceTab('call');
  }, [entry?.id]);

  useEffect(() => {
    setBemerkungenComfortOpen(false);
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
      setDraft(ensureOfferIdsAndSelection(next));
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
      return ensureOfferIdsAndSelection(cloneEntry(parsed));
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
        if (bemerkungenComfortOpen) {
          setBemerkungenComfortOpen(false);
          return;
        }
        if (smartSummaryOpen) {
          setSmartSummaryOpen(false);
          return;
        }
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [bemerkungenComfortOpen, entry, onClose, smartSummaryOpen]);

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

  useEffect(() => {
    if (drawerWorkspaceTab !== 'offer' || !draft) return;
    if ((draft.offers ?? []).length > 0) return;
    patchDraft((prev) => {
      if (!prev || (prev.offers ?? []).length > 0) return prev;
      const nu = createEmptyTruckOffer();
      return { ...prev, offers: [nu], selected_offer_id: nu.id };
    });
  }, [drawerWorkspaceTab, draft, patchDraft]);

  const selectOfferId = useCallback(
    (id: string) => {
      patchDraft((prev) => ({ ...prev, selected_offer_id: id }));
    },
    [patchDraft]
  );

  const addVehicleOffer = useCallback(() => {
    patchDraft((prev) => {
      const nu = createEmptyTruckOffer();
      return {
        ...prev,
        offers: [...(prev.offers ?? []), nu],
        selected_offer_id: nu.id,
      };
    });
  }, [patchDraft]);

  const removeVehicleOffer = useCallback(
    (id: string) => {
      patchDraft((prev) => {
        const e0 = ensureOfferIdsAndSelection(prev);
        const nextOffers = e0.offers.filter((o) => o.id !== id);
        let selected_offer_id = e0.selected_offer_id;
        if (selected_offer_id === id) selected_offer_id = nextOffers[0]?.id ?? null;
        const pr = ensureProfile(e0);
        const vex = { ...(pr.vehicle_extras ?? {}) };
        delete vex[id];
        const nextPr: TimetableContactProfile = { ...pr };
        if (Object.keys(vex).length > 0) nextPr.vehicle_extras = vex;
        else delete nextPr.vehicle_extras;
        return {
          ...e0,
          offers: nextOffers,
          selected_offer_id,
          contact_profile: nextPr,
        };
      });
    },
    [patchDraft]
  );

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
        const e0 = ensureOfferIdsAndSelection(prev);
        const sid = e0.selected_offer_id ?? e0.offers[0]?.id;
        let offers = [...e0.offers];
        if (!sid && offers.length === 0) {
          const nu = createEmptyTruckOffer();
          return { ...prev, offers: [{ ...nu, ...patch }], selected_offer_id: nu.id };
        }
        const idx = sid ? offers.findIndex((o) => o.id === sid) : -1;
        if (idx < 0 || !offers[idx]) return e0;
        offers[idx] = { ...offers[idx]!, ...patch };
        return { ...e0, offers, selected_offer_id: sid };
      });
    },
    [patchDraft]
  );

  const setVehicleExtra = useCallback(
    (patch: Partial<TimetableVehicleDisplayExtra>) => {
      patchDraft((prev) => {
        const e0 = ensureOfferIdsAndSelection(prev);
        const sid = e0.selected_offer_id ?? e0.offers[0]?.id;
        if (!sid) {
          const nu = createEmptyTruckOffer();
          return {
            ...prev,
            offers: [nu],
            selected_offer_id: nu.id,
            contact_profile: {
              ...ensureProfile(prev),
              vehicle_extras: { [nu.id]: { ...patch } },
            },
          };
        }
        const pr = ensureProfile(e0);
        const vex = { ...(pr.vehicle_extras ?? {}) };
        vex[sid] = { ...(vex[sid] ?? {}), ...patch };
        return {
          ...e0,
          contact_profile: { ...pr, vehicle_extras: vex },
        };
      });
    },
    [patchDraft]
  );

  const applyOfferMemoryPrices = useCallback(
    (item: TimetableOfferMemoryItem) => {
      setOfferField({
        expected_price_eur: item.latestSellerAskingEur,
        purchase_bid_eur: item.latestPurchaseBidEur,
      });
    },
    [setOfferField]
  );

  const handleSave = useCallback(() => {
    if (!draft || !entry) return;
    let next = cloneEntry(draft);
    const nowIso = new Date().toISOString();
    const author = (user?.name ?? user?.email ?? '').trim();

    const prSave = next.contact_profile ? { ...next.contact_profile } : undefined;
    const ov = prSave?.overview_kunde;
    if (ov?.firmenname?.trim()) next.company_name = ov.firmenname.trim();
    const c0 = prSave?.contacts?.[0];
    if (c0?.name?.trim()) next.contact_name = c0.name.trim();
    if (c0?.telefon?.trim()) next.phone = c0.telefon.trim();
    if (prSave) next.contact_profile = prSave;
    next = withAutoNegotiationRoundsForEntry(next, nowIso, author || undefined);

    const fin = finalizeOffersForPersist(next, nowIso);
    next = fin.entry;
    const p = next.contact_profile ? { ...next.contact_profile } : undefined;
    if (p?.vehicle_extras && fin.prunedOfferIds.length > 0) {
      const vx = { ...p.vehicle_extras };
      for (const rid of fin.prunedOfferIds) delete vx[rid];
      if (Object.keys(vx).length > 0) p.vehicle_extras = vx;
      else delete p.vehicle_extras;
    }
    if (p?.vehicle_extras && Object.keys(p.vehicle_extras).length > 0) {
      delete p.vehicle_extra;
    }
    if (p?.vehicle_extra && !vehicleExtraHasContent(p.vehicle_extra)) {
      delete p.vehicle_extra;
    }
    if (p && !p.purchase_confirmed) {
      delete p.purchase_confirmed;
    }
    if (p) next.contact_profile = p;

    onPersist(next);
    setDirty(false);
  }, [draft, entry, onPersist, user?.email, user?.name]);

  const handleDiscard = useCallback(() => {
    if (!entry) return;
    setDraft(ensureOfferIdsAndSelection(cloneEntry(entry)));
    setDirty(false);
  }, [entry]);

  if (!entry || !draft) return null;

  const p = ensureProfile(draft);
  const eOffer = ensureOfferIdsAndSelection(draft);
  const { date: slotDate, time: slotTime } = formatRowDateTime(draft.scheduled_at, localeTag);
  const overview = normalizeTimetableOverviewKunde(
    draft.contact_profile?.overview_kunde ?? timetableOverviewFromEntry(draft)
  );
  const selectedOfferId = eOffer.selected_offer_id ?? eOffer.offers[0]?.id ?? '';
  const offer =
    eOffer.offers.find((o) => o.id === selectedOfferId) ?? eOffer.offers[0] ?? createEmptyTruckOffer();
  const ve =
    (selectedOfferId ? p.vehicle_extras?.[selectedOfferId] : undefined) ??
    (eOffer.offers.length === 1 && selectedOfferId === eOffer.offers[0]?.id ? p.vehicle_extra : undefined) ??
    {};
  const offerMemoryItems = collectTimetableOfferMemory({
    entries: allEntries,
    targetEntry: draft,
    targetOffer: offer,
    currentOfferId: selectedOfferId || null,
    limit: 7,
  });
  const hasVehicleIdentity = offerHasVehicleIdentity(offer);
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

  const slotLine = [slotDate, slotTime].filter(Boolean).join(' · ');
  const brancheMeta = headerCrmDisplay.branche.trim();

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
                    <button
                      type="button"
                      onClick={goToCompanyFromSummary}
                      title={t('newCustomerGoToFieldCompany', 'Open Customer & Address — company name')}
                      className="customers-modal-genz-header-link truncate text-left focus:outline-none rounded-sm"
                    >
                      {companyTitle}
                    </button>
                  </h2>
                  <button
                    type="button"
                    onClick={() => void copyWithFlash(companyTitle)}
                    disabled={!companyTitle.trim()}
                    className="customers-modal-genz-icon-btn shrink-0 rounded-md p-1 transition disabled:pointer-events-none disabled:opacity-30"
                    aria-label={t('newCustomerCopyCompanyNameAria', 'Copy company name')}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="customers-modal-genz-mode-badge tt-drawer-mode-badge shrink-0 rounded-md px-2 py-0.5 text-xs">
                    {t('timetableContactCalendarEditBadge', '(Edit)')}
                  </span>
                </div>
                <div className="customers-modal-genz-header-address-row flex items-start gap-2.5 text-lg font-bold leading-snug tracking-tight sm:gap-3 sm:text-xl">
                  <MapPin className="mt-1 h-5 w-5 shrink-0 sm:mt-1.5 sm:h-6 sm:w-6" aria-hidden />
                  <span className="block min-w-0 flex-1">
                    <span className="inline-block max-w-full align-top leading-snug">
                      <button
                        type="button"
                        onClick={goToAddressFromSummary}
                        title={t('newCustomerGoToFieldAddress', 'Open Customer & Address — street / ZIP / city')}
                        className="customers-modal-genz-header-link inline border-0 bg-transparent p-0 text-left align-top break-words text-inherit focus:outline-none rounded-sm"
                      >
                        {addressLine.trim() ? addressLine : t('commonPlaceholderDash', '—')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyWithFlash(addressLine)}
                        disabled={!addressLine.trim()}
                        className="customers-modal-genz-icon-btn ml-1 inline-flex shrink-0 align-top rounded-md p-1 transition disabled:pointer-events-none disabled:opacity-30 sm:ml-1.5"
                        aria-label={t('newCustomerCopyAddressAria', 'Copy address')}
                      >
                        <Copy className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                      </button>
                    </span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {copyFlash === 'ok' ? (
                    <span
                      className="customers-modal-genz-header-copy-flash--ok flex items-center gap-1 text-[10px] font-semibold"
                      role="status"
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {t('newCustomerCopiedToClipboard', 'Copied')}
                    </span>
                  ) : copyFlash === 'err' ? (
                    <span
                      className="customers-modal-genz-header-copy-flash--err text-[10px] font-semibold"
                      role="status"
                    >
                      {t('newCustomerCopyFailed', 'Copy failed')}
                    </span>
                  ) : null}
                </div>
                <div className="customers-modal-genz-header-chips-scroll -mx-1 max-w-full overflow-x-auto overflow-y-hidden pb-1">
                  <div className="customer360-strip-chips flex min-w-min flex-nowrap items-center gap-2 pr-2">
                    <span
                      data-dema-chip="aufnahme"
                      className="customers-modal-genz-h-chip customers-modal-genz-h-chip--meta min-w-0 max-w-full cursor-default sm:max-w-[min(100%,22rem)]"
                    >
                      <CalendarDays className="h-3 w-3 shrink-0 opacity-95 sm:h-3.5 sm:w-3.5" aria-hidden />
                      <span className="customers-modal-genz-h-chip-strong">
                        {t('timetableContactAufnahmeMeta', 'Appointment')}
                      </span>
                      <span className="min-w-0 truncate font-mono tabular-nums">
                        {slotLine || t('commonPlaceholderDash', '—')}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyWithFlash(slotLine)}
                        disabled={!slotLine.trim()}
                        className="tt-drawer-chip-copy"
                        aria-label={t('timetableContactCopySlotAria', 'Copy appointment date and time')}
                      >
                        <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                      </button>
                    </span>
                    <span
                      data-dema-chip={timetableOutcomeToDemaChip(draft.outcome)}
                      className="customers-modal-genz-h-chip cursor-default max-w-[min(100%,16rem)] sm:max-w-none"
                    >
                      <span className="min-w-0 truncate">{outcomeLabel(draft, t)}</span>
                    </span>
                    <span
                      data-dema-chip={`status-${overview.customer_status}`}
                      className={`customers-modal-genz-h-chip cursor-default customers-modal-genz-h-chip--status-${overview.customer_status}`}
                    >
                      {t('customer360ChipStatus', 'Status')}: {statusChipLabel}
                    </span>
                    {brancheMeta ? (
                      <span
                        data-dema-chip="risk-billing"
                        className="customers-modal-genz-h-chip customers-modal-genz-h-chip--meta min-w-0 max-w-full sm:max-w-[min(100%,24rem)]"
                      >
                        <span className="customers-modal-genz-h-chip-strong">
                          {t('newCustomerLabelBranche', 'Industry')}
                        </span>
                        <span className="min-w-0 truncate">{brancheMeta}</span>
                        <button
                          type="button"
                          onClick={() => void copyWithFlash(brancheMeta)}
                          className="tt-drawer-chip-copy"
                          aria-label={t('timetableContactCopyBrancheAria', 'Copy industry')}
                        >
                          <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                        </button>
                      </span>
                    ) : null}
                    {draft.is_parked ? (
                      <span
                        data-dema-chip="doc-calm"
                        className="customers-modal-genz-h-chip cursor-default shrink-0"
                      >
                        {t('timetableFilterParked', 'Parked')}
                      </span>
                    ) : null}
                    {p.purchase_confirmed ? (
                      <span
                        data-dema-chip="vat-valid"
                        className="customers-modal-genz-h-chip cursor-default shrink-0"
                      >
                        {t('timetableContactPurchaseConfirmed', 'Purchase confirmed')}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="customers-modal-genz-header-meta flex w-full min-w-0 shrink-0 flex-col items-stretch gap-3 border-t border-white/10 pt-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:pt-2 lg:border-t-0 lg:pt-0 lg:pl-2 xl:items-end">
              <div className="customers-modal-genz-ku-block tt-drawer-header-kd-block min-w-0 sm:max-w-[min(100%,15rem)]">
                <p className="customers-modal-genz-header-meta-label m-0 text-[10px] font-semibold uppercase tracking-[0.12em]">
                  {t('newCustomerModalKdNrLabel', 'Cust. no.')}
                </p>
                <div className="customers-modal-genz-ku-block-row mt-1">
                  <span className="customers-modal-genz-ku-block-value tabular-nums">{headerCrmDisplay.kuNr}</span>
                  <button
                    type="button"
                    onClick={() => void copyWithFlash(headerCrmDisplay.kuNr)}
                    disabled={!headerCrmDisplay.kuNr.trim()}
                    className="customers-modal-genz-icon-btn customers-modal-genz-ku-block-copy shrink-0 rounded-lg p-1.5 transition disabled:pointer-events-none disabled:opacity-30"
                    aria-label={t('newCustomerCopyKuNrAria', 'Copy customer number')}
                  >
                    <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                  </button>
                </div>
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
                className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold ring-1 transition duration-200 active:scale-[0.98] sm:h-9 sm:rounded-xl sm:px-3.5 sm:text-xs ${
                  drawerWorkspaceTab === 'call'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-900/25 ring-white/10 hover:brightness-105'
                    : 'border border-teal-200/90 bg-teal-50/90 text-teal-950 shadow-sm ring-teal-900/10 hover:border-teal-300 hover:bg-teal-100/85'
                }`}
              >
                <Phone className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
                <span>{t('timetableContactDrawerTabCall', 'Appointment')}</span>
              </button>
              <button
                type="button"
                role="tab"
                id="tt-drawer-tab-offer"
                aria-selected={drawerWorkspaceTab === 'offer'}
                aria-controls="tt-drawer-panel-offer"
                onClick={() => setDrawerWorkspaceTab('offer')}
                className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold ring-1 transition duration-200 active:scale-[0.98] sm:h-9 sm:rounded-xl sm:px-3.5 sm:text-xs ${
                  drawerWorkspaceTab === 'offer'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-900/20 ring-white/15 hover:brightness-105'
                    : 'border border-fuchsia-200/85 bg-fuchsia-50/85 text-fuchsia-950 shadow-sm ring-fuchsia-900/10 hover:border-fuchsia-300 hover:bg-fuchsia-100/80'
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
                <div ref={companyFieldAnchorRef} className="scroll-mt-6 space-y-4">
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
                <div
                  ref={addressBlockAnchorRef}
                  className="customers-modal-genz-frost-card scroll-mt-6 overflow-hidden rounded-2xl border border-white/60"
                >
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
                className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--4 flex min-h-[min(70dvh,22rem)] min-w-0 flex-col overflow-hidden border border-slate-200/60 bg-white/90 p-5 shadow-sm sm:p-6 ${TT_KUNDE_PANEL_SURFACE} lg:col-span-1 lg:min-h-[min(78dvh,28rem)]`}
              >
                <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
                  <p
                    id="tt-drawer-bemerkungen-heading"
                    className={`${TT_KUNDE_SECTION_TITLE} customers-modal-genz-kunde-col-title--4 min-w-0 flex-1`}
                  >
                    {t('timetableContactBemerkungen', 'Remarks')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setBemerkungenComfortOpen(true)}
                    aria-haspopup="dialog"
                    className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 sm:px-4"
                  >
                    <Maximize2 className="h-4 w-4 shrink-0 text-slate-600 sm:h-[1.125rem] sm:w-[1.125rem]" aria-hidden />
                    <span className="max-w-[11rem] text-left leading-tight sm:max-w-[16rem]">
                      {t('timetableContactBemerkungenOpenLarge', 'Large view')}
                    </span>
                  </button>
                </div>
                <div
                  id="tt-drawer-bemerkungen"
                  aria-labelledby="tt-drawer-bemerkungen-heading"
                  className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <TimetableActivityNotesThread
                    draft={draft}
                    profile={p}
                    patchDraft={patchDraft}
                    localeTag={localeTag}
                    t={t}
                    layout="drawerBemerkungen"
                  />
                </div>
              </div>
                </div>
              ) : (
              <div
                id="tt-drawer-panel-offer"
                role="tabpanel"
                aria-labelledby="tt-drawer-tab-offer"
                className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--3 flex min-w-0 w-full flex-col gap-6 border border-slate-200/60 bg-white p-5 shadow-sm sm:p-6 ${TT_KUNDE_PANEL_SURFACE}`}
              >
                <TimetableOfferVehicleStrip
                  offers={eOffer.offers}
                  selectedId={eOffer.selected_offer_id}
                  onSelect={selectOfferId}
                  onAdd={addVehicleOffer}
                  onRemove={removeVehicleOffer}
                  t={t}
                />
                <div className="flex min-w-0 w-full flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-0">
                <section
                  className="flex min-w-0 flex-1 flex-col gap-3 lg:basis-1/2 lg:pr-8"
                  aria-labelledby="tt-drawer-offer-gen-heading"
                >
                  <p
                    id="tt-drawer-offer-gen-heading"
                    className={`${TT_KUNDE_SECTION_TITLE} customers-modal-genz-kunde-col-title--3 shrink-0`}
                  >
                    {t('timetableOfferGenTitle', 'Offer generator')}
                  </p>
                  <div className="min-w-0 flex-1">
                    <TimetableOfferGeneratorBlock
                      rowKey={`${draft.id}-${selectedOfferId}`}
                      currentOffer={offer}
                      setOfferField={setOfferField}
                      setVehicleExtra={setVehicleExtra}
                      onGeneratorApplied={() => setDirty(true)}
                      t={t}
                    />
                  </div>
                </section>
                <div
                  className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-slate-200/90 to-transparent lg:hidden"
                  aria-hidden
                />
                <div
                  className="hidden w-px shrink-0 self-stretch bg-gradient-to-b from-transparent via-slate-200/85 to-transparent lg:block"
                  aria-hidden
                />
                <section
                  className="flex min-w-0 flex-1 flex-col gap-4 lg:basis-1/2 lg:pl-8"
                  aria-labelledby="tt-drawer-offer-form-heading"
                >
                  <p
                    id="tt-drawer-offer-form-heading"
                    className={`${TT_KUNDE_SECTION_TITLE} customers-modal-genz-kunde-col-title--3 shrink-0`}
                  >
                    {t('timetableContactColOffer', 'Offer')}
                  </p>
                  <TimetableOfferMinimalBlock
                    offer={offer}
                    vehicleExtra={ve}
                    setOfferField={setOfferField}
                    setVehicleExtra={setVehicleExtra}
                    t={t}
                  />
                  <TimetableOfferMemoryPanel
                    items={offerMemoryItems}
                    offerHasVehicleIdentity={hasVehicleIdentity}
                    localeTag={localeTag}
                    t={t}
                    onApplyPrices={applyOfferMemoryPrices}
                  />
                  <TimetableOfferNegotiationHistory
                    offer={offer}
                    setOfferField={setOfferField}
                    localeTag={localeTag}
                    t={t}
                  />
                </section>
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

  const bemerkungenComfortPortal =
    bemerkungenComfortOpen && typeof document !== 'undefined' ? (
      <div
        className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/55 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-[1px] sm:items-center sm:p-4 sm:pb-4"
        role="presentation"
        onClick={() => setBemerkungenComfortOpen(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tt-bemerkungen-large-title"
          className="flex max-h-[min(96dvh,64rem)] min-h-[min(52dvh,20rem)] w-full max-w-[min(80rem,100vw)] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:min-h-[min(58dvh,24rem)] sm:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0 flex-1 pr-2">
              <h2
                id="tt-bemerkungen-large-title"
                className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
              >
                {t('timetableContactBemerkungenLargeTitle', 'Remarks — large view')}
              </h2>
              <p className="mt-1.5 text-sm text-slate-600 sm:text-base">
                {t(
                  'timetableContactBemerkungenLargeHint',
                  'Larger text and more space to read and edit notes comfortably.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBemerkungenComfortOpen(false)}
              aria-label={t('commonClose', 'Close')}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-slate-300/80 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 sm:px-4"
            >
              <X className="h-5 w-5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{t('commonClose', 'Close')}</span>
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-5">
            <TimetableActivityNotesThread
              draft={draft}
              profile={p}
              patchDraft={patchDraft}
              localeTag={localeTag}
              t={t}
              layout="comfortOverlay"
            />
          </div>
        </div>
      </div>
    ) : null;

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(modalUi, document.body)}
      {bemerkungenComfortPortal ? createPortal(bemerkungenComfortPortal, document.body) : null}
    </>
  );
}
