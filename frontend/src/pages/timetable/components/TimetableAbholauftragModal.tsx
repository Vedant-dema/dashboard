import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Building2,
  CarFront,
  ClipboardList,
  FileStack,
  FolderOpen,
  ImagePlus,
  Printer,
  Truck,
  User,
  X,
  type LucideIcon,
} from 'lucide-react'
import type {
  TimetableContactUnterlage,
  TimetableOverviewKundeDraft,
  TimetableTruckOffer,
  TimetableVehicleDisplayExtra,
} from '../../../types/timetable'
import { formatOverviewAddressLine } from '../timetableOverviewKunde'
import {
  overviewFieldClass,
  overviewInputClass,
  overviewLabelClass,
  scrollbarHiddenY,
  textareaClass,
} from '../contactDrawerFormClasses'

/** Dense textareas: cap height, overflow without visible scrollbar (modal “no bar” goal). */
const abholTextareaCompact = `${textareaClass} max-h-[4.25rem] min-h-[2.5rem] resize-none overflow-y-auto py-2 text-[12px] leading-snug ${scrollbarHiddenY}`
const abholTextareaNotes = `${textareaClass} max-h-[4.75rem] min-h-[2.75rem] resize-none overflow-y-auto py-2 text-[12px] leading-snug ${scrollbarHiddenY}`

export type TimetableAbholauftragModalProps = {
  open: boolean
  onClose: () => void
  localeTag: string
  t: (key: string, fallback: string) => string
  buyerName: string
  companyName: string
  contactName: string
  phone: string
  overview: TimetableOverviewKundeDraft
  offer: TimetableTruckOffer
  vehicleExtra: TimetableVehicleDisplayExtra
}

type TriState = '' | 'yes' | 'no'

type FormState = {
  pickupNumber: string
  buyer: string
  anummer: string
  vehicleClass: string
  bodyType: string
  brand: string
  model: string
  euroNorm: string
  axles: string
  grossWeight: string
  vin: string
  mileage: string
  company: string
  phoneDial: string
  pickupAddress: string
  apName: string
  mobile: string
  email: string
  priceEur: string
  briefSchein: string
  pickupFrom: string
  distanceKm: string
  station: string
  driverPickup: TriState
  payCash: boolean
  payBank: boolean
  invoiceReceived: TriState
  notes: string
  otherAgreements: string
  authorizedCollector: string
  docBrief: string
  docSchein: string
  docInvoice: string
  /** Data URL of optional vehicle photo (paper-form slot). */
  vehiclePhotoDataUrl: string
}

const FILLED = 1
const EMPTY = 0

function nz(s: string | undefined): number {
  return s != null && String(s).trim() !== '' ? FILLED : EMPTY
}

function formatKm(n: number | null | undefined, localeTag: string): string {
  if (n == null || !Number.isFinite(n)) return ''
  try {
    return new Intl.NumberFormat(localeTag, { maximumFractionDigits: 0 }).format(n)
  } catch {
    return String(Math.round(n))
  }
}

function formatEur(n: number | null | undefined, localeTag: string): string {
  if (n == null || !Number.isFinite(n)) return ''
  try {
    return new Intl.NumberFormat(localeTag, { maximumFractionDigits: 0 }).format(n)
  } catch {
    return String(Math.round(n))
  }
}

function todayForLocale(localeTag: string): string {
  try {
    return new Date().toLocaleDateString(localeTag, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function pickupNumberSeed(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function buildAddressLine(overview: TimetableOverviewKundeDraft, localeTag: string): string {
  const base = formatOverviewAddressLine(overview).trim()
  const idx = Math.min(
    Math.max(0, overview.active_adresse_idx ?? 0),
    Math.max(0, overview.adressen.length - 1),
  )
  const a = overview.adressen[idx]
  const code = (a?.land_code ?? '').trim().toUpperCase()
  if (!code) return base
  let country = code
  try {
    const dn = new Intl.DisplayNames([localeTag], { type: 'region' })
    const n = dn.of(code)
    if (n) country = n
  } catch {
    /* keep code */
  }
  if (!base) return country
  if (base.toLowerCase().includes(country.toLowerCase())) return base
  return `${base}, ${country}`
}

function buildInitial(p: TimetableAbholauftragModalProps): FormState {
  const { buyerName, companyName, contactName, phone, overview, offer, vehicleExtra, localeTag } = p
  return {
    pickupNumber: pickupNumberSeed(),
    buyer: buyerName.trim(),
    anummer: (overview.kunden_nr ?? '').trim(),
    vehicleClass: (offer.vehicle_type ?? '').trim(),
    bodyType: (vehicleExtra.body_type ?? '').trim(),
    brand: (offer.brand ?? '').trim(),
    model: (offer.model ?? '').trim(),
    euroNorm: '',
    axles: '',
    grossWeight: '',
    vin: '',
    mileage: formatKm(offer.mileage_km, localeTag),
    company: (overview.firmenname || companyName).trim(),
    phoneDial: (phone ?? '').trim(),
    pickupAddress: buildAddressLine(overview, localeTag),
    apName: (contactName ?? '').trim(),
    mobile: '',
    email: '',
    priceEur: formatEur(offer.purchase_bid_eur ?? offer.expected_price_eur ?? null, localeTag),
    briefSchein: '',
    pickupFrom: todayForLocale(localeTag),
    distanceKm: '',
    station: '',
    driverPickup: '',
    payCash: false,
    payBank: true,
    invoiceReceived: '',
    notes: (offer.notes ?? '').trim(),
    otherAgreements: '',
    authorizedCollector: '',
    docBrief: '',
    docSchein: '',
    docInvoice: '',
    vehiclePhotoDataUrl: '',
  }
}

function readinessScore(form: FormState): { filled: number; total: number; pct: number } {
  const veh = nz(form.brand) || nz(form.model) || nz(form.vehicleClass)
  const flags = [
    nz(form.buyer),
    nz(form.company),
    nz(form.pickupAddress),
    veh,
    nz(form.mileage),
    nz(form.priceEur),
    nz(form.vin),
    nz(form.pickupFrom),
  ]
  const filled = flags.reduce((a, b) => a + b, 0)
  const total = flags.length
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
  return { filled, total, pct }
}

const sectionAccent = {
  emerald: 'border-l-emerald-500 from-emerald-50/40',
  sky: 'border-l-sky-500 from-sky-50/35',
  amber: 'border-l-amber-500 from-amber-50/30',
  violet: 'border-l-violet-500 from-violet-50/35',
} as const

const iconShell = {
  emerald: 'bg-emerald-100 text-emerald-800 ring-emerald-200/60',
  sky: 'bg-sky-100 text-sky-900 ring-sky-200/60',
  amber: 'bg-amber-100 text-amber-950 ring-amber-200/60',
  violet: 'bg-violet-100 text-violet-900 ring-violet-200/60',
} as const

type Accent = keyof typeof sectionAccent

function SectionCard({
  accent,
  icon: Icon,
  titleId,
  title,
  children,
  spacious,
  className,
}: {
  accent: Accent
  icon: LucideIcon
  titleId: string
  title: string
  children: ReactNode
  /** Extra vertical padding and header size (e.g. vehicle block). */
  spacious?: boolean
  /** Merged onto `<section>` — use `h-full min-h-0 flex flex-col` when filling a stretched grid column. */
  className?: string
}) {
  const pad = spacious
    ? 'px-3.5 pb-5 pt-4 shadow-md sm:px-5 sm:pb-6 sm:pt-5'
    : 'px-3 pb-3 pt-3 sm:px-4 sm:pb-3.5 sm:pt-3.5'
  const headGap = spacious ? 'mb-3.5 gap-3 sm:mb-4 sm:gap-3.5' : 'mb-2.5 gap-2.5'
  const iconBox = spacious
    ? 'h-10 w-10 sm:h-11 sm:w-11'
    : 'h-9 w-9'
  const iconGlyph = spacious ? 'h-[18px] w-[18px] sm:h-5 sm:w-5' : 'h-4 w-4'
  return (
    <section
      aria-labelledby={titleId}
      className={`flex min-h-0 flex-col rounded-xl border border-slate-200/85 bg-gradient-to-br to-white shadow-sm ring-1 ring-slate-900/[0.04] ${pad} ${sectionAccent[accent]} border-l-[3px] ${className ?? ''}`}
    >
      <div className={`flex shrink-0 items-center ${headGap}`}>
        <span
          className={`flex ${iconBox} shrink-0 items-center justify-center rounded-lg ring-1 ${iconShell[accent]}`}
        >
          <Icon className={iconGlyph} strokeWidth={2} aria-hidden />
        </span>
        <h3 id={titleId} className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">
          {title}
        </h3>
      </div>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </section>
  )
}

function TriRadioRow({
  legend,
  value,
  onChange,
  t,
}: {
  legend: string
  value: TriState
  onChange: (v: TriState) => void
  t: (key: string, fallback: string) => string
}) {
  const base = useId()
  const opts = [
    { sid: 'na', v: '' as const, lab: t('abholFormUnspecified', '—') },
    { sid: 'y', v: 'yes' as const, lab: t('abholFormJa', 'Yes') },
    { sid: 'n', v: 'no' as const, lab: t('abholFormNein', 'No') },
  ] as const
  return (
    <fieldset className="min-w-0">
      <legend className={`${overviewLabelClass} mb-1.5 block`}>{legend}</legend>
      <div
        className="inline-flex flex-wrap gap-0.5 rounded-full border border-slate-200/90 bg-slate-100/80 p-0.5 shadow-inner"
        role="radiogroup"
        aria-label={legend}
      >
        {opts.map(({ sid, v, lab }) => {
          const rid = `${base}-${sid}`
          const active = value === v
          return (
            <label
              key={sid}
              htmlFor={rid}
              className={`cursor-pointer select-none rounded-full px-3 py-1.5 text-[11px] font-semibold transition sm:px-3.5 ${
                active
                  ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <input
                type="radio"
                name={base}
                id={rid}
                checked={active}
                onChange={() => onChange(v)}
                className="sr-only"
              />
              {lab}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function isOfferVehicleImage(u: TimetableContactUnterlage): boolean {
  return u.mime_type.startsWith('image/')
}

export function TimetableAbholauftragModal(p: TimetableAbholauftragModalProps) {
  const { open, onClose, localeTag, t } = p
  const [form, setForm] = useState<FormState>(() => buildInitial(p))
  const pickupNoRef = useRef<HTMLInputElement>(null)
  const vehiclePhotoRegionId = useId()

  const offerVehicleImages = useMemo(
    () => (p.offer.vehicle_unterlagen ?? []).filter(isOfferVehicleImage),
    [p.offer.vehicle_unterlagen],
  )

  /** If the user removes the selected image from the offer folder while the modal stays open, drop the stale selection. */
  useEffect(() => {
    if (!open) return
    setForm((s) => {
      if (!s.vehiclePhotoDataUrl) return s
      const list = p.offer.vehicle_unterlagen ?? []
      const stillThere = list.some(
        (u) => isOfferVehicleImage(u) && u.data_url === s.vehiclePhotoDataUrl,
      )
      return stillThere ? s : { ...s, vehiclePhotoDataUrl: '' }
    })
  }, [open, p.offer.vehicle_unterlagen])

  useEffect(() => {
    if (!open) return
    setForm(buildInitial(p))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, p.offer.id])

  useLayoutEffect(() => {
    if (!open) return
    window.requestAnimationFrame(() => {
      pickupNoRef.current?.focus()
      pickupNoRef.current?.select()
    })
  }, [open, p.offer.id])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const patch = (x: Partial<FormState>) => setForm((s) => ({ ...s, ...x }))

  const { filled, total, pct } = useMemo(() => readinessScore(form), [form])

  const vehicleTitle = useMemo(() => {
    const bm = [form.brand, form.model].filter(Boolean).join(' ').trim()
    if (bm) return bm
    if (form.vehicleClass.trim()) return form.vehicleClass.trim()
    return t('abholFormVehicleUnknown', 'Vehicle to be confirmed')
  }, [form.brand, form.model, form.vehicleClass, t])

  const vehicleSubtitle = useMemo(() => {
    const bits = [form.vehicleClass, form.bodyType].map((x) => x.trim()).filter(Boolean)
    return bits.join(' · ')
  }, [form.bodyType, form.vehicleClass])

  const handlePrint = () => {
    window.print()
  }

  const openPickupList = () => {
    window.location.hash = '#/purchase/abholauftraege'
  }

  if (!open) return null

  const field = (id: string, labelKey: string, labelFb: string, value: string, set: (v: string) => void) => (
    <div className={overviewFieldClass}>
      <label className={overviewLabelClass} htmlFor={id}>
        {t(labelKey, labelFb)}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`${overviewInputClass} min-h-[38px] py-1.5 text-[12px] transition-shadow focus:border-emerald-400/90 focus:shadow-md focus:shadow-emerald-900/[0.06] focus:ring-emerald-500/25 sm:min-h-[2.5rem] sm:text-[13px]`}
        autoComplete="off"
      />
    </div>
  )

  const payChip = (checked: boolean, onToggle: (next: boolean) => void, label: string, id: string) => (
    <label
      htmlFor={id}
      className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition sm:min-h-9 sm:px-3.5 sm:text-xs ${
        checked
          ? 'border-emerald-400/90 bg-emerald-50 text-emerald-950 shadow-sm ring-1 ring-emerald-500/20'
          : 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      {label}
    </label>
  )

  return (
    <div
      className="abholauftrag-print-root fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-[2px] print:static print:inset-auto print:bg-white print:p-0 print:backdrop-blur-none sm:items-center sm:p-4 sm:pb-4 md:p-5"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="abhol-form-title"
        className="flex max-h-[min(92dvh,56rem)] w-full min-w-0 max-w-[min(112rem,99vw)] flex-col overflow-hidden rounded-t-[1.35rem] border border-slate-200/95 bg-white shadow-[0_25px_80px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.05] print:max-h-none print:max-w-none print:rounded-none print:shadow-none sm:max-h-[94vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-white/10 bg-gradient-to-r from-[#1b2431] via-[#1e293b] to-[#1b2431] px-3 py-3 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:px-5 sm:py-3.5 print:border-slate-300 print:bg-white print:text-slate-900 print:shadow-none">
          <h2 id="abhol-form-title" className="sr-only">
            {t('abholFormTitle', 'Pickup order')}
          </h2>
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_100%_0%,rgba(255,255,255,0.07),transparent_55%)] print:hidden"
            aria-hidden
          />
          <div className="relative grid grid-cols-1 gap-3 text-white lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-x-6 print:text-slate-900">
            <div
              className="flex min-w-0 items-start gap-2.5 py-0.5 sm:items-center lg:min-h-[3.25rem]"
              role="group"
              aria-label={t('abholFormVehicleCardTitle', 'Vehicle on this order')}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/20 print:bg-slate-200 print:text-slate-800 print:ring-slate-300"
                aria-hidden
              >
                <Truck className="h-4 w-4 opacity-95" />
              </span>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-white/55 sm:text-[10px] sm:tracking-[0.16em] print:text-slate-600">
                  {t('abholFormVehicleCardTitle', 'Vehicle on this order')}
                </p>
                <p className="truncate text-base font-semibold tracking-tight text-white sm:text-lg print:text-slate-950">
                  {vehicleTitle}
                </p>
                {vehicleSubtitle ? (
                  <p className="mt-0.5 truncate text-[11px] font-medium text-white/70 print:text-slate-700">
                    {vehicleSubtitle}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end sm:gap-2.5 lg:justify-self-end print:flex-row print:items-end">
              <div className="flex min-w-0 flex-col gap-1 sm:min-w-[9.5rem]">
                <label
                  className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 print:text-slate-600"
                  htmlFor="abhol-num"
                >
                  {t('abholFormPickupNumberLabel', 'Pickup no.')}
                </label>
                <input
                  ref={pickupNoRef}
                  id="abhol-num"
                  value={form.pickupNumber}
                  onChange={(e) => patch({ pickupNumber: e.target.value })}
                  className="min-h-[38px] w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 font-mono text-sm font-semibold tracking-wide text-white shadow-inner outline-none ring-0 placeholder:text-white/35 focus:border-emerald-400/70 focus:ring-2 focus:ring-emerald-400/25 print:border-slate-300 print:bg-white print:text-slate-900 print:placeholder:text-slate-400"
                  autoComplete="off"
                />
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:border-white/35 hover:bg-white/15 sm:min-h-10 sm:px-3.5 sm:py-2 sm:text-sm"
                >
                  <Printer className="h-4 w-4 shrink-0 text-white/90" aria-hidden />
                  {t('abholFormPrint', 'Print')}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/30 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:border-white/40 hover:bg-black/45 sm:min-h-10 sm:px-3.5 sm:py-2 sm:text-sm"
                  aria-label={t('commonClose', 'Close')}
                >
                  <X className="h-5 w-5 shrink-0" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </header>

        <div
          className={`min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-slate-50/40 to-white px-3 py-3 sm:px-5 sm:py-3 ${scrollbarHiddenY}`}
        >
          <div className="mb-3 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-sm ring-1 ring-slate-900/[0.03] sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
              <span className="font-semibold text-slate-800">
                {t('abholFormReadiness', '{filled} of {total} key fields complete')
                  .replace('{filled}', String(filled))
                  .replace('{total}', String(total))}
              </span>
              <span className="tabular-nums text-slate-500">{pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200/90">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div
            className="grid grid-cols-1 gap-3 print:grid-cols-1 lg:gap-3.5 xl:grid-cols-3 xl:items-stretch xl:gap-4"
            role="presentation"
          >
            {/* Column 1 — buyer + vehicle */}
            <div
              className="flex min-h-0 min-w-0 flex-col gap-3 xl:h-full"
              role="region"
              aria-labelledby="abhol-col-deal-heading"
            >
              <p id="abhol-col-deal-heading" className="sr-only">
                {t('abholFormColumnDeal', 'Order & vehicle')}
              </p>
              <div className="shrink-0">
                <SectionCard accent="emerald" icon={User} titleId="abhol-sec-buyer" title={t('abholFormSectionBuyer', 'Buyer & reference')}>
                  <div className="grid grid-cols-2 gap-2">
                    {field('abhol-buyer', 'abholFormBuyerLabel', 'Buyer', form.buyer, (v) => patch({ buyer: v }))}
                    {field('abhol-anr', 'abholFormAnummer', 'Cust. / A-Nr.', form.anummer, (v) => patch({ anummer: v }))}
                  </div>
                </SectionCard>
              </div>

              <SectionCard
                spacious
                className="min-h-0 flex-1 flex-col"
                accent="sky"
                icon={CarFront}
                titleId="abhol-sec-veh"
                title={t('abholFormSectionVehicle', 'Vehicle')}
              >
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(11.5rem,15rem)] lg:items-stretch lg:gap-x-5 xl:gap-x-6">
                  <div className="min-w-0 space-y-4 sm:space-y-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-3.5 [&>*]:min-w-0 [&_label]:break-words">
                      {field('abhol-vt', 'abholFormVehicleClass', 'Vehicle class', form.vehicleClass, (v) =>
                        patch({ vehicleClass: v }),
                      )}
                      {field('abhol-body', 'abholFormBodyType', 'Body type', form.bodyType, (v) => patch({ bodyType: v }))}
                      {field('abhol-brand', 'abholFormBrand', 'Make', form.brand, (v) => patch({ brand: v }))}
                      {field('abhol-model', 'abholFormModel', 'Model', form.model, (v) => patch({ model: v }))}
                      {field('abhol-euro', 'abholFormEuro', 'Euro class', form.euroNorm, (v) => patch({ euroNorm: v }))}
                      {field('abhol-ax', 'abholFormAxles', 'Axles', form.axles, (v) => patch({ axles: v }))}
                      <div className="min-w-0 sm:col-span-2">
                        {field('abhol-gw', 'abholFormGrossWeight', 'Gross weight', form.grossWeight, (v) =>
                          patch({ grossWeight: v }),
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-x-4">
                      {field('abhol-vin', 'abholFormVin', 'VIN', form.vin, (v) => patch({ vin: v }))}
                      {field('abhol-km', 'abholFormMileage', 'Mileage', form.mileage, (v) => patch({ mileage: v }))}
                    </div>
                  </div>

                  <aside
                    id={vehiclePhotoRegionId}
                    className="flex min-h-0 min-w-0 flex-col gap-3 border-t border-slate-200/80 pt-4 sm:gap-3.5 sm:pt-5 lg:h-full lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 xl:pl-6"
                    aria-label={t('abholFormVehiclePhotoLabel', 'Vehicle photo')}
                  >
                    <div className={`${overviewFieldClass} shrink-0`}>
                      <span id={`${vehiclePhotoRegionId}-title`} className={overviewLabelClass}>
                        {t('abholFormVehiclePhotoLabel', 'Vehicle photo')}
                      </span>
                    </div>
                    {offerVehicleImages.length > 0 ? (
                      <>
                        <p className="text-[10px] leading-snug text-slate-500">
                          {t(
                            'abholFormVehiclePhotoOfferHint',
                            'Images from this vehicle’s offer uploads (use “Upload documents” next to mileage).',
                          )}
                        </p>
                        <div
                          className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-0.5 pt-0.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/90"
                          role="listbox"
                          aria-labelledby={`${vehiclePhotoRegionId}-title`}
                          aria-label={t(
                            'abholFormVehiclePhotoOfferStripAria',
                            'Pick an image from this offer’s vehicle folder',
                          )}
                        >
                          {offerVehicleImages.map((u) => {
                            const selected = form.vehiclePhotoDataUrl === u.data_url
                            return (
                              <button
                                key={u.id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                title={u.name}
                                onClick={() => patch({ vehiclePhotoDataUrl: u.data_url })}
                                className={`relative shrink-0 snap-start overflow-hidden rounded-lg ring-2 transition focus:outline-none focus-visible:ring-offset-2 ${
                                  selected
                                    ? 'ring-emerald-500 ring-offset-1 ring-offset-white'
                                    : 'ring-slate-200/80 hover:ring-slate-400'
                                }`}
                              >
                                <img
                                  src={u.data_url}
                                  alt=""
                                  className="h-16 w-16 object-cover sm:h-[4.5rem] sm:w-[4.5rem]"
                                />
                                {selected ? (
                                  <span className="absolute inset-x-0 bottom-0 bg-emerald-600/90 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">
                                    {t('abholFormVehiclePhotoSelected', 'Active')}
                                  </span>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                        <div className="relative flex min-h-[13.5rem] flex-1 flex-col overflow-hidden rounded-xl border border-dashed border-slate-300/95 bg-gradient-to-b from-slate-50/95 to-white shadow-inner ring-1 ring-slate-900/[0.03] print:border-slate-400 sm:min-h-[15rem] lg:min-h-[18rem] lg:flex-1 lg:max-h-[min(30rem,58vh)]">
                          {form.vehiclePhotoDataUrl ? (
                            <div className="group relative flex min-h-[13.5rem] w-full flex-1 flex-col items-center justify-center overflow-hidden p-1.5 sm:min-h-[15rem] lg:min-h-0">
                              <img
                                src={form.vehiclePhotoDataUrl}
                                alt=""
                                className="max-h-full w-full object-contain object-center"
                              />
                              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/50 to-transparent px-2 py-2 text-center text-[10px] font-semibold leading-snug text-white">
                                {t(
                                  'abholFormVehiclePhotoTapPickAnother',
                                  'Pick a different thumbnail above to replace.',
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="flex min-h-[13.5rem] flex-1 flex-col items-center justify-center gap-2 px-3 py-8 text-center sm:min-h-[15rem] lg:min-h-0">
                              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100/90 text-sky-800 ring-1 ring-sky-200/70">
                                <ImagePlus className="h-5 w-5" strokeWidth={2} aria-hidden />
                              </span>
                              <span className="text-[11px] font-semibold text-slate-700">
                                {t(
                                  'abholFormVehiclePhotoPickThumb',
                                  'Tap a thumbnail above to use it on the printed form.',
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        {form.vehiclePhotoDataUrl ? (
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => patch({ vehiclePhotoDataUrl: '' })}
                              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-200/90 bg-rose-50/90 px-3 py-1.5 text-[11px] font-semibold text-rose-900 shadow-sm hover:border-rose-300 hover:bg-rose-50"
                            >
                              {t('abholFormVehiclePhotoRemove', 'Remove photo')}
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="relative flex min-h-[13.5rem] flex-1 flex-col overflow-hidden rounded-xl border border-dashed border-slate-300/95 bg-gradient-to-b from-slate-50/95 to-white shadow-inner ring-1 ring-slate-900/[0.03] print:border-slate-400 sm:min-h-[15rem] lg:min-h-[18rem] lg:flex-1 lg:max-h-[min(30rem,58vh)]">
                          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200/80">
                              <FolderOpen className="h-6 w-6" strokeWidth={2} aria-hidden />
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700">
                              {t('abholFormVehiclePhotoEmpty', 'No photo yet')}
                            </span>
                            <p className="max-w-[16rem] text-[10px] leading-snug text-slate-500">
                              {t(
                                'abholFormVehiclePhotoOfferEmpty',
                                'No images in the offer folder yet. Upload documents next to mileage in the Offer column for this vehicle tab, then reopen this form.',
                              )}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </aside>
                </div>
              </SectionCard>
            </div>

            {/* Column 2 — company, pickup & route notes (notes flex to match column height) */}
            <div className="flex min-h-0 min-w-0 flex-col gap-3 xl:h-full">
              <SectionCard
                className="h-full min-h-0 flex-1 flex-col"
                accent="amber"
                icon={Building2}
                titleId="abhol-sec-party"
                title={t('abholFormSectionParty', 'Company & pickup address')}
              >
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-2 sm:gap-y-2">
                    {field('abhol-co', 'abholFormCompanyName', 'Company name', form.company, (v) => patch({ company: v }))}
                    {field(
                      'abhol-ap',
                      'abholFormContactPerson',
                      'Contact person',
                      form.apName,
                      (v) => patch({ apName: v }),
                    )}
                    {field(
                      'abhol-tel',
                      'abholFormPhoneDial',
                      'Phone (incl. ext.)',
                      form.phoneDial,
                      (v) => patch({ phoneDial: v }),
                    )}
                    {field('abhol-mob', 'abholFormMobile', 'Mobile', form.mobile, (v) => patch({ mobile: v }))}
                    <div className={`${overviewFieldClass} sm:col-span-2`}>
                      <label className={overviewLabelClass} htmlFor="abhol-addr">
                        {t('abholFormPickupAddress', 'Pickup address')}
                      </label>
                      <textarea
                        id="abhol-addr"
                        value={form.pickupAddress}
                        onChange={(e) => patch({ pickupAddress: e.target.value })}
                        rows={3}
                        className={`${abholTextareaCompact} border-slate-200/90 focus:border-emerald-400/90 focus:ring-emerald-500/20`}
                      />
                    </div>
                  </div>
                  <div className={`${overviewFieldClass} flex min-h-0 flex-1 flex-col`}>
                    <label className={`${overviewLabelClass} shrink-0`} htmlFor="abhol-notes">
                      {t('abholFormNotes', 'Notes')}
                    </label>
                    <textarea
                      id="abhol-notes"
                      value={form.notes}
                      onChange={(e) => patch({ notes: e.target.value })}
                      rows={3}
                      className={`${abholTextareaNotes} min-h-0 flex-1 resize-y border-slate-200/90 focus:border-emerald-400/90 focus:ring-emerald-500/20 xl:min-h-[7rem]`}
                      placeholder={t('abholFormNotesPlaceholder', 'Internal pickup notes…')}
                    />
                  </div>
                  <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-2 sm:gap-y-2">
                    {field('abhol-mail', 'abholFormEmail', 'Email', form.email, (v) => patch({ email: v }))}
                    {field('abhol-price', 'abholFormPrice', 'Price (EUR)', form.priceEur, (v) => patch({ priceEur: v }))}
                    <div className="sm:col-span-2">
                      {field(
                        'abhol-bs',
                        'abholFormBriefSchein',
                        'Letter / registration',
                        form.briefSchein,
                        (v) => patch({ briefSchein: v }),
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Column 3 — logistics + other / documents */}
            <div
              className="flex min-h-0 min-w-0 flex-col gap-3 xl:h-full"
              role="region"
              aria-labelledby="abhol-col-ops-heading"
            >
              <p id="abhol-col-ops-heading" className="sr-only">
                {t('abholFormColumnOps', 'Pickup, payment & documents')}
              </p>
              <div className="shrink-0">
                <SectionCard
                  accent="violet"
                  icon={ClipboardList}
                  titleId="abhol-sec-log"
                  title={t('abholFormSectionLogistics', 'Logistics & payment')}
                >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-2 sm:gap-y-2">
                  <div className="space-y-2">
                    {field(
                      'abhol-from',
                      'abholFormPickupFrom',
                      'Pickup from (date)',
                      form.pickupFrom,
                      (v) => patch({ pickupFrom: v }),
                    )}
                    {field(
                      'abhol-dist',
                      'abholFormDistanceKm',
                      'Distance (km)',
                      form.distanceKm,
                      (v) => patch({ distanceKm: v }),
                    )}
                    {field('abhol-bhf', 'abholFormStation', 'Station', form.station, (v) => patch({ station: v }))}
                    <TriRadioRow
                      legend={t('abholFormDriverPickup', 'Driver pickup')}
                      value={form.driverPickup}
                      onChange={(v) => patch({ driverPickup: v })}
                      t={t}
                    />
                  </div>
                  <div className="space-y-2">
                    <fieldset>
                      <legend className={`${overviewLabelClass} mb-1.5 block`}>
                        {t('abholFormPayment', 'Payment method')}
                      </legend>
                      <div className="flex flex-wrap gap-1.5">
                        {payChip(form.payCash, (next) => patch({ payCash: next }), t('abholFormCash', 'Cash'), 'abhol-pay-cash')}
                        {payChip(
                          form.payBank,
                          (next) => patch({ payBank: next }),
                          t('abholFormBank', 'Bank'),
                          'abhol-pay-bank',
                        )}
                      </div>
                    </fieldset>
                    <TriRadioRow
                      legend={t('abholFormInvoiceReceived', 'Invoice received')}
                      value={form.invoiceReceived}
                      onChange={(v) => patch({ invoiceReceived: v })}
                      t={t}
                    />
                  </div>
                </div>
                </SectionCard>
              </div>

              <SectionCard
                className="min-h-0 flex-1 flex-col"
                accent="emerald"
                icon={FileStack}
                titleId="abhol-sec-other"
                title={t('abholFormSectionOther', 'Other agreements & documents')}
              >
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <div className={`${overviewFieldClass} flex min-h-0 flex-1 flex-col`}>
                    <label className={`${overviewLabelClass} shrink-0`} htmlFor="abhol-other">
                      {t('abholFormOtherAgreements', 'Other agreements')}
                    </label>
                    <textarea
                      id="abhol-other"
                      value={form.otherAgreements}
                      onChange={(e) => patch({ otherAgreements: e.target.value })}
                      rows={2}
                      className={`${abholTextareaCompact} min-h-0 flex-1 resize-y xl:min-h-[5rem]`}
                    />
                  </div>
                  <div className="shrink-0">
                    {field(
                      'abhol-auth',
                      'abholFormAuthorizedCollector',
                      'Authorized collector',
                      form.authorizedCollector,
                      (v) => patch({ authorizedCollector: v }),
                    )}
                  </div>
                  <fieldset className="mt-0 shrink-0 rounded-lg border border-slate-200/90 bg-slate-50/60 p-2.5 ring-1 ring-slate-900/[0.02]">
                  <legend className={`${overviewLabelClass} px-0.5`}>
                    {t('abholFormDocRecipient', 'Who receives documents')}
                  </legend>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {field('abhol-db', 'abholFormDocBrief', 'Letter', form.docBrief, (v) => patch({ docBrief: v }))}
                    {field('abhol-ds', 'abholFormDocSchein', 'Registration', form.docSchein, (v) =>
                      patch({ docSchein: v }),
                    )}
                    {field('abhol-dr', 'abholFormDocInvoice', 'Invoice', form.docInvoice, (v) =>
                      patch({ docInvoice: v }),
                    )}
                  </div>
                </fieldset>
                </div>
              </SectionCard>
            </div>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col gap-2 border-t border-slate-200/90 bg-gradient-to-r from-slate-50/90 to-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5 sm:px-5 sm:py-3 print:hidden">
          <button
            type="button"
            onClick={openPickupList}
            className="order-2 min-h-9 rounded-lg border border-slate-300/90 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 sm:order-1 sm:min-h-10 sm:px-4 sm:text-sm"
          >
            {t('abholFormOpenList', 'Open pickup list')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="order-1 min-h-9 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/20 transition hover:from-emerald-700 hover:to-teal-700 sm:order-2 sm:min-h-10 sm:px-5 sm:text-sm"
          >
            {t('abholFormDone', 'Done')}
          </button>
        </footer>
      </div>
    </div>
  )
}
