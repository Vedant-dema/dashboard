import type { TimetableTruckOffer, TimetableVehicleDisplayExtra } from '../../../types/timetable'
import {
  overviewFieldClass,
  overviewInputClass,
  overviewLabelClass,
  textareaClassScrollable,
} from '../contactDrawerFormClasses'

type Props = {
  offer: TimetableTruckOffer
  vehicleExtra: TimetableVehicleDisplayExtra
  setOfferField: (patch: Partial<TimetableTruckOffer>) => void
  setVehicleExtra: (patch: Partial<TimetableVehicleDisplayExtra>) => void
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
 * Structured offer form (Angebot column): vehicle, specs, equipment, price.
 * Full offer modal is opened from the timetable row / parent, not from here.
 */
export function TimetableOfferMinimalBlock({
  offer,
  vehicleExtra: ve,
  setOfferField,
  setVehicleExtra,
  t,
}: Props) {
  const ph = t('timetableOfferMinimalUnderlinePh', '—')
  const regPh = t('timetableContactRegistrationPh', 'MM/YYYY')

  return (
    <form
      className="min-w-0"
      onSubmit={(e) => {
        e.preventDefault()
      }}
    >
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-6 dark:border-slate-600/70 dark:ring-white/[0.06]">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className={overviewFieldClass}>
            <label className={overviewLabelClass} htmlFor="tt-min-offer-vt">
              {t('timetableOfferMinimalFahrzeugart', 'Vehicle category')}
            </label>
            <input
              id="tt-min-offer-vt"
              type="text"
              value={offer.vehicle_type}
              onChange={(e) => setOfferField({ vehicle_type: e.target.value })}
              className={overviewInputClass}
              placeholder={ph}
              autoComplete="off"
            />
          </div>
          <div className={overviewFieldClass}>
            <label className={overviewLabelClass} htmlFor="tt-min-offer-hm">
              {t('timetableOfferMinimalHerstellerModell', 'Make and model')}
            </label>
            <input
              id="tt-min-offer-hm"
              type="text"
              value={makeModelDisplay(offer)}
              onChange={(e) => setOfferField(splitBrandModel(e.target.value))}
              className={overviewInputClass}
              placeholder={ph}
              autoComplete="off"
            />
          </div>
          <div className={overviewFieldClass}>
            <label className={overviewLabelClass} htmlFor="tt-min-ve-body">
              {t('timetableOfferMinimalAufbauart', 'Body type')}
            </label>
            <input
              id="tt-min-ve-body"
              type="text"
              value={ve.body_type ?? ''}
              onChange={(e) => setVehicleExtra({ body_type: e.target.value || undefined })}
              className={overviewInputClass}
              placeholder={ph}
              autoComplete="off"
            />
          </div>
          <div className={overviewFieldClass}>
            <label className={overviewLabelClass} htmlFor="tt-min-ve-reg">
              {t('timetableOfferMinimalErstzulassung', 'First registration (month/year)')}
            </label>
            <input
              id="tt-min-ve-reg"
              type="text"
              value={ve.registration_mm_yyyy ?? ''}
              onChange={(e) =>
                setVehicleExtra({ registration_mm_yyyy: e.target.value || undefined })
              }
              className={overviewInputClass}
              placeholder={regPh}
              autoComplete="off"
            />
          </div>
          <div className={overviewFieldClass}>
            <label className={overviewLabelClass} htmlFor="tt-min-offer-km">
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
              className={overviewInputClass}
              placeholder={ph}
              autoComplete="off"
            />
          </div>
          <div className={overviewFieldClass}>
            <label className={overviewLabelClass} htmlFor="tt-min-offer-seller">
              {t('timetableOfferSellerAskingShort', 'Seller asking (EUR)')}
            </label>
            <input
              id="tt-min-offer-seller"
              type="text"
              inputMode="decimal"
              value={offer.expected_price_eur != null ? String(offer.expected_price_eur) : ''}
              onChange={(e) => {
                const n = parsePriceInput(e.target.value)
                setOfferField({ expected_price_eur: n })
              }}
              className={overviewInputClass}
              placeholder={ph}
              autoComplete="off"
            />
          </div>
          <div className={overviewFieldClass}>
            <label className={overviewLabelClass} htmlFor="tt-min-offer-purchase">
              {t('timetableOfferPurchaseBidShort', 'Purchasing bid (EUR)')}
            </label>
            <input
              id="tt-min-offer-purchase"
              type="text"
              inputMode="decimal"
              value={offer.purchase_bid_eur != null ? String(offer.purchase_bid_eur) : ''}
              onChange={(e) => {
                const n = parsePriceInput(e.target.value)
                setOfferField({ purchase_bid_eur: n })
              }}
              className={overviewInputClass}
              placeholder={ph}
              autoComplete="off"
            />
          </div>
          <div className={`${overviewFieldClass} sm:col-span-2`}>
            <label className={overviewLabelClass} htmlFor="tt-min-offer-ausst">
              {t('timetableOfferMinimalAusstattung', 'Equipment / features')}
            </label>
            <textarea
              id="tt-min-offer-ausst"
              value={offer.notes}
              onChange={(e) => setOfferField({ notes: e.target.value })}
              rows={4}
              className={`${textareaClassScrollable} !mt-0 min-h-[6.5rem] resize-y sm:min-h-[7rem]`}
              placeholder={ph}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
