import { useMemo, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import type { TimetableTruckOffer } from '../../../types/timetable'
import { useAuth } from '../../../contexts/AuthContext'
import { formatEur, newTruckOfferId } from '../contactDrawerFormUtils'
type Props = {
  offer: TimetableTruckOffer
  setOfferField: (patch: Partial<TimetableTruckOffer>) => void
  localeTag: string
  t: (key: string, fallback: string) => string
  /** Optional short paragraph under the section title (timetable omits this; pass only when needed). */
  description?: ReactNode
  /** Omit top margin when embedded in a tight column layout. */
  compactTop?: boolean
  /** When the parent column already shows a title (e.g. Preisvergleich), hide the inner card heading. */
  hideCardTitle?: boolean
}

export function TimetableOfferNegotiationHistory({
  offer,
  setOfferField,
  localeTag,
  t,
  description,
  compactTop,
  hideCardTitle,
}: Props) {
  const { user } = useAuth()
  const author = useMemo(() => (user?.name ?? user?.email ?? '').trim(), [user?.email, user?.name])
  const rounds = offer.negotiation_rounds ?? []
  const canRecord = offer.expected_price_eur != null || offer.purchase_bid_eur != null

  const formatWhen = (iso: string) => {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return t('commonPlaceholderDash', '-')
    return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
  }

  const appendRound = () => {
    if (!canRecord) return
    const row = {
      id: newTruckOfferId(),
      at: new Date().toISOString(),
      ...(author ? { author_name: author } : {}),
      seller_asking_eur: offer.expected_price_eur ?? null,
      purchase_bid_eur: offer.purchase_bid_eur ?? null,
    }
    const next = [...rounds, row].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    setOfferField({ negotiation_rounds: next })
  }

  const removeRound = (id: string) => {
    const next = rounds.filter((r) => r.id !== id)
    setOfferField({ negotiation_rounds: next.length > 0 ? next : undefined })
  }

  return (
    <div
      className={`${
        compactTop ? 'mt-0' : 'mt-5'
      } space-y-3 rounded-2xl border border-indigo-100/90 bg-gradient-to-br from-indigo-50/60 via-white to-white p-4 shadow-sm ring-1 ring-indigo-900/[0.04] sm:p-5`}
    >
      {hideCardTitle ? (
        description ? <p className="text-xs leading-relaxed text-slate-500">{description}</p> : null
      ) : (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[0.08em] text-slate-700">
            {t('timetableNegotiationTitle', 'Price negotiation')}
          </h4>
          {description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
      )}

      {rounds.length === 0 ? (
        <p className="text-sm text-slate-500">{t('timetableNegotiationEmpty', 'No saved rounds yet.')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200/80 bg-white/90">
          <table className="w-full min-w-[20rem] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">{t('timetableNegotiationColWhen', 'When')}</th>
                <th className="px-2 py-2">{t('timetableNegotiationColPurchase', 'Purchasing')}</th>
                <th className="px-2 py-2">{t('timetableNegotiationColSeller', 'Seller')}</th>
                <th className="px-2 py-2">{t('timetableNegotiationColAuthor', 'By')}</th>
                <th className="w-10 px-1 py-2" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {rounds.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-slate-600">{formatWhen(r.at)}</td>
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-slate-800">
                    {formatEur(r.purchase_bid_eur, localeTag)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-slate-800">
                    {formatEur(r.seller_asking_eur, localeTag)}
                  </td>
                  <td className="max-w-[7rem] truncate px-2 py-2 text-slate-600" title={r.author_name}>
                    {r.author_name?.trim() || t('timetableContactActivityAuthorUnknown', 'Not recorded')}
                  </td>
                  <td className="px-1 py-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeRound(r.id)}
                      className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label={t('timetableNegotiationDeleteAria', 'Remove this round')}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pt-1">
        <button
          type="button"
          onClick={appendRound}
          disabled={!canRecord}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
        >
          {t('timetableNegotiationRecord', 'Record price round')}
        </button>
      </div>
    </div>
  )
}

