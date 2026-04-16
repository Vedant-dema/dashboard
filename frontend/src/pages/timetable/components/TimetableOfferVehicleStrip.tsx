import { Plus, X } from 'lucide-react';
import type { AngebotLedgerKind } from '../../../lib/angebotLedger';
import { angebotLedgerKind } from '../../../lib/angebotLedger';
import type { TimetableTruckOffer } from '../../../types/timetable';

function chipLabel(o: TimetableTruckOffer, untitled: string): string {
  const mm = [o.brand, o.model].filter(Boolean).join(' ').trim();
  if (mm) return mm.length > 28 ? `${mm.slice(0, 25)}…` : mm;
  const vt = o.vehicle_type.trim();
  if (vt) return vt.length > 28 ? `${vt.slice(0, 25)}…` : vt;
  return untitled;
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

/** Selected tab border/ring/bg match stock lane (green = gekauft, red = verkauft, blue = Angebot). */
function selectedChipShellClass(kind: AngebotLedgerKind): string {
  switch (kind) {
    case 'purchase':
      return 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200';
    case 'disposal':
      return 'border-red-500 bg-red-50 text-red-950 ring-1 ring-red-200';
    case 'conflict':
      return 'border-rose-600 bg-rose-50 text-rose-950 ring-1 ring-rose-200';
    case 'neutral':
      return 'border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-200';
  }
}

function unselectedChipShellClass(kind: AngebotLedgerKind): string {
  if (kind === 'neutral') {
    return 'border-blue-300 bg-white text-slate-800 hover:border-blue-400';
  }
  return 'border-slate-200 bg-white text-slate-700 hover:border-slate-300';
}

type Props = {
  offers: TimetableTruckOffer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  t: (key: string, fallback: string) => string;
};

export function TimetableOfferVehicleStrip({
  offers,
  selectedId,
  onSelect,
  onAdd,
  onRemove,
  t,
}: Props) {
  const untitled = t('timetableOfferChipUntitled', 'Vehicle');
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        {t('timetableOfferVehicleStripTitle', 'Vehicles / offers')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {offers.map((o) => {
          const label = chipLabel(o, untitled);
          const sel = o.id === selectedId;
          const kind = angebotLedgerKind({ gekauft: o.gekauft, verkauft: o.verkauft });
          const lane =
            kind === 'purchase'
              ? t('angebotStockLedgerPurchase', 'Purchased')
              : kind === 'disposal'
                ? t('angebotStockLedgerDisposal', 'Sold (third party)')
                : kind === 'conflict'
                  ? t('angeboteStockLaneConflict', 'Review')
                  : t('angebotStockLedgerNeutral', 'Offer');
          const fullAria = t(
            'timetableOfferSelectVehicleFullAria',
            'Select {label}. Stock flow: {lane}.'
          )
            .replace('{label}', label)
            .replace('{lane}', lane);
          return (
            <div key={o.id} className="inline-flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onSelect(o.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  sel ? selectedChipShellClass(kind) : unselectedChipShellClass(kind)
                }`}
                aria-pressed={sel}
                title={fullAria}
                aria-label={fullAria}
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${ledgerDotClass(kind)}`}
                  aria-hidden
                />
                {label}
              </button>
              {offers.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onRemove(o.id)}
                  className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                  aria-label={t(
                    'timetableOfferRemoveVehicleAria',
                    'Remove this vehicle from the list'
                  )}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-amber-300 hover:bg-amber-50/50 hover:text-amber-950"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {t('timetableOfferAddVehicle', 'Add vehicle')}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {t(
          'timetableOfferGenScopedHint',
          'The generator and form apply to the selected vehicle.'
        )}
      </p>
      {offers.length > 1 ? (
        <p className="text-[11px] leading-snug text-slate-500">
          {t(
            'timetableOfferVehicleStripLegend',
            'Tab dots: green = purchased · red = sold (third party) · blue = offer · rose = conflict—review'
          )}
        </p>
      ) : null}
    </div>
  );
}
