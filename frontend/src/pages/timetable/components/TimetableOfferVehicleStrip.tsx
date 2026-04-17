import { useMemo } from 'react';
import { CarFront, ChevronDown, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import type { AngebotLedgerKind } from '../../../lib/angebotLedger';
import { angebotLedgerKind, isOfferSoldDisposal } from '../../../lib/angebotLedger';
import type { TimetableTruckOffer } from '../../../types/timetable';

export function timetableOfferVehicleChipLabel(o: TimetableTruckOffer, untitled: string): string {
  const mm = [o.brand, o.model].filter(Boolean).join(' ').trim();
  if (mm) return mm.length > 28 ? `${mm.slice(0, 25)}…` : mm;
  const vt = o.vehicle_type.trim();
  if (vt) return vt.length > 28 ? `${vt.slice(0, 25)}…` : vt;
  return untitled;
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

function buildStripMetaParts(
  o: TimetableTruckOffer,
  t: (key: string, fallback: string) => string,
): { lane: string; tail: string; full: string } {
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
  const full = parts.join(sep);
  const tail = parts.length > 1 ? parts.slice(1).join(sep) : '';
  return { lane, tail, full };
}

export function buildStripMetaLine(
  o: TimetableTruckOffer,
  t: (key: string, fallback: string) => string,
): string {
  return buildStripMetaParts(o, t).full;
}

function formatSoldMenuEurAmount(n: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Second line in sold-vehicle archive: customer + DEMA prices when present. */
export function soldOfferMenuMetaLine(
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
  /** When the active strip is empty but sold lines exist, show CTA to open the sold archive. */
  soldArchiveCount?: number;
  onOpenSoldArchive?: () => void;
};

export function SoldVehicleQuickAccess({
  offers,
  onOpenArchive,
  t,
}: {
  offers: TimetableTruckOffer[];
  onOpenArchive: () => void;
  t: (key: string, fallback: string) => string;
}) {
  const soldOffers = useMemo(() => offers.filter((o) => isOfferSoldDisposal(o)), [offers]);
  const count = soldOffers.length;
  const countFmt = count > 0 ? formatOfferStripInt(count) : '';
  const archiveAria = useMemo(() => {
    if (count === 0) return '';
    const qty = t('timetableOfferSoldVehicleCount', '{n} sold').replace('{n}', countFmt);
    return `${qty}. ${t('timetableOfferSoldArchiveOpenHint', 'Open sold archive')}`;
  }, [count, countFmt, t]);

  const shellBase =
    'inline-flex h-9 max-w-[min(100%,16rem)] items-center gap-2 rounded-2xl border text-left shadow-sm transition duration-200 active:scale-[0.98] sm:h-10 sm:max-w-[18rem] sm:gap-2.5';
  const shellDisabled =
    'cursor-not-allowed border-dashed border-slate-200/95 bg-slate-50/90 text-slate-400 opacity-[0.88] ring-1 ring-slate-900/[0.03]';
  const shellIdle =
    'border-slate-200/90 bg-white px-2.5 py-1 ring-1 ring-slate-900/[0.04] hover:border-red-200/90 hover:bg-gradient-to-br hover:from-white hover:to-red-50/50 hover:shadow-md';

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        disabled={count === 0}
        onClick={() => {
          if (count === 0) return;
          onOpenArchive();
        }}
        title={
          count === 0
            ? t(
                'timetableOfferSoldVehicleEmptyHint',
                'Mark a vehicle as sold using “Sold (third party)” in stock flow below.',
              )
            : t('timetableOfferSoldArchiveButtonTitle', 'Open sold vehicles archive (third party).')
        }
        aria-label={count === 0 ? t('timetableOfferSoldVehicleEmptyAria', 'No vehicle marked sold yet') : archiveAria}
        className={`${shellBase} ${count === 0 ? shellDisabled : shellIdle} ${count === 0 ? 'px-3 py-1.5' : ''}`}
      >
        {count === 0 ? (
          <CarFront className="h-3.5 w-3.5 shrink-0 opacity-50 sm:h-4 sm:w-4" aria-hidden />
        ) : (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-red-100/90 text-red-700 shadow-inner ring-1 ring-red-200/70"
            aria-hidden
          >
            <CarFront className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
        <span className="min-w-0 flex-1 leading-tight">
          {count === 0 ? (
            <span className="block truncate text-[11px] font-semibold sm:text-xs">
              {t('timetableOfferSoldVehicleCta', 'Sold vehicle')}
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 shrink truncate text-[9px] font-bold uppercase leading-none tracking-[0.14em] text-red-800/95 sm:text-[10px]">
                {t('timetableOfferSoldVehicleBadge', 'Sold')}
              </span>
              <span
                className="inline-flex h-7 min-w-[1.35rem] shrink-0 items-center justify-center rounded-full bg-red-600 px-2 font-serif text-xs font-bold tabular-nums tracking-tight text-white shadow-md shadow-red-900/30 sm:h-8 sm:min-w-[1.5rem] sm:text-[13px]"
                aria-label={t('timetableOfferSoldVehicleCount', '{n} sold').replace('{n}', countFmt)}
              >
                {countFmt}
              </span>
            </span>
          )}
        </span>
        {count > 0 ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500 sm:h-4 sm:w-4" aria-hidden />
        ) : null}
      </button>
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
  soldArchiveCount = 0,
  onOpenSoldArchive,
}: Props) {
  const untitled = t('timetableOfferChipUntitled', 'Vehicle');
  const regionAria = t('timetableOfferVehicleStripTitle', 'Vehicles / offers');

  const { index, current, metaParts } = useMemo(() => {
    if (offers.length === 0) {
      return {
        index: 0,
        current: null as TimetableTruckOffer | null,
        metaParts: { lane: '', tail: '', full: '' },
      };
    }
    const sid = selectedId ?? offers[0]?.id ?? null;
    const i = sid ? offers.findIndex((o) => o.id === sid) : 0;
    const safe = i >= 0 ? i : 0;
    const cur = offers[safe] ?? offers[0]!;
    return {
      index: safe,
      current: cur,
      metaParts: buildStripMetaParts(cur, t),
    };
  }, [offers, selectedId, t]);

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

  if (offers.length === 0 || !current) {
    const onlySold =
      soldArchiveCount > 0 && onOpenSoldArchive
        ? t(
            'timetableOfferVehicleStripAllSoldHint',
            'All vehicle lines are marked sold — they are kept in the sold archive. Open it to review or take a line back.',
          )
        : t(
            'timetableOfferVehicleStripNoLines',
            'No vehicle lines yet — use + to add the first one.',
          );
    return (
      <div
        className="flex min-w-0 flex-col items-center gap-2 border-b border-slate-200/70 pb-2.5 text-center"
        role="region"
        aria-label={regionAria}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {t('timetableOfferVehicleStripLabelShort', 'Vehicles')}
        </span>
        <p className="max-w-md text-[11px] leading-snug text-slate-600 sm:text-xs">{onlySold}</p>
        {soldArchiveCount > 0 && onOpenSoldArchive ? (
          <button
            type="button"
            onClick={onOpenSoldArchive}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-red-200/90 bg-gradient-to-r from-red-50 to-rose-50/90 px-4 py-2.5 text-xs font-semibold text-red-900 shadow-sm transition hover:border-red-300 hover:shadow-md sm:min-h-0"
          >
            {t('timetableOfferSoldArchiveShow', 'Sold archive')}
            <span className="rounded-full bg-red-600 px-2 py-0.5 font-serif text-[11px] font-bold text-white tabular-nums">
              {formatOfferStripInt(soldArchiveCount)}
            </span>
          </button>
        ) : null}
        {addVehicleButton}
      </div>
    );
  }

  const kind = angebotLedgerKind({ gekauft: current.gekauft, verkauft: current.verkauft });
  const label = timetableOfferVehicleChipLabel(current, untitled);
  const idxLabel = t('timetableOfferVehicleIndexOf', '{current} of {total}')
    .replace('{current}', String(index + 1))
    .replace('{total}', String(offers.length));
  const metaLine = metaParts.full;
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
          <div className={`min-w-0 ${offers.length > 1 ? 'pr-7 sm:pr-8' : ''}`}>
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
