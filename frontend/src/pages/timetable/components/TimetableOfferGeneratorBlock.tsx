import { useCallback, useEffect, useMemo, useState } from 'react'
import { Copy, Save, Sparkles } from 'lucide-react'
import type { TimetableTruckOffer, TimetableVehicleDisplayExtra } from '../../../types/timetable'
import { parseOfferFreeText } from '../timetableOfferFreeTextParse'

type Props = {
  rowKey: string
  currentOffer: TimetableTruckOffer
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
  currentOffer,
  setOfferField,
  setVehicleExtra,
  onGeneratorApplied,
  t,
}: Props) {
  const [genText, setGenText] = useState('')
  const [statusText, setStatusText] = useState('')
  const [lastParsed, setLastParsed] = useState<ReturnType<typeof parseOfferFreeText> | null>(null)

  useEffect(() => {
    setGenText('')
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

  const setSaveAppliedMessage = useCallback(
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

  const setFormatPreviewMessage = useCallback(
    (count: number) => {
      if (count > 0) {
        setStatusText(
          t(
            'timetableOfferGenFormatPreviewCount',
            'Recognized {count} value(s) — click Save to apply them to the offer form.'
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
    const parsed = parseOfferFreeText(genText, currentOffer)
    setLastParsed(parsed)
    setFormatPreviewMessage(extractedCount(parsed))
  }, [genText, currentOffer, setFormatPreviewMessage])

  const handleSave = useCallback(() => {
    const trimmed = genText.trim()
    if (!trimmed) return

    const parsed = lastParsed ?? parseOfferFreeText(trimmed, currentOffer)
    const count = applyParsed(parsed)

    setSaveAppliedMessage(count)
    if (count > 0) {
      onGeneratorApplied?.()
    }
    setGenText('')
    setLastParsed(null)
  }, [genText, lastParsed, currentOffer, applyParsed, setSaveAppliedMessage, onGeneratorApplied])

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

  return (
    <section
      className="flex min-h-0 w-full max-h-[min(52vh,26rem)] flex-col overflow-hidden rounded-xl border border-sky-200/80 bg-white shadow-sm ring-1 ring-sky-100/70 lg:max-h-[min(48vh,24rem)]"
      aria-label={t('timetableOfferGenTitle', 'Offer generator')}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-2 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-3.5">
        {lastParsed ? (
          <div className="flex shrink-0 items-center justify-start">
            <span className="rounded-full border border-sky-200/80 bg-sky-50/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-900">
              {t('timetableOfferGenDetected', 'Detected')}: {extractedCount(lastParsed)}
            </span>
          </div>
        ) : null}
        <textarea
          value={genText}
          onChange={(e) => {
            setGenText(e.target.value)
            setLastParsed(null)
            setStatusText('')
          }}
          rows={4}
          className="min-h-[6.5rem] w-full flex-1 resize-y rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-[13px] leading-snug text-slate-800 shadow-inner outline-none focus:border-sky-400/80 focus:ring-2 focus:ring-sky-200/70 sm:min-h-[7rem] sm:px-3 sm:text-sm"
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
              'Extract values and show a structured preview (does not fill the offer form).'
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
