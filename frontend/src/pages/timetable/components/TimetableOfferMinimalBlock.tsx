import { ChevronRight } from 'lucide-react'
import type { TimetableTruckOffer, TimetableVehicleDisplayExtra } from '../../../types/timetable'

/** Match reference: light label, underline input. */
const fieldLabel =
  'mb-1 block text-sm font-medium text-slate-400 dark:text-slate-400'
const underlineInput =
  'w-full border-0 border-b border-slate-400 bg-transparent px-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-700 focus:outline-none focus:ring-0 dark:border-slate-500 dark:text-slate-100 dark:focus:border-slate-300'

type Props = {
  offer: TimetableTruckOffer
  vehicleExtra: TimetableVehicleDisplayExtra
  setOfferField: (patch: Partial<TimetableTruckOffer>) => void
  setVehicleExtra: (patch: Partial<TimetableVehicleDisplayExtra>) => void
  onOpenFullOfferModal: () => void
  t: (key: string, fallback: string) => string
}

function parsePriceInput(raw: string): number | null {
  const v = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '')
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** First token → brand, remainder → model (single “make and model” field). */
function splitBrandModel(combined: string): { brand: string; model: string } {
  const trimmed = combined.trim()
  if (!trimmed) return { brand: '', model: '' }
  const i = trimmed.indexOf(' ')
  if (i === -1) return { brand: trimmed, model: '' }
  return { brand: trimmed.slice(0, i), model: trimmed.slice(i + 1).trim() }
}

function makeModelDisplay(offer: TimetableTruckOffer): string {
  return [offer.brand, offer.model].filter(Boolean).join(' ').trim()
}

/**
 * Compact Angebot tab: seven fields only (Fahrzeugart … Preisvorstellung).
 * Ausstattung ↔ `offer.notes`. Full modal still exposes all legacy columns.
 */
export function TimetableOfferMinimalBlock({
  offer,
  vehicleExtra: ve,
  setOfferField,
  setVehicleExtra,
  onOpenFullOfferModal,
  t,
}: Props) {
  const ph = t('timetableOfferMinimalUnderlinePh', '—')

  return (
    <div className="relative min-w-0 space-y-5 pr-0 min-[1100px]:pr-12">
      <button
        type="button"
        onClick={onOpenFullOfferModal}
        className="absolute right-0 top-8 z-[1] hidden h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 min-[1100px]:flex dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
        aria-label={t('timetableOfferMinimalMoreAria', 'More fields')}
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>

      <div className="flex flex-col gap-y-5">
        <div>
          <label className={fieldLabel} htmlFor="tt-min-offer-vt">
            {t('timetableOfferMinimalFahrzeugart', 'Vehicle category')}
          </label>
          <input
            id="tt-min-offer-vt"
            type="text"
            value={offer.vehicle_type}
            onChange={(e) => setOfferField({ vehicle_type: e.target.value })}
            className={underlineInput}
            placeholder={ph}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="tt-min-offer-hm">
            {t('timetableOfferMinimalHerstellerModell', 'Make and model')}
          </label>
          <input
            id="tt-min-offer-hm"
            type="text"
            value={makeModelDisplay(offer)}
            onChange={(e) => setOfferField(splitBrandModel(e.target.value))}
            className={underlineInput}
            placeholder={ph}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="tt-min-ve-body">
            {t('timetableOfferMinimalAufbauart', 'Body type')}
          </label>
          <input
            id="tt-min-ve-body"
            type="text"
            value={ve.body_type ?? ''}
            onChange={(e) => setVehicleExtra({ body_type: e.target.value || undefined })}
            className={underlineInput}
            placeholder={ph}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="tt-min-ve-reg">
            {t('timetableOfferMinimalErstzulassung', 'First registration (month/year)')}
          </label>
          <input
            id="tt-min-ve-reg"
            type="text"
            value={ve.registration_mm_yyyy ?? ''}
            onChange={(e) =>
              setVehicleExtra({ registration_mm_yyyy: e.target.value || undefined })
            }
            className={underlineInput}
            placeholder={t('timetableContactRegistrationPh', 'MM/YYYY')}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="tt-min-offer-km">
            {t('timetableOfferMinimalKmStand', 'Mileage')}
          </label>
          <input
            id="tt-min-offer-km"
            type="text"
            inputMode="numeric"
            value={offer.mileage_km != null ? String(offer.mileage_km) : ''}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '')
              setOfferField({
                mileage_km: digits === '' ? null : Number(digits),
              })
            }}
            className={underlineInput}
            placeholder={ph}
            autoComplete="off"
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="tt-min-offer-ausst">
            {t('timetableOfferMinimalAusstattung', 'Equipment / features')}
          </label>
          <textarea
            id="tt-min-offer-ausst"
            value={offer.notes}
            onChange={(e) => setOfferField({ notes: e.target.value })}
            rows={4}
            className={`${underlineInput} min-h-[5.5rem] resize-y border-slate-300 dark:border-slate-600`}
            placeholder={ph}
          />
        </div>
        <div>
          <label className={fieldLabel} htmlFor="tt-min-offer-price">
            {t('timetableOfferMinimalPreisvorstellung', 'Price indication')}
          </label>
          <input
            id="tt-min-offer-price"
            type="text"
            inputMode="decimal"
            value={offer.expected_price_eur != null ? String(offer.expected_price_eur) : ''}
            onChange={(e) => {
              const n = parsePriceInput(e.target.value)
              setOfferField({ expected_price_eur: n })
            }}
            className={underlineInput}
            placeholder={ph}
            autoComplete="off"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenFullOfferModal}
        className="w-full rounded-lg bg-[#4A5568] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d4759] dark:bg-slate-600 dark:hover:bg-slate-500"
      >
        {t('timetableContactColOffer', 'Offer')}
      </button>
    </div>
  )
}
