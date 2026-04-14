import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Save, Sparkles, X, Zap } from 'lucide-react'
import type { TimetableTruckOffer, TimetableVehicleDisplayExtra } from '../../../types/timetable'
import { parseOfferFreeText } from '../timetableOfferFreeTextParse'

type Props = {
  rowKey: string
  setOfferField: (patch: Partial<TimetableTruckOffer>) => void
  setVehicleExtra: (patch: Partial<TimetableVehicleDisplayExtra>) => void
  onGeneratorApplied?: () => void
  t: (key: string, fallback: string) => string
}

function extractedCount(parsed: ReturnType<typeof parseOfferFreeText>): number {
  return Object.keys(parsed.offerPatch).length + Object.keys(parsed.vehicleExtraPatch).length
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
  const [statusText, setStatusText] = useState('')
  const [lastParsed, setLastParsed] = useState<ReturnType<typeof parseOfferFreeText> | null>(null)

  useEffect(() => {
    setGenText('')
    setGenOpen(true)
    setStatusText('')
    setLastParsed(null)
  }, [rowKey])

  const applyParsed = useCallback(
    (parsed: ReturnType<typeof parseOfferFreeText>) => {
      const offerKeys = Object.keys(parsed.offerPatch)
      const vehicleExtraKeys = Object.keys(parsed.vehicleExtraPatch)

      if (offerKeys.length > 0) {
        setOfferField(parsed.offerPatch)
      }
      if (vehicleExtraKeys.length > 0) {
        setVehicleExtra(parsed.vehicleExtraPatch)
      }
      return offerKeys.length + vehicleExtraKeys.length
    },
    [setOfferField, setVehicleExtra]
  )

  const hasText = genText.trim().length > 0

  const previewLines = useMemo(() => lastParsed?.summaryLines ?? [], [lastParsed])

  const setAppliedMessage = useCallback(
    (count: number) => {
      if (count > 0) {
        setStatusText(
          t(
            'timetableOfferGenAppliedCount',
            'Recognized {count} values and filled the offer form.'
          ).replace('{count}', String(count))
        )
      } else {
        setStatusText(
          t(
            'timetableOfferGenNoValues',
            'No structured values found. Include make, model, km, year, price, or registration.'
          )
        )
      }
    },
    [t]
  )

  const handleFormat = useCallback(() => {
    const parsed = parseOfferFreeText(genText)
    const count = applyParsed(parsed)

    setLastParsed(parsed)
    setAppliedMessage(count)
    if (count > 0) {
      onGeneratorApplied?.()
    }
  }, [genText, applyParsed, setAppliedMessage, onGeneratorApplied])

  const handleSave = useCallback(() => {
    const trimmed = genText.trim()
    if (!trimmed) return

    const parsed = lastParsed ?? parseOfferFreeText(trimmed)
    const count = applyParsed(parsed)

    setAppliedMessage(count)
    if (count > 0) {
      onGeneratorApplied?.()
    }
    setGenText('')
    setLastParsed(null)
  }, [genText, lastParsed, applyParsed, setAppliedMessage, onGeneratorApplied])

  const handleCopy = useCallback(async () => {
    const v = genText.trim()
    if (!v) return
    try {
      await navigator.clipboard.writeText(v)
      setStatusText(t('timetableOfferGenCopied', 'Copied to clipboard.'))
    } catch {
      setStatusText(
        t('timetableOfferGenCopyDenied', 'Clipboard access denied in this browser context.')
      )
    }
  }, [genText, t])

  if (!genOpen) {
    return (
      <button
        type="button"
        onClick={() => setGenOpen(true)}
        className="w-full rounded-xl border border-sky-300/70 bg-gradient-to-r from-sky-50 to-indigo-50 py-2 text-xs font-semibold text-slate-800 hover:from-sky-100 hover:to-indigo-100"
      >
        {t('timetableOfferGenTitle', 'Offer generator')}
      </button>
    )
  }

  return (
    <section
      className="flex min-h-[min(56vh,24rem)] w-full flex-col overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-sm ring-1 ring-sky-100/70 lg:min-h-[min(64vh,28rem)]"
      aria-label={t('timetableOfferGenTitle', 'Offer generator')}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 bg-gradient-to-r from-slate-900 via-slate-800 to-sky-900 px-3 py-2.5 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <Zap className="h-4 w-4 shrink-0 text-sky-300" aria-hidden />
          <span className="truncate text-sm font-semibold tracking-tight">
            {t('timetableOfferGenTitle', 'Offer generator')}
          </span>
          {lastParsed ? (
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
              {t('timetableOfferGenDetected', 'Detected')}: {extractedCount(lastParsed)}
            </span>
          ) : null}
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 bg-gradient-to-b from-slate-50 to-white p-3">
        <p className="shrink-0 text-xs leading-relaxed text-slate-600">
          {t(
            'timetableOfferGenHint',
            'Customers often report by phone, email, or messenger about a truck for sale. Paste unstructured text here (for example from WhatsApp or email). Format extracts recognized values, shows a short structured version here, and fills the offer form. Save applies values and clears this box.'
          )}
        </p>

        <textarea
          value={genText}
          onChange={(e) => {
            setGenText(e.target.value)
            setLastParsed(null)
            setStatusText('')
          }}
          rows={7}
          className="min-h-[10.5rem] w-full flex-1 resize-y rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-800 shadow-inner outline-none focus:border-sky-400/80 focus:ring-2 focus:ring-sky-200/70"
          placeholder={t(
            'timetableOfferGenPlaceholder',
            'Paste message: MAN TGX 18.500, EZ 03/2020, 450tkm, Standort Bremen, Preis 85.000 EUR, Retarder, Standklima'
          )}
        />

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!hasText}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Copy className="h-3.5 w-3.5" aria-hidden />
            {t('timetableOfferGenCopy', 'Copy')}
          </button>
          <button
            type="button"
            onClick={handleFormat}
            disabled={!hasText}
            title={t(
              'timetableOfferGenFormatTitle',
              'Extract values, show a structured short text, and fill the offer form.'
            )}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t('timetableOfferGenFormat', 'Format')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasText}
            title={t(
              'timetableOfferGenSaveTitle',
              'Apply parsed values to the offer form, then clear this box.'
            )}
            className="inline-flex flex-[1.2] items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            {t('timetableOfferGenSave', 'Save')}
          </button>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white/90 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            {t('timetableOfferGenStructuredPreview', 'Structured preview')}
          </p>
          {previewLines.length === 0 ? (
            <p className="mt-1.5 text-xs text-slate-500">
              {t(
                'timetableOfferGenStructuredPreviewEmpty',
                'Click Format to show recognized values here.'
              )}
            </p>
          ) : (
            <ul className="mt-1.5 space-y-1.5 text-xs text-slate-700">
              {previewLines.map((line, index) => (
                <li key={`${line}-${index}`} className="rounded-md bg-slate-50 px-2 py-1">
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>

        {statusText ? (
          <p
            className="rounded-lg border border-sky-200/80 bg-sky-50/80 px-2.5 py-2 text-xs font-medium text-sky-900"
            role="status"
          >
            {statusText}
          </p>
        ) : null}
      </div>
    </section>
  )
}
