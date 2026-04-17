import { History, RotateCcw } from 'lucide-react'
import type { TimetableOfferMemoryItem } from '../timetableOfferMemory'
import { formatEur } from '../contactDrawerFormUtils'

type Props = {
  items: TimetableOfferMemoryItem[]
  offerHasVehicleIdentity: boolean
  localeTag: string
  t: (key: string, fallback: string) => string
  onApplyPrices: (item: TimetableOfferMemoryItem) => void
  /** Select that vehicle in the strip (same calendar row) or jump to the other row; does not merge prices. */
  onOpenOffer?: (item: TimetableOfferMemoryItem) => void
  /**
   * `column` — parent supplies the section title; panel shows content only (cleaner grid column).
   * `card` — default standalone banner with icon + title.
   */
  layout?: 'card' | 'column'
}

function formatWhen(iso: string, localeTag: string, t: Props['t']): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return t('commonPlaceholderDash', '-')
  return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', timeStyle: 'short' }).format(ms)
}

export function TimetableOfferMemoryPanel({
  items,
  offerHasVehicleIdentity,
  localeTag,
  t,
  onApplyPrices,
  onOpenOffer,
  layout = 'card',
}: Props) {
  const isColumn = layout === 'column'
  const memoryLabel = t('timetableOfferMemoryTitle', 'Offer memory')

  return (
    <div
      className={`rounded-2xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-white to-white shadow-sm ring-1 ring-blue-900/[0.04] ${
        isColumn ? 'flex min-h-0 flex-1 flex-col p-3.5 sm:p-4' : 'p-4 sm:p-5'
      }`}
      role="region"
      aria-label={memoryLabel}
    >
      {isColumn ? null : (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
            <History className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">{memoryLabel}</h4>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        isColumn ? (
          <div className="flex min-h-[5rem] flex-1 gap-3 sm:min-h-[5.5rem]">
            <span
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/20"
              aria-hidden
            >
              <History className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
              {offerHasVehicleIdentity
                ? t('timetableOfferMemoryEmptyVehicle', 'No prior matching truck offers found for this supplier.')
                : t('timetableOfferMemoryEmptySupplier', 'No previous offer pricing found for this supplier yet.')}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            {offerHasVehicleIdentity
              ? t('timetableOfferMemoryEmptyVehicle', 'No prior matching truck offers found for this supplier.')
              : t('timetableOfferMemoryEmptySupplier', 'No previous offer pricing found for this supplier yet.')}
          </p>
        )
      ) : (
        <div className={`min-h-0 space-y-2.5 overflow-y-auto ${isColumn ? 'mt-0 flex-1 pr-0.5 pt-1' : 'mt-3'}`}>
          {items.map((item) => {
            const canApply = item.latestSellerAskingEur != null || item.latestPurchaseBidEur != null
            return (
              <article
                key={`${item.entryId}-${item.offerId}`}
                className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        item.matchKind === 'same_vehicle'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.matchKind === 'same_vehicle'
                        ? t('timetableOfferMemoryBadgeVehicle', 'Same vehicle')
                        : t('timetableOfferMemoryBadgeSupplier', 'Same supplier')}
                    </span>
                    <span className="text-xs font-medium text-slate-700">{item.vehicleLabel}</span>
                  </div>
                  <span className="text-[11px] tabular-nums text-slate-500">
                    {formatWhen(item.happenedAt, localeTag, t)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {[item.companyName, item.contactName || item.phone].filter((v) => v.trim()).join(' - ')}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-700">
                    {t('timetableOfferMemoryDema', 'DEMA')}: {formatEur(item.latestPurchaseBidEur, localeTag)}
                  </span>
                  <span className="font-semibold text-slate-700">
                    {t('timetableOfferMemorySeller', 'Seller')}: {formatEur(item.latestSellerAskingEur, localeTag)}
                  </span>
                  {item.roundCount > 0 ? (
                    <span className="text-slate-500">
                      {t('timetableOfferMemoryRounds', '{count} rounds').replace('{count}', String(item.roundCount))}
                    </span>
                  ) : null}
                </div>
                {item.latestNote ? (
                  <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-slate-600">{item.latestNote}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {onOpenOffer ? (
                    <button
                      type="button"
                      onClick={() => onOpenOffer(item)}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      {t('timetableOfferMemoryOpenVehicle', 'Open this vehicle')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onApplyPrices(item)}
                    disabled={!canApply}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 transition hover:bg-blue-100 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                    {t('timetableOfferMemoryApply', 'Use these prices')}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

