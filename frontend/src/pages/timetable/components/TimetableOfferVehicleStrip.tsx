import { useEffect, useMemo, useRef, useState } from 'react';
import { CarFront, ChevronDown, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import type { AngebotLedgerKind } from '../../../lib/angebotLedger';
import { angebotLedgerKind } from '../../../lib/angebotLedger';
import type { TimetableTruckOffer } from '../../../types/timetable';

export function timetableOfferVehicleChipLabel(o: TimetableTruckOffer, untitled: string): string {
  const mm = [o.brand, o.model].filter(Boolean).join(' ').trim();
  if (mm) return mm.length > 28 ? `${mm.slice(0, 25)}…` : mm;
  const vt = o.vehicle_type.trim();
  if (vt) return vt.length > 28 ? `${vt.slice(0, 25)}…` : vt;
  return untitled;
}

/** Trailing model digits (e.g. "MB Atego 818" → "818", "Renault T 460" → "460"). */
export function vehicleModelNumberOnly(o: TimetableTruckOffer): string {
  const mm = [o.brand, o.model].filter(Boolean).join(' ').trim();
  const m = mm.match(/(\d+)\s*$/u);
  if (m) return m[1]!;
  const vt = o.vehicle_type.trim();
  const mv = vt.match(/(\d+)\s*$/u);
  if (mv) return mv[1]!;
  return '';
}

function ledgerDotClass(kind: AngebotLedgerKind): string {
  switch (kind) {
    case 'purchase':
      return 'bg-emerald-500 ring-1 ring-emerald-700/25';
    case 'disposal':
      return 'bg-red-600 ring-1 ring-red-800/35';
    case 'conflict':
      return 'bg-rose-500 ring-1 ring-rose-700/30';
    case 'neutral':
      return 'bg-blue-600 ring-1 ring-blue-800/35';
  }
}

function ledgerAccentBorderClass(kind: AngebotLedgerKind): string {
  switch (kind) {
    case 'purchase':
      return 'border-l-emerald-500';
    case 'disposal':
      return 'border-l-red-500';
    case 'conflict':
      return 'border-l-rose-500';
    case 'neutral':
      return 'border-l-blue-500';
  }
}

function ledgerSoftSurfaceClass(kind: AngebotLedgerKind): string {
  switch (kind) {
    case 'purchase':
      return 'bg-emerald-50/45';
    case 'disposal':
      return 'bg-red-50/40';
    case 'conflict':
      return 'bg-rose-50/45';
    case 'neutral':
      return 'bg-blue-50/40';
  }
}

function formatOfferStripInt(n: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function truncateMetaSegment(s: string, max: number): string {
  const compact = s.trim().replace(/\s+/g, ' ');
  if (compact.length <= max) return compact;
  return `${compact.slice(0, Math.max(0, max - 1))}…`;
}

function buildStripMetaLine(
  o: TimetableTruckOffer,
  t: (key: string, fallback: string) => string,
): string {
  const kind = angebotLedgerKind({ gekauft: o.gekauft, verkauft: o.verkauft });
  const sep = ' · ';
  const lane =
    kind === 'purchase'
      ? t('timetableOfferVehicleStripLedgerPurchase', 'Purchased')
      : kind === 'disposal'
        ? t('timetableOfferVehicleStripLedgerDisposal', 'Sold (third party)')
        : kind === 'conflict'
          ? t('timetableOfferVehicleStripLedgerConflict', 'Conflict — review')
          : t('timetableOfferVehicleStripLedgerNeutral', 'Offer');
  const parts: string[] = [lane];
  if (o.year != null && o.year > 0) {
    parts.push(t('timetableOfferVehicleStripYearFmt', 'Year {year}').replace('{year}', String(o.year)));
  }
  if (o.mileage_km != null && o.mileage_km > 0) {
    parts.push(
      t('timetableOfferVehicleStripMileageFmt', '{n} km').replace('{n}', formatOfferStripInt(o.mileage_km)),
    );
  }
  const loc = o.location?.trim();
  if (loc) {
    parts.push(truncateMetaSegment(loc, 28));
  }
  const rounds = o.negotiation_rounds?.length ?? 0;
  if (rounds > 0) {
    parts.push(
      t('timetableOfferVehicleStripRoundsFmt', '{n} price rounds').replace('{n}', String(rounds)),
    );
  }
  const files = o.vehicle_unterlagen?.length ?? 0;
  if (files > 0) {
    parts.push(t('timetableOfferVehicleStripFilesFmt', '{n} files').replace('{n}', String(files)));
  }
  if (o.expected_price_eur != null && o.expected_price_eur > 0) {
    const amount = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(o.expected_price_eur);
    parts.push(t('timetableOfferVehicleStripAskFmt', 'Asking {amount}').replace('{amount}', amount));
  }
  return parts.join(sep);
}

function isSoldDisposal(o: TimetableTruckOffer): boolean {
  return angebotLedgerKind({ gekauft: o.gekauft, verkauft: o.verkauft }) === 'disposal';
}

function formatSoldMenuEurAmount(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Second line in sold-vehicle dropdown: customer + DEMA prices when present. */
function soldOfferMenuMetaLine(
  o: TimetableTruckOffer,
  t: (key: string, fallback: string) => string,
): string | null {
  const parts: string[] = [];
  const exp = o.expected_price_eur;
  if (exp != null && Number(exp) > 0) {
    parts.push(
      t('timetableOfferSoldVehicleMenuMetaCustomer', 'Customer price: {amount}').replace(
        '{amount}',
        formatSoldMenuEurAmount(Number(exp)),
      ),
    );
  }
  const bid = o.purchase_bid_eur;
  if (bid != null && Number(bid) > 0) {
    parts.push(
      t('timetableOfferSoldVehicleMenuMetaDema', 'DEMA price: {amount}').replace(
        '{amount}',
        formatSoldMenuEurAmount(Number(bid)),
      ),
    );
  }
  return parts.length ? parts.join(' · ') : null;
}

type Props = {
  offers: TimetableTruckOffer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  t: (key: string, fallback: string) => string;
};

export function SoldVehicleQuickAccess({
  offers,
  selectedId,
  onSelect,
  chipLabel,
  t,
  sublineNumberOnly = false,
}: {
  offers: TimetableTruckOffer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  chipLabel: (o: TimetableTruckOffer, untitled: string) => string;
  t: (key: string, fallback: string) => string;
  /** Second line shows trailing model number instead of full make/model. */
  sublineNumberOnly?: boolean;
}) {
  const untitled = t('timetableOfferChipUntitled', 'Vehicle');
  const soldOffers = useMemo(() => offers.filter(isSoldDisposal), [offers]);
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const count = soldOffers.length;
  const soldSubline = (o: TimetableTruckOffer) => {
    if (!sublineNumberOnly) return chipLabel(o, untitled);
    const n = vehicleModelNumberOnly(o);
    return n || chipLabel(o, untitled);
  };
  const primaryLabel =
    count === 0
      ? t('timetableOfferSoldVehicleCta', 'Sold vehicle')
      : count === 1
        ? soldSubline(soldOffers[0]!)
        : t('timetableOfferSoldVehicleCount', '{n} sold').replace('{n}', String(count));

  const handleMainClick = () => {
    if (count === 0) return;
    if (count === 1) {
      onSelect(soldOffers[0]!.id);
      return;
    }
    setMenuOpen((o) => !o);
  };

  const selectedSold = count === 1 && soldOffers[0]!.id === selectedId;

  const shellBase =
    'inline-flex h-9 max-w-[min(100%,16rem)] items-center gap-2 rounded-2xl border text-left shadow-sm transition duration-200 active:scale-[0.98] sm:h-10 sm:max-w-[18rem] sm:gap-2.5';
  const shellDisabled =
    'cursor-not-allowed border-dashed border-slate-200/95 bg-slate-50/90 text-slate-400 opacity-[0.88] ring-1 ring-slate-900/[0.03]';
  const shellIdle =
    'border-slate-200/90 bg-white px-2.5 py-1 ring-1 ring-slate-900/[0.04] hover:border-red-200/90 hover:bg-gradient-to-br hover:from-white hover:to-red-50/50 hover:shadow-md';
  const shellSelected =
    'border-red-700/35 bg-gradient-to-br from-red-600 via-red-700 to-red-900 px-2.5 py-1 text-white shadow-md shadow-red-950/25 ring-1 ring-red-950/20 hover:brightness-105';

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        disabled={count === 0}
        onClick={handleMainClick}
        aria-expanded={count > 1 ? menuOpen : undefined}
        aria-haspopup={count > 1 ? 'menu' : undefined}
        title={
          count === 0
            ? t(
                'timetableOfferSoldVehicleEmptyHint',
                'Mark a vehicle as sold using “Sold (third party)” in stock flow below.',
              )
            : t('timetableOfferSoldVehicleButtonTitle', 'Open vehicles marked as sold (third party).')
        }
        aria-label={
          count === 0
            ? t('timetableOfferSoldVehicleEmptyAria', 'No vehicle marked sold yet')
            : count === 1
              ? t('timetableOfferSoldVehicleJumpOneAria', 'Jump to sold vehicle: {label}').replace(
                  '{label}',
                  chipLabel(soldOffers[0]!, untitled),
                )
              : t('timetableOfferSoldVehicleMenuButtonAria', 'Choose a sold vehicle line')
        }
        className={`${shellBase} ${
          count === 0 ? shellDisabled : selectedSold ? shellSelected : shellIdle
        } ${count === 0 ? 'px-3 py-1.5' : ''}`}
      >
        {count === 0 ? (
          <CarFront className="h-3.5 w-3.5 shrink-0 opacity-50 sm:h-4 sm:w-4" aria-hidden />
        ) : (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-inner ${
              selectedSold
                ? 'bg-white/20 text-white ring-1 ring-white/25'
                : 'bg-gradient-to-br from-red-50 to-red-100/90 text-red-700 ring-1 ring-red-200/70'
            }`}
            aria-hidden
          >
            <CarFront className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate leading-tight">
          {count === 0 ? (
            <span className="block truncate text-[11px] font-semibold sm:text-xs">{primaryLabel}</span>
          ) : (
            <>
              <span
                className={`block truncate text-[9px] font-bold uppercase tracking-[0.14em] sm:text-[10px] ${
                  selectedSold ? 'text-white/85' : 'text-red-700/90'
                }`}
              >
                {t('timetableOfferSoldVehicleBadge', 'Sold')}
              </span>
              <span
                className={`block truncate font-serif text-[12px] font-semibold tracking-tight sm:text-sm ${
                  selectedSold ? 'text-white' : 'text-slate-900'
                }`}
              >
                {primaryLabel}
              </span>
            </>
          )}
        </span>
        {count > 1 ? (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition sm:h-4 sm:w-4 ${
              selectedSold ? 'text-white/90' : 'text-slate-500'
            } ${menuOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        ) : null}
      </button>
      {menuOpen && count > 1 ? (
        <div
          role="menu"
          aria-label={t('timetableOfferSoldVehicleMenuAria', 'Sold vehicle lines')}
          className="absolute right-0 top-[calc(100%+0.4rem)] z-[80] min-w-[17rem] max-w-[min(calc(100vw-2rem),26rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 py-1.5 shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/[0.05] backdrop-blur-sm"
        >
          {soldOffers.map((o) => {
            const fullLab = chipLabel(o, untitled);
            const detailLine = buildStripMetaLine(o, t);
            const priceLine = soldOfferMenuMetaLine(o, t);
            const active = o.id === selectedId;
            const rowTitle = [fullLab, detailLine, priceLine].filter(Boolean).join(' — ');
            return (
              <button
                key={o.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  onSelect(o.id);
                  setMenuOpen(false);
                }}
                title={rowTitle}
                aria-label={rowTitle}
                className={`mx-1 flex w-full max-w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                  active
                    ? 'bg-gradient-to-r from-red-50 to-rose-50/90 text-red-950 ring-1 ring-red-200/60'
                    : 'text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    active ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'
                  }`}
                  aria-hidden
                >
                  <CarFront className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[13px] font-semibold leading-snug tracking-tight text-slate-900">
                    {fullLab}
                  </span>
                  <span className="mt-1 block text-[10px] font-normal leading-relaxed text-slate-600 sm:text-[11px]">
                    {detailLine}
                  </span>
                  {priceLine ? (
                    <span className="mt-1 block text-[10px] font-semibold leading-snug text-slate-700 sm:text-[11px]">
                      {priceLine}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function TimetableOfferVehicleStrip({
  offers,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  t,
}: Props) {
  const untitled = t('timetableOfferChipUntitled', 'Vehicle');
  const regionAria = t('timetableOfferVehicleStripTitle', 'Vehicles / offers');

  const { index, current } = useMemo(() => {
    const sid = selectedId ?? offers[0]?.id ?? null;
    const i = sid ? offers.findIndex((o) => o.id === sid) : 0;
    const safe = i >= 0 ? i : 0;
    return { index: safe, current: offers[safe] ?? offers[0]! };
  }, [offers, selectedId]);

  const addVehicleButton = (
    <button
      type="button"
      onClick={onAdd}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300/90 bg-white text-slate-600 shadow-sm transition hover:border-sky-400/70 hover:bg-sky-50/60 hover:text-sky-950"
      aria-label={t('timetableOfferAddVehicle', 'Add vehicle')}
      title={t('timetableOfferAddVehicle', 'Add vehicle')}
    >
      <Plus className="h-4 w-4" strokeWidth={2} />
    </button>
  );

  const goPrev = () => {
    if (index <= 0) return;
    onSelect(offers[index - 1]!.id);
  };

  const goNext = () => {
    if (index >= offers.length - 1) return;
    onSelect(offers[index + 1]!.id);
  };

  if (offers.length === 0) {
    return (
      <div
        className="flex min-w-0 flex-col items-center gap-2 border-b border-slate-200/70 pb-2.5 text-center"
        role="region"
        aria-label={regionAria}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {t('timetableOfferVehicleStripLabelShort', 'Vehicles')}
        </span>
        <p className="max-w-md text-[11px] leading-snug text-slate-600 sm:text-xs">
          {t(
            'timetableOfferVehicleStripNoLines',
            'No vehicle lines yet — use + to add the first one.',
          )}
        </p>
        {addVehicleButton}
      </div>
    );
  }

  const kind = angebotLedgerKind({ gekauft: current.gekauft, verkauft: current.verkauft });
  const label = timetableOfferVehicleChipLabel(current, untitled);
  const idxLabel = t('timetableOfferVehicleIndexOf', '{current} of {total}')
    .replace('{current}', String(index + 1))
    .replace('{total}', String(offers.length));
  const metaLine = buildStripMetaLine(current, t);
  const summaryTitle = `${label} — ${metaLine} — ${idxLabel}`;

  const navBtnClass =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35';

  return (
    <div
      className="flex min-w-0 flex-col items-center border-b border-slate-200/70 pb-2.5 sm:pb-3"
      role="region"
      aria-label={regionAria}
    >
      <div
        className="flex w-full max-w-xl items-stretch justify-center gap-2 px-0.5 sm:gap-2.5"
        title={summaryTitle}
      >
        <div className="flex shrink-0 flex-col justify-center">
          <button
            type="button"
            onClick={goPrev}
            disabled={index <= 0}
            aria-label={t('timetableOfferVehiclePrevAria', 'Previous vehicle')}
            title={t('timetableOfferVehiclePrevAria', 'Previous vehicle')}
            className={navBtnClass}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <div
          className={`relative min-w-0 w-[min(100%,22rem)] max-w-[min(100%,22rem)] rounded-xl border border-slate-200/85 px-2.5 py-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.65)] sm:px-3 sm:py-2.5 ${ledgerSoftSurfaceClass(
            kind,
          )} border-l-[3px] ${ledgerAccentBorderClass(kind)}`}
          aria-current="true"
        >
          {offers.length > 1 ? (
            <button
              type="button"
              onClick={() => onRemove(current.id)}
              className="absolute right-1 top-1 z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200/70 bg-white/95 text-slate-400 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-rose-200/90 hover:bg-rose-50/95 hover:text-rose-700 sm:right-1.5 sm:top-1.5"
              aria-label={t('timetableOfferRemoveVehicleAria', 'Remove this vehicle from the list')}
              title={t('timetableOfferRemoveVehicleAria', 'Remove this vehicle from the list')}
            >
              <X className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden />
            </button>
          ) : null}
          <div className={`flex items-start gap-2 ${offers.length > 1 ? 'pr-7 sm:pr-8' : ''}`}>
            <span
              className={`mt-1 shrink-0 rounded-full sm:mt-1.5 ${ledgerDotClass(kind)} h-2 w-2 sm:h-2.5 sm:w-2.5`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="min-w-0 truncate font-serif text-xs font-bold leading-tight text-slate-900 sm:text-[13px]">
                  {label}
                </span>
                <span
                  className="shrink-0 rounded-md border border-slate-200/80 bg-white/90 px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-tight text-slate-600 ring-1 ring-slate-900/[0.04] sm:text-[11px]"
                  aria-label={idxLabel}
                >
                  {index + 1}/{offers.length}
                </span>
              </div>
              <p className="mt-1.5 text-left text-[10px] leading-relaxed text-slate-600 sm:text-[11px]">
                {metaLine}
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-row items-center justify-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={goNext}
            disabled={index >= offers.length - 1}
            aria-label={t('timetableOfferVehicleNextAria', 'Next vehicle')}
            title={t('timetableOfferVehicleNextAria', 'Next vehicle')}
            className={navBtnClass}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
          {addVehicleButton}
        </div>
      </div>
    </div>
  );
}
