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

function ledgerTileStyles(
  id: LedgerUiMode,
  active: boolean,
): { button: string; icon: string } {
  const base =
    'group flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/35 sm:min-h-10'
  const idle = `${base} border-slate-200/95 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/90 dark:border-slate-600/80 dark:bg-slate-900/25 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800/35`
  if (!active) {
    return { button: idle, icon: 'h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-500' }
  }
  if (id === 'purchase') {
    return {
      button: `${base} border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/20 dark:bg-emerald-950/25 dark:text-emerald-50`,
      icon: 'h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400',
    }
  }
  if (id === 'disposal') {
    return {
      button: `${base} border-red-500 bg-red-50 text-red-950 ring-1 ring-red-500/20 dark:bg-red-950/25 dark:text-red-50`,
      icon: 'h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400',
    }
  }
  return {
    button: `${base} border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-500/20 dark:bg-blue-950/30 dark:text-blue-50`,
    icon: 'h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400',
  }
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

  /** Conflict: no lane looks “selected” until the user picks one. */
  const activeLedgerMode = useMemo((): LedgerUiMode | null => {
    if (ledgerKind === 'purchase') return 'purchase'
    if (ledgerKind === 'disposal') return 'disposal'
    if (ledgerKind === 'conflict') return null
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
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
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
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-600/50">
          <div className="max-w-full sm:max-w-[min(100%,14rem)]">
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
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-600/50">
          <p className="mb-4 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t(
              'angebotStockLedgerHint',
              'Purchase (inbound) and third-party sale (outbound) are mutually exclusive—pick the lane that matches this row.',
            )}
          </p>
          {ledgerKind === 'conflict' ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-snug text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100">
              {t(
                'angeboteStockLaneConflictHint',
                'Purchase and disposal are both set — pick one lane in the new-offer form.',
              )}
            </p>
          ) : null}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:items-start lg:gap-6">
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
            <div className={`${overviewFieldClass} min-w-0 sm:col-span-2 lg:col-span-1`}>
              <span className={overviewLabelClass} id="tt-min-offer-ledger-label">
                {t('angebotStockLedgerLabel', 'Stock transaction type')}
              </span>
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
                      label: t('angebotStockLedgerNeutral', 'Offer'),
                      Icon: CircleDashed,
                    },
                  ] as const
                ).map(({ id, label, Icon }) => {
                  const active = activeLedgerMode === id
                  const { button, icon } = ledgerTileStyles(id, active)
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOfferField(ledgerFlags(id))}
                      className={button}
                    >
                      <Icon className={icon} aria-hidden />
                      <span className="min-w-0 leading-tight">{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-600/50">
          <div className={overviewFieldClass}>
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
