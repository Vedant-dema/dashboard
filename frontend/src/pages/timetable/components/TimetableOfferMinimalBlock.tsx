import { useMemo } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CircleDashed,
  FolderOpen,
  Truck,
} from 'lucide-react'
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
  onOpenAbholauftrag: () => void
  vehicleDocsCount: number
  onUploadVehicleDocuments: () => void
  /** Match Angebotsarchiv column card (blue-tinted gradient panel in timetable drawer). */
  archiveColumnSurface?: boolean
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
  /** No `dark:` variants: OS dark-mode can activate them while the offer card stays light → illegible text. */
  const base =
    'group flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500/40 sm:min-h-10'
  const idle = `${base} border-slate-300 bg-white text-slate-900 shadow-sm hover:border-slate-400 hover:bg-slate-50`
  if (!active) {
    return {
      button: idle,
      icon: 'h-3.5 w-3.5 shrink-0 text-slate-700 group-hover:text-slate-900',
    }
  }
  if (id === 'purchase') {
    return {
      button: `${base} border-emerald-700 bg-emerald-100 text-emerald-950 shadow-sm ring-2 ring-emerald-600/30`,
      icon: 'h-3.5 w-3.5 shrink-0 text-emerald-800',
    }
  }
  if (id === 'disposal') {
    return {
      button: `${base} border-red-700 bg-red-100 text-red-950 shadow-sm ring-2 ring-red-600/30`,
      icon: 'h-3.5 w-3.5 shrink-0 text-red-800',
    }
  }
  return {
    button: `${base} border-blue-700 bg-blue-100 text-blue-950 shadow-sm ring-2 ring-blue-600/30`,
    icon: 'h-3.5 w-3.5 shrink-0 text-blue-800',
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
  onOpenAbholauftrag,
  vehicleDocsCount,
  onUploadVehicleDocuments,
  archiveColumnSurface = false,
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

  const outerSurfaceClass = archiveColumnSurface
    ? 'min-w-0 rounded-xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-white to-white p-3 shadow-sm ring-1 ring-blue-900/[0.04] sm:p-3.5'
    : 'rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.04] sm:p-6 dark:border-slate-600/70 dark:ring-white/[0.06]'

  return (
    <form
      className="min-w-0"
      onSubmit={(e) => {
        e.preventDefault()
      }}
    >
      <div className={outerSurfaceClass}>
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
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

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-600/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="min-w-0 max-w-full sm:max-w-[min(100%,14rem)]">
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
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md sm:items-stretch">
              <button
                type="button"
                onClick={onUploadVehicleDocuments}
                className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200/95 bg-gradient-to-br from-white to-slate-50/90 px-3.5 py-2.5 text-left text-xs font-semibold text-slate-900 shadow-sm ring-1 ring-slate-900/[0.04] transition hover:border-slate-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:ring-offset-2 sm:min-h-10 sm:w-auto sm:justify-start"
                aria-label={t(
                  'timetableOfferVehicleDocsAria',
                  'Add photos and client files for this vehicle',
                )}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-800 shadow-sm"
                  aria-hidden
                >
                  <FolderOpen className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="leading-tight">
                    {t('timetableOfferVehicleDocsUpload', 'Upload documents')}
                  </span>
                  {vehicleDocsCount > 0 ? (
                    <span className="text-[11px] font-medium text-slate-600">
                      {t('timetableOfferVehicleDocsCount', '{n} file(s)').replace(
                        '{n}',
                        String(vehicleDocsCount),
                      )}
                    </span>
                  ) : null}
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-600/50">
          {ledgerKind === 'conflict' ? (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-snug text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-100">
              {t(
                'angeboteStockLaneConflictHint',
                'Purchase and disposal are both set — pick one lane in the new-offer form.',
              )}
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3 sm:items-start sm:gap-x-3 lg:gap-x-4">
            {/* Column 1 — seller price + pickup order (purchase lane only), aligned like reference layout */}
            <div className="flex min-w-0 flex-col gap-3">
              <div className={overviewFieldClass}>
                <label className={overviewLabelClass} htmlFor="tt-min-offer-seller">
                  {t('timetableOfferSellerAskingShort', 'Customer price (EUR)')}
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
              {activeLedgerMode === 'purchase' ? (
                <button
                  type="button"
                  onClick={onOpenAbholauftrag}
                  aria-label={t(
                    'timetableOfferAbholauftragAria',
                    'Open pickup order form (purchase)',
                  )}
                  className="group flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-emerald-300/90 bg-emerald-50/90 px-3 py-2.5 text-left shadow-sm ring-1 ring-emerald-900/[0.06] transition hover:border-emerald-400 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/45 focus-visible:ring-offset-2 sm:min-h-10"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-300/90 bg-emerald-200/80 text-emerald-950 transition group-hover:bg-emerald-200"
                    aria-hidden
                  >
                    <Truck className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 font-serif text-xs font-bold leading-snug tracking-tight text-slate-900 sm:text-[13px]">
                    {t('timetableOfferAbholauftragCta', 'Pickup order')}
                  </span>
                </button>
              ) : null}
            </div>

            {/* Column 2 — purchasing bid only */}
            <div className={overviewFieldClass}>
              <label className={overviewLabelClass} htmlFor="tt-min-offer-purchase">
                {t('timetableOfferPurchaseBidShort', 'DEMA price (EUR)')}
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

            {/* Column 3 — stock flow, stacked */}
            <div className={`${overviewFieldClass} min-w-0`}>
              <span className={overviewLabelClass} id="tt-min-offer-ledger-label">
                {t('angeboteStockFlowColHeader', 'Stock flow')}
              </span>
              <div
                className="mt-1.5 flex flex-col gap-1.5"
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

        <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-600/50">
          <div className={overviewFieldClass}>
            <label className={overviewLabelClass} htmlFor="tt-min-offer-ausst">
              {t('timetableOfferMinimalAusstattung', 'Equipment / features')}
            </label>
            <textarea
              id="tt-min-offer-ausst"
              value={offer.notes}
              onChange={(e) => setOfferField({ notes: e.target.value })}
              rows={3}
              className={`${textareaClassScrollable} !mt-0 min-h-[5.25rem] resize-y sm:min-h-[5.75rem]`}
              placeholder={ph}
            />
          </div>
        </div>
      </div>
    </form>
  )
}
