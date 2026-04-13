import { useCallback, useEffect, useState } from 'react'
import { Copy, Save, Sparkles, X, Zap } from 'lucide-react'
import type { TimetableTruckOffer, TimetableVehicleDisplayExtra } from '../../../types/timetable'
import { buildGeneratorSummary, parseOfferFreeText } from '../timetableOfferFreeTextParse'

type Props = {
  rowKey: string
  setOfferField: (patch: Partial<TimetableTruckOffer>) => void
  setVehicleExtra: (patch: Partial<TimetableVehicleDisplayExtra>) => void
  onGeneratorApplied?: () => void
  t: (key: string, fallback: string) => string
}

export function TimetableOfferGeneratorBlock({
  rowKey,
  setOfferField,
  setVehicleExtra,
  onGeneratorApplied,
  t,
}: Props) {
  const [genText, setGenText] = useState('')
  const [genOpen, setGenOpen] = useState(true)

  useEffect(() => {
    setGenText('')
    setGenOpen(true)
  }, [rowKey])

  const applyParsed = useCallback(
    (parsed: ReturnType<typeof parseOfferFreeText>) => {
      if (Object.keys(parsed.offerPatch).length > 0) {
        setOfferField(parsed.offerPatch)
      }
      if (Object.keys(parsed.vehicleExtraPatch).length > 0) {
        setVehicleExtra(parsed.vehicleExtraPatch)
      }
    },
    [setOfferField, setVehicleExtra]
  )

  const handleFormat = useCallback(() => {
    const parsed = parseOfferFreeText(genText)
    applyParsed(parsed)
    const summary = buildGeneratorSummary(parsed)
    if (summary) setGenText(summary)
    onGeneratorApplied?.()
  }, [genText, applyParsed, onGeneratorApplied])

  const handleSave = useCallback(() => {
    const trimmed = genText.trim()
    if (!trimmed) return
    const parsed = parseOfferFreeText(trimmed)
    applyParsed(parsed)
    setGenText('')
    onGeneratorApplied?.()
  }, [genText, applyParsed, onGeneratorApplied])

  const handleCopy = useCallback(async () => {
    const v = genText.trim()
    if (!v) return
    try {
      await navigator.clipboard.writeText(v)
    } catch {
      /* clipboard may be denied */
    }
  }, [genText])

  if (!genOpen) {
    return (
      <button
        type="button"
        onClick={() => setGenOpen(true)}
        className="w-full rounded-xl border border-violet-300 bg-violet-50/90 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-950/50 dark:text-violet-100"
      >
        {t('timetableOfferGenTitle', 'Offer generator')}
      </button>
    )
  }

  return (
    <section
      className="flex min-h-[min(52vh,22rem)] w-full flex-col overflow-hidden rounded-2xl border border-violet-300/80 shadow-md dark:border-violet-500/30 lg:min-h-[min(60vh,26rem)]"
      aria-label={t('timetableOfferGenTitle', 'Offer generator')}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 bg-[#7C3AED] px-3 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <Zap className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
          <span className="truncate text-sm font-semibold tracking-tight">
            {t('timetableOfferGenTitle', 'Offer generator')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setGenOpen(false)}
          className="rounded p-1 text-white/90 hover:bg-white/10"
          aria-label={t('timetableOfferGenCloseAria', 'Close generator')}
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col space-y-3 bg-slate-600 p-3 dark:bg-slate-800">
        <p className="shrink-0 text-xs leading-relaxed text-slate-300 dark:text-slate-400">
          {t(
            'timetableOfferGenHint',
            'Customers often call or email about a truck for sale. Paste their unstructured message here (from WhatsApp, email, etc.). Format extracts values, shows a short structured summary in this box, and fills the offer fields on the right. Save does the same, then clears this box.'
          )}
        </p>
        <textarea
          value={genText}
          onChange={(e) => setGenText(e.target.value)}
          rows={6}
          className="min-h-[10rem] w-full flex-1 resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-300 dark:border-slate-500 dark:bg-slate-950 dark:text-slate-100"
          placeholder={t(
            'timetableOfferGenPlaceholder',
            'Paste a call or email note, e.g.: Scania R 500 with retarder, 450tkm, first reg 03/2020, €85,000'
          )}
        />
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-400/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {t('timetableOfferGenCopy', 'Copy')}
          </button>
          <button
            type="button"
            onClick={handleFormat}
            title={t(
              'timetableOfferGenFormatTitle',
              'Fill the offer fields from the text above and show a structured summary here.'
            )}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-400/80 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('timetableOfferGenFormat', 'Format')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            title={t(
              'timetableOfferGenSaveTitle',
              'Fill the offer fields from the text above, then clear this box.'
            )}
            className="inline-flex flex-[1.2] items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {t('timetableOfferGenSave', 'Save')}
          </button>
        </div>
      </div>
    </section>
  )
}
