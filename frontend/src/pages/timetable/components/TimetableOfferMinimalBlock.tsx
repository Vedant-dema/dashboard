import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, CircleDashed } from 'lucide-react'
import type { TimetableTruckOffer, TimetableVehicleDisplayExtra } from '../../../types/timetable'
import { angebotLedgerKind } from '../../../lib/angebotLedger'
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

type LedgerUiMode = 'purchase' | 'disposal' | 'neutral'

function ledgerFlags(mode: LedgerUiMode): Pick<TimetableTruckOffer, 'gekauft' | 'verkauft'> {
  if (mode === 'purchase') return { gekauft: true, verkauft: false }
  if (mode === 'disposal') return { gekauft: false, verkauft: true }
  return { gekauft: false, verkauft: false }
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

  const ledgerKind = useMemo(
    () => angebotLedgerKind({ gekauft: offer.gekauft, verkauft: offer.verkauft }),
    [offer.gekauft, offer.verkauft],
  )

  const activeLedgerMode = useMemo((): LedgerUiMode => {
    if (ledgerKind === 'purchase') return 'purchase'
    if (ledgerKind === 'disposal') return 'disposal'
    return 'neutral'
  }, [ledgerKind])

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
          <div className={`${overviewFieldClass} sm:col-span-2`}>
            <div className="grid gap-4 sm:grid-cols-3">
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
              <div className={`${overviewFieldClass} min-w-0`}>
                <span className={overviewLabelClass} id="tt-min-offer-ledger-label">
                  {t('angebotStockLedgerLabel', 'Stock transaction type')}
                </span>
                <p className="mb-2 text-[10px] leading-snug text-slate-500">
                  {t(
                    'angebotStockLedgerHint',
                    'Purchase (inbound) and third-party sale (outbound) are mutually exclusive—pick the lane that matches this row.',
                  )}
                </p>
                {ledgerKind === 'conflict' ? (
                  <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-900">
                    {t(
                      'angeboteStockLaneConflictHint',
                      'Purchase and disposal are both set — pick one lane in the new-offer form.',
                    )}
                  </p>
                ) : null}
                <div
                  className="flex flex-col gap-1.5"
                  role="group"
                  aria-labelledby="tt-min-offer-ledger-label"
                >
                  {(
                    [
                      {
                        id: 'purchase' as const,
                        label: t('angebotStockLedgerPurchase', 'Purchased'),
                        Icon: ArrowDownLeft,
                      },
                      {
                        id: 'disposal' as const,
                        label: t('angebotStockLedgerDisposal', 'Sold (third party)'),
                        Icon: ArrowUpRight,
                      },
                      {
                        id: 'neutral' as const,
                        label: t('angebotStockLedgerNeutral', 'Unclassified'),
                        Icon: CircleDashed,
                      },
                    ] as const
                  ).map(({ id, label, Icon }) => {
                    const active = activeLedgerMode === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setOfferField(ledgerFlags(id))}
                        className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-xs font-semibold transition sm:min-h-0 sm:py-1.5 ${
                          active
                            ? id === 'purchase'
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/25'
                              : id === 'disposal'
                                ? 'border-amber-500 bg-amber-50 text-amber-950 ring-1 ring-amber-500/25'
                                : 'border-slate-500 bg-slate-50 text-slate-800 ring-1 ring-slate-400/30'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50/50'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                        <span className="min-w-0 leading-tight">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
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
