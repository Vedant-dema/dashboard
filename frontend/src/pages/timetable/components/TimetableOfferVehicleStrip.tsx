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
      return 'bg-amber-500 ring-1 ring-amber-800/30';
    case 'conflict':
      return 'bg-rose-500 ring-1 ring-rose-700/30';
    default:
      return 'bg-slate-400 ring-1 ring-slate-600/25';
  }
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
                  : t('angebotStockLedgerNeutral', 'Unclassified');
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
                  sel
                    ? 'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-200'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
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
            'Tab dots: green = purchased · amber = sold (third party) · gray = unclassified · red = review'
          )}
        </p>
      ) : null}
    </div>
  );
}
