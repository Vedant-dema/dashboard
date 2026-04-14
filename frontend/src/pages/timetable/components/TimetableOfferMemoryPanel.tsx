import { History, RotateCcw } from 'lucide-react'
import type { TimetableOfferMemoryItem } from '../timetableOfferMemory'
import { formatEur } from '../contactDrawerFormUtils'

type Props = {
  items: TimetableOfferMemoryItem[]
  offerHasVehicleIdentity: boolean
  localeTag: string
  t: (key: string, fallback: string) => string
  onApplyPrices: (item: TimetableOfferMemoryItem) => void
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
}: Props) {
  return (
    <div className="rounded-2xl border border-blue-100/90 bg-gradient-to-br from-blue-50/70 via-white to-white p-4 shadow-sm ring-1 ring-blue-900/[0.04] sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <History className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">
            {t('timetableOfferMemoryTitle', 'Offer memory')}
          </h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {offerHasVehicleIdentity
              ? t(
                  'timetableOfferMemoryHintVehicle',
                  'Matches from older rows for this supplier and vehicle so repeated calls keep full price context.'
                )
              : t(
                  'timetableOfferMemoryHintSupplier',
                  'Fill vehicle details (make/model/year) to unlock exact same-truck history. Until then, recent supplier offers are shown.'
                )}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {offerHasVehicleIdentity
            ? t('timetableOfferMemoryEmptyVehicle', 'No prior matching truck offers found for this supplier.')
            : t('timetableOfferMemoryEmptySupplier', 'No previous offer pricing found for this supplier yet.')}
        </p>
      ) : (
        <div className="mt-3 space-y-2.5">
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
                <div className="mt-3 flex justify-end">
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

