import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Building2,
  Car,
  FileText,
  History,
  LayoutDashboard,
  Package,
  PhoneCall,
  Sparkles,
  Truck,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  TimetableAppointmentHistoryRow,
  TimetableAssignmentRow,
  TimetableContactPerson,
  TimetableContactProfile,
  TimetableEntry,
  TimetableOutcome,
  TimetableTruckOffer,
  TimetableVehicleDisplayExtra,
} from '../../types/timetable';
import { loadKundenDb, resolveKundeForTimetableRow } from '../../store/kundenStore';

type TabId = 'overview' | 'history' | 'vehicle' | 'activity';

type Props = {
  entry: TimetableEntry | null;
  localeTag: string;
  t: (key: string, fallback: string) => string;
  onClose: () => void;
  onPersist: (entry: TimetableEntry) => void;
  onLogCall: (entry: TimetableEntry) => void;
  onEditOffer: (entry: TimetableEntry) => void;
};

const EMPTY_OFFER: TimetableTruckOffer = {
  captured_at: '',
  vehicle_type: '',
  brand: '',
  model: '',
  year: null,
  mileage_km: null,
  quantity: null,
  expected_price_eur: null,
  location: '',
  notes: '',
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

function formatEur(value: number | null | undefined, localeTag: string): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(localeTag, { style: 'currency', currency: 'EUR' }).format(value);
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
        'Trucks signal — capture the vehicle in the Vehicle tab.'
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
        'No correspondence text yet — use the Correspondence tab.'
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

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const trimmed = iso.trim();
  if (!trimmed) return '';
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return trimmed.length >= 16 ? trimmed.slice(0, 16) : '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(local: string): string | null {
  const v = local.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function offerHasContent(o: TimetableTruckOffer | null | undefined): boolean {
  if (!o) return false;
  if (o.vehicle_type.trim()) return true;
  if (o.brand.trim()) return true;
  if (o.model.trim()) return true;
  if (o.location.trim()) return true;
  if (o.notes.trim()) return true;
  if (o.year != null) return true;
  if (o.mileage_km != null) return true;
  if (o.quantity != null) return true;
  if (o.expected_price_eur != null) return true;
  return false;
}

function emptyAppointmentRow(): TimetableAppointmentHistoryRow {
  return { date: '', time: '', purpose: '', remark: '', done: false, initials: '' };
}

function emptyContactPerson(): TimetableContactPerson {
  return { name: '', phone: '', fax: '' };
}

function emptyAssignment(): TimetableAssignmentRow {
  return { name: '', since: '' };
}

/** Shallow clone — never mutate `entry.contact_profile` in place. */
function ensureProfile(entry: TimetableEntry): TimetableContactProfile {
  return { ...(entry.contact_profile ?? {}) };
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

const OUTCOME_ORDER: TimetableOutcome[] = ['pending', 'follow_up', 'has_trucks', 'no_trucks'];

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-slate-200/90 bg-white px-4 text-[15px] leading-snug text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/60';
const textareaClass =
  'mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-[15px] leading-relaxed text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-200/60';
const labelClass = 'block text-sm font-medium text-slate-600';
/** Label line inside overview fields (paired with `overviewFieldClass` on `<label>`). */
const overviewLabelClass =
  'text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500';
/** Match NewCustomerModal `inputClass` (+ touch-friendly min height). */
const overviewInputClass =
  'min-h-[44px] w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm shadow-slate-900/[0.03] outline-none ring-0 transition placeholder:text-slate-400 focus:border-blue-400/80 focus:shadow-md focus:shadow-blue-900/[0.06] focus:ring-2 focus:ring-blue-500/20 sm:min-h-[2.75rem] sm:px-3.5';
/** Long-form row — same chrome as overview inputs, taller + resize. */
const overviewNotesTextareaClass =
  'min-h-[6rem] w-full resize-y rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 text-sm leading-relaxed text-slate-800 shadow-sm shadow-slate-900/[0.03] outline-none transition placeholder:text-slate-400 focus:border-blue-400/80 focus:ring-2 focus:ring-blue-500/20 sm:min-h-[7rem]';
const overviewFieldClass = 'flex flex-col gap-2';
const overviewAddBtnClass =
  'rounded-xl border border-blue-200/60 bg-gradient-to-r from-white to-blue-50/50 px-3 py-1.5 text-xs font-semibold text-blue-950 shadow-sm shadow-blue-900/[0.06] transition hover:border-blue-300/80 hover:from-blue-50/80 hover:shadow-md active:scale-[0.98]';

/** Staggered entrance for overview column stacks (motion-safe). */
function overviewStaggerClass(ms: number): string {
  return `motion-safe:animate-contact-card-in motion-reduce:animate-none [animation-delay:${ms}ms]`;
}

/** One card column in the overview horizontal scroll strip */
const overviewHScrollColClass =
  'w-[min(calc(100vw-2.75rem),19.25rem)] shrink-0 snap-start sm:w-80 md:min-w-[20.5rem] md:max-w-[22rem]';

/** Same strip, wider for address / fleet / notes (long-form fields). */
const overviewHScrollColLocationClass =
  'w-[min(calc(100vw-2.75rem),24rem)] shrink-0 snap-start sm:w-[25rem] md:min-w-[27rem] md:max-w-[31rem]';

/** Compact inputs in the dark drawer header (Ka / Arte only — CRM fields come from Kundenstamm). */
const headerCodesInputClass =
  'min-h-7 min-w-0 border-0 bg-transparent py-0 text-xs font-semibold text-white outline-none ring-0 placeholder:text-slate-500 focus:ring-0 sm:text-[13px]';

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

/** Section shell — elevated card, clear separation (overview grid must not overlap rows). */
function OverviewPanel({
  title,
  titleLines,
  sectionAriaLabel,
  hint,
  actions,
  children,
  className = '',
}: {
  title?: string;
  /** When set, renders a vertical stack of section labels instead of a single `title` line. */
  titleLines?: string[];
  /** Optional accessible name for the whole panel (e.g. when using `titleLines`). */
  sectionAriaLabel?: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingBlock =
    titleLines && titleLines.length > 0 ? (
      <div className="flex flex-col gap-1" role="presentation">
        {titleLines.map((line, i) => (
          <span
            key={`${i}-${line}`}
            className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600"
          >
            {line}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">{title}</p>
    );

  return (
    <section
      className={`group min-w-0 rounded-3xl border border-white/60 bg-white/55 p-4 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.12)] shadow-blue-900/[0.04] ring-1 ring-slate-900/[0.04] backdrop-blur-xl transition duration-300 hover:border-white/80 hover:bg-white/65 hover:shadow-[0_20px_50px_-16px_rgba(15,23,42,0.14)] sm:p-5 ${className}`}
      aria-label={sectionAriaLabel}
    >
      <div
        className={`flex border-b border-slate-200/40 pb-3 ${
          actions
            ? 'min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3'
            : 'flex-col gap-2'
        }`}
      >
        <header className="min-w-0 flex-1">
          {headingBlock}
          {hint ? (
            <p
              className={`line-clamp-3 text-xs leading-relaxed text-slate-500 sm:line-clamp-3 ${titleLines?.length ? 'mt-2' : 'mt-1.5'}`}
            >
              {hint}
            </p>
          ) : null}
        </header>
        {actions ? <div className="shrink-0 self-end pt-0.5 sm:self-start sm:pt-0.5">{actions}</div> : null}
      </div>
      <div className="mt-4 flex w-full flex-col space-y-1">{children}</div>
    </section>
  );
}

function ContactCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-white/55 bg-white/70 p-6 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.12)] ring-1 ring-blue-500/[0.06] backdrop-blur-xl md:p-7 ${className}`}
    >
      <div className="flex gap-4">
        {Icon ? (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-sky-500/15 text-blue-800 ring-1 ring-blue-300/45"
            aria-hidden
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          {subtitle ? (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          ) : null}
          <div className={subtitle ? 'mt-6' : 'mt-5'}>{children}</div>
        </div>
      </div>
    </section>
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
  const [tab, setTab] = useState<TabId>('overview');
  const [draft, setDraft] = useState<TimetableEntry | null>(null);
  const [dirty, setDirty] = useState(false);
  const [smartSummaryOpen, setSmartSummaryOpen] = useState(false);
  const [kundenDbTick, setKundenDbTick] = useState(0);
  const smartSummaryRef = useRef<HTMLDivElement>(null);
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
    const needReset =
      prevEntryIdRef.current === null || prevEntryIdRef.current !== entry.id;
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
    if (entry) setTab('overview');
  }, [entry?.id]);

  useEffect(() => {
    setSmartSummaryOpen(false);
  }, [tab]);

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

  const tabs = useMemo(
    () =>
      [
        { id: 'overview' as const, label: t('timetableContactTabOverview', 'Overview'), icon: LayoutDashboard },
        { id: 'history' as const, label: t('timetableContactTabHistory', 'Appointments'), icon: History },
        { id: 'vehicle' as const, label: t('timetableContactTabVehicle', 'Vehicle'), icon: Car },
        { id: 'activity' as const, label: t('timetableContactTabActivity', 'Correspondence'), icon: FileText },
      ] as const,
    [t]
  );

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

  const ve: TimetableVehicleDisplayExtra = p.vehicle_extra ?? {};

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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-950/55 via-slate-900/50 to-blue-950/40 p-1.5 backdrop-blur-[6px] sm:p-2"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex h-[min(78dvh,calc(100dvh-12px))] max-h-[min(78dvh,calc(100dvh-12px))] w-[min(96rem,calc(100vw-10px))] max-w-[min(96rem,calc(100vw-10px))] flex-col overflow-hidden rounded-3xl border border-white/25 bg-gradient-to-b from-slate-50/98 via-blue-50/[0.2] to-slate-100/[0.35] shadow-[0_32px_64px_-16px_rgba(15,23,42,0.45)] shadow-blue-900/12 ring-1 ring-slate-900/10 motion-safe:animate-timetable-fade-up motion-reduce:animate-none sm:h-[min(78dvh,calc(100dvh-16px))] sm:max-h-[min(78dvh,calc(100dvh-16px))] sm:w-[min(96rem,calc(100vw-14px))] sm:max-w-[min(96rem,calc(100vw-14px))] lg:w-[min(96rem,calc(100vw-20px))] lg:max-w-[min(96rem,calc(100vw-20px))]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="timetable-contact-drawer-title"
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#0b1428] via-slate-900 to-[#0a1628] px-3.5 py-3 pr-12 text-white sm:px-5 sm:py-3.5 sm:pr-14 md:pr-[4.25rem]">
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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 via-sky-400/25 to-transparent" />
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
          <div className="shrink-0 border-b border-slate-200/70 bg-gradient-to-b from-white to-slate-50/90 px-3 pb-2 pt-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:px-4 sm:pb-2 sm:pt-2 md:px-5">
            <nav
              className="grid w-full grid-cols-4 gap-0.5 rounded-xl bg-slate-100/90 p-0.5 shadow-inner shadow-slate-900/[0.04] ring-1 ring-slate-200/70 sm:gap-1 sm:rounded-2xl sm:p-1"
              aria-label={t('timetableContactTabsAria', 'Contact sections')}
              role="tablist"
            >
              {tabs.map(({ id, label, icon: Icon }, idx) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={`flex min-h-[2.5rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-center text-[10px] font-semibold leading-tight transition-all duration-200 motion-safe:animate-contact-card-in motion-reduce:animate-none sm:min-h-0 sm:flex-row sm:gap-1 sm:rounded-xl sm:px-2 sm:py-1.5 sm:text-xs md:text-[13px] [animation-delay:calc(35ms*var(--tw-contact-tab-i))] ${
                    tab === id
                      ? 'bg-white text-slate-900 shadow-sm shadow-slate-900/8 ring-1 ring-blue-300/55'
                      : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                  }`}
                  style={{ '--tw-contact-tab-i': idx } as React.CSSProperties}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 sm:h-[0.95rem] sm:w-[0.95rem] ${tab === id ? 'text-blue-600' : 'opacity-80'}`}
                    strokeWidth={2}
                  />
                  <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">{label}</span>
                </button>
              ))}
            </nav>
            <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200/60 pt-2 sm:mt-2 sm:flex-nowrap sm:pt-2">
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
            className={
              tab === 'overview'
                ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-t border-slate-200/40 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(59,130,246,0.1),transparent_50%),linear-gradient(180deg,rgba(250,251,255,0.98)_0%,rgba(241,245,249,0.65)_55%,rgba(239,246,255,0.45)_100%)] p-2 sm:p-3'
                : 'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain border-t border-slate-200/40 bg-[linear-gradient(180deg,rgba(250,251,255,0.95)_0%,#f1f5f9_100%)] px-4 py-5 sm:px-6 sm:py-6 md:px-8 md:py-8'
            }
          >
          {tab === 'overview' ? (
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <div
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5 [scrollbar-gutter:stable] [scrollbar-width:auto] [scrollbar-color:rgb(71_85_105)_rgb(226_232_240)] sm:px-0 [-ms-overflow-style:scrollbar] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200/90 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-slate-200/90 [&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:hover:bg-slate-600"
                role="region"
                aria-label={t(
                  'timetableContactOverviewVerticalScrollAria',
                  'Overview — scroll sideways for columns; scroll down if needed'
                )}
              >
                <div className="flex flex-col gap-4 pb-6 md:gap-5 md:pb-8 lg:pb-10">
                  <div
                    className="-mx-0.5 overflow-x-auto overflow-y-visible pb-2 pt-0.5 [-ms-overflow-style:auto] [scrollbar-width:thin] [scrollbar-color:rgb(100_116_139)_rgb(241_245_249)] sm:mx-0 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/90 [&::-webkit-scrollbar-thumb]:hover:bg-slate-600 [&::-webkit-scrollbar-track]:mx-1 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-200/80"
                    role="region"
                    aria-label={t('timetableContactOverviewScrollAria', 'Overview columns — scroll sideways')}
                  >
                    <div className="flex w-max min-h-0 flex-nowrap gap-3 px-1 pb-1 pr-4 snap-x snap-mandatory sm:gap-4 sm:px-0 sm:pr-5 md:gap-5 md:pr-6">
                  <div className={`${overviewHScrollColClass} ${overviewStaggerClass(40)}`}>
                  <OverviewPanel title={t('timetableContactCardIdentity', 'Who you are calling')}>
                    <div className="flex flex-col gap-2">
                      <label className={overviewFieldClass}>
                        <span className={overviewLabelClass}>
                          {t('timetableColCompany', 'Company')}
                        </span>
                        <input
                          value={draft.company_name}
                          onChange={(e) =>
                            patchDraft((prev) => ({ ...prev, company_name: e.target.value }))
                          }
                          className={overviewInputClass}
                        />
                      </label>
                      <label className={overviewFieldClass}>
                        <span className={overviewLabelClass}>
                          {t('timetableColContact', 'Contact')}
                        </span>
                        <input
                          value={draft.contact_name}
                          onChange={(e) =>
                            patchDraft((prev) => ({ ...prev, contact_name: e.target.value }))
                          }
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
                          onChange={(e) =>
                            patchDraft((prev) => ({ ...prev, purpose: e.target.value }))
                          }
                          className={overviewInputClass}
                        />
                      </label>
                      <label className={overviewFieldClass}>
                        <span className={overviewLabelClass}>{t('timetableColVp', 'Buyer')}</span>
                        <input
                          value={draft.buyer_name}
                          onChange={(e) =>
                            patchDraft((prev) => ({ ...prev, buyer_name: e.target.value }))
                          }
                          className={overviewInputClass}
                        />
                      </label>
                    </div>
                  </OverviewPanel>
                </div>

                <div className={`${overviewHScrollColClass} ${overviewStaggerClass(95)}`}>
                  <OverviewPanel title={t('timetableContactCardAppointment', 'Appointment & outcome')}>
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
                        <span className={overviewLabelClass}>
                          {t('timetableFieldOutcome', 'Call outcome')}
                        </span>
                        <select
                          value={draft.outcome}
                          onChange={(e) => {
                            const o = e.target.value as TimetableOutcome;
                            patchDraft((prev) => ({
                              ...prev,
                              outcome: o,
                              is_completed: o === 'no_trucks',
                              follow_up_at:
                                o === 'follow_up' || o === 'has_trucks' ? prev.follow_up_at : null,
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
                            onChange={(e) =>
                              patchDraft((prev) => ({ ...prev, is_completed: e.target.checked }))
                            }
                            className="h-4 w-4 rounded-md border-slate-300 text-blue-600 transition focus:ring-2 focus:ring-blue-400/40"
                          />
                          {t('timetableColDone', 'Done')}
                        </label>
                        <label className="flex cursor-pointer items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:text-slate-900">
                          <input
                            type="checkbox"
                            checked={draft.is_parked}
                            onChange={(e) =>
                              patchDraft((prev) => ({ ...prev, is_parked: e.target.checked }))
                            }
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
                  </OverviewPanel>
                </div>

                <div className={`${overviewHScrollColLocationClass} ${overviewStaggerClass(110)}`}>
                  <OverviewPanel
                    sectionAriaLabel={t(
                      'timetableContactCardLocation',
                      'Address, fleet & quick notes'
                    )}
                    title={t('timetableContactCardLocation', 'Address, fleet & quick notes')}
                  >
                    <div className="flex w-full flex-col gap-4">
                      <label className={`${overviewFieldClass} w-full`}>
                        <span className={overviewLabelClass}>
                          {t('timetableContactAddress', 'Address')}
                        </span>
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
                          className={`${overviewNotesTextareaClass} min-h-[8.5rem] w-full`}
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
                          className={`${overviewNotesTextareaClass} min-h-[8.5rem] w-full`}
                        />
                      </label>
                      <label className={`${overviewFieldClass} w-full`}>
                        <span className={overviewLabelClass}>
                          {t('timetableContactTableNotes', 'Call / list notes')}
                        </span>
                        <textarea
                          value={draft.notes}
                          onChange={(e) => patchDraft((prev) => ({ ...prev, notes: e.target.value }))}
                          rows={5}
                          className={`${overviewNotesTextareaClass} min-h-[8.5rem] w-full`}
                          placeholder={t(
                            'timetableContactTableNotesPh',
                            'Short notes visible in the timetable row.'
                          )}
                        />
                      </label>
                    </div>
                  </OverviewPanel>
                </div>

                <div
                  className={`${overviewHScrollColClass} flex flex-col gap-3 sm:gap-4 ${overviewStaggerClass(120)}`}
                >
                  <OverviewPanel
                    title={t('timetableContactMoreContacts', 'Contact persons')}
                    actions={
                      <button
                        type="button"
                        onClick={() =>
                          patchDraft((prev) => {
                            const pr = ensureProfile(prev);
                            pr.contacts = [...(pr.contacts ?? []), emptyContactPerson()];
                            return { ...prev, contact_profile: { ...pr } };
                          })
                        }
                        className={overviewAddBtnClass}
                      >
                        {t('timetableContactAddRow', 'Add')}
                      </button>
                    }
                  >
                    <div className="space-y-3">
                      {(p.contacts ?? []).length === 0 ? (
                        <p className="text-xs leading-relaxed text-slate-500">
                          {t('timetableContactNoExtraContacts', 'None')}
                        </p>
                      ) : null}
                      {(p.contacts ?? []).map((c, idx) => (
                        <div
                          key={idx}
                          className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3"
                        >
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                patchDraft((prev) => {
                                  const pr = ensureProfile(prev);
                                  pr.contacts = (pr.contacts ?? []).filter((_, i) => i !== idx);
                                  return { ...prev, contact_profile: { ...pr } };
                                })
                              }
                              className="text-xs font-semibold text-rose-600 hover:underline"
                            >
                              {t('timetableContactRemoveRow', 'Remove')}
                            </button>
                          </div>
                          <label className={overviewFieldClass}>
                            <span className={overviewLabelClass}>
                              {t('timetableColContact', 'Contact')}
                            </span>
                            <input
                              value={c.name}
                              onChange={(e) =>
                                patchDraft((prev) => {
                                  const pr = ensureProfile(prev);
                                  const list = [...(pr.contacts ?? [])];
                                  list[idx] = { ...list[idx], name: e.target.value };
                                  pr.contacts = list;
                                  return { ...prev, contact_profile: { ...pr } };
                                })
                              }
                              className={overviewInputClass}
                            />
                          </label>
                          <label className={overviewFieldClass}>
                            <span className={overviewLabelClass}>
                              {t('timetableColPhone', 'Phone')}
                            </span>
                            <input
                              value={c.phone ?? ''}
                              onChange={(e) =>
                                patchDraft((prev) => {
                                  const pr = ensureProfile(prev);
                                  const list = [...(pr.contacts ?? [])];
                                  list[idx] = { ...list[idx], phone: e.target.value || undefined };
                                  pr.contacts = list;
                                  return { ...prev, contact_profile: { ...pr } };
                                })
                              }
                              className={overviewInputClass}
                            />
                          </label>
                          <label className={overviewFieldClass}>
                            <span className={overviewLabelClass}>{t('timetableContactFax', 'Fax')}</span>
                            <input
                              value={c.fax ?? ''}
                              onChange={(e) =>
                                patchDraft((prev) => {
                                  const pr = ensureProfile(prev);
                                  const list = [...(pr.contacts ?? [])];
                                  list[idx] = { ...list[idx], fax: e.target.value || undefined };
                                  pr.contacts = list;
                                  return { ...prev, contact_profile: { ...pr } };
                                })
                              }
                              className={overviewInputClass}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </OverviewPanel>

                  <OverviewPanel
                    title={t('timetableContactAssignments', 'Assignment')}
                    actions={
                      <button
                        type="button"
                        onClick={() =>
                          patchDraft((prev) => {
                            const pr = ensureProfile(prev);
                            pr.assignment_history = [
                              ...(pr.assignment_history ?? []),
                              emptyAssignment(),
                            ];
                            return { ...prev, contact_profile: { ...pr } };
                          })
                        }
                        className={overviewAddBtnClass}
                      >
                        {t('timetableContactAddRow', 'Add')}
                      </button>
                    }
                  >
                    <div className="space-y-3">
                      {(p.assignment_history ?? []).length === 0 ? (
                        <p className="text-xs leading-relaxed text-slate-500">
                          {t('timetableContactNoAssignments', 'None')}
                        </p>
                      ) : null}
                      {(p.assignment_history ?? []).map((a, idx) => (
                        <div
                          key={idx}
                          className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3"
                        >
                          <label className={overviewFieldClass}>
                            <span className={overviewLabelClass}>
                              {t('timetableContactProcessor', 'Processor')}
                            </span>
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
                            <span className={overviewLabelClass}>
                              {t('timetableContactSince', 'Since')}
                            </span>
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
                                pr.assignment_history = (pr.assignment_history ?? []).filter(
                                  (_, i) => i !== idx
                                );
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
                  </OverviewPanel>
                </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={tab}
              className="motion-safe:animate-timetable-fade-in motion-reduce:animate-none"
            >
          {tab === 'history' ? (
            <div className="w-full space-y-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {t('timetableContactSectionHistory', 'Further customer appointments')}
                  </h3>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">
                    {t('timetableContactSectionHistoryHint', 'Chronological log — same customer')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    patchDraft((prev) => {
                      const pr = ensureProfile(prev);
                      pr.appointment_history = [...(pr.appointment_history ?? []), emptyAppointmentRow()];
                      return { ...prev, contact_profile: { ...pr } };
                    })
                  }
                  className="h-12 shrink-0 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
                >
                  {t('timetableContactAddAppointment', 'Add appointment')}
                </button>
              </div>
              {(p.appointment_history ?? []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 py-16 text-center">
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
                              pr.appointment_history = (pr.appointment_history ?? []).filter(
                                (_, i) => i !== idx
                              );
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
          ) : null}

          {tab === 'vehicle' ? (
            <div className="w-full space-y-8">
              <ContactCard
                icon={Truck}
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
                          expected_price_eur: v
                            ? Number.isFinite(Number(v))
                              ? Number(v)
                              : null
                            : null,
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
                {!offerHasContent(draft.offer) ? (
                  <p className="mt-5 text-sm leading-relaxed text-slate-500">
                    {t('timetableContactEmptyVehicle', 'No offer captured — use Add offer when the customer has stock.')}
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
                      onChange={(e) =>
                        setVehicleExtra({ registration_mm_yyyy: e.target.value || undefined })
                      }
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
                          mileage_replacement_km: v
                            ? Number.isFinite(Number(v))
                              ? Number(v)
                              : null
                            : null,
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
                          customer_price_eur: v
                            ? Number.isFinite(Number(v))
                              ? Number(v)
                              : null
                            : null,
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
                      onChange={(e) =>
                        setVehicleExtra({ processor_entered: e.target.value || undefined })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    {t('timetableContactProcessorFetched', 'Fetched by')}
                    <input
                      value={ve.processor_fetched ?? ''}
                      onChange={(e) =>
                        setVehicleExtra({ processor_fetched: e.target.value || undefined })
                      }
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    {t('timetableContactProcessorNegotiated', 'Negotiated by')}
                    <input
                      value={ve.processor_negotiated ?? ''}
                      onChange={(e) =>
                        setVehicleExtra({ processor_negotiated: e.target.value || undefined })
                      }
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
          ) : null}

          {tab === 'activity' ? (
            <div className="w-full">
              <ContactCard
                icon={FileText}
                title={t('timetableContactSectionActivity', 'Correspondence & notes')}
                subtitle={t(
                  'timetableContactSectionActivityHint',
                  'Letters, e-mail drafts, and free-form history'
                )}
              >
                <textarea
                  value={p.activity_notes ?? ''}
                  onChange={(e) =>
                    patchDraft((prev) => {
                      const pr = ensureProfile(prev);
                      pr.activity_notes = e.target.value || undefined;
                      return { ...prev, contact_profile: { ...pr } };
                    })
                  }
                  rows={18}
                  className={`${textareaClass} min-h-[12rem] font-sans text-[15px] leading-relaxed sm:min-h-[14rem]`}
                  placeholder={t(
                    'timetableContactActivityPlaceholder',
                    'Correspondence, e-mail text, and call history…'
                  )}
                />
              </ContactCard>
            </div>
          ) : null}
            </div>
          )}
          </div>
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
