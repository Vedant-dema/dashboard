import { useEffect, useMemo, useState } from 'react'
import { Truck, X, ArrowDownLeft, ArrowUpRight, CircleDashed } from 'lucide-react'
import type { TimetableEntry, TimetableOfferInput, TimetableTruckOffer } from '../../types/timetable'
import { angebotLedgerKind } from '../../lib/angebotLedger'
import { ensureOfferIdsAndSelection } from './contactDrawerFormUtils'
import { TimetableOfferMemoryPanel } from './components/TimetableOfferMemoryPanel'
import {
  collectTimetableOfferMemory,
  offerHasVehicleIdentity,
  type TimetableOfferMemoryItem,
} from './timetableOfferMemory'

type Props = {
  entry: TimetableEntry | null
  allEntries: TimetableEntry[]
  localeTag: string
  t: (key: string, fallback: string) => string
  onClose: () => void
  onSave: (payload: TimetableOfferInput) => void
}

type StockLedgerForm = 'purchase' | 'disposal' | 'neutral'

type OfferFormState = {
  vehicle_type: string
  brand: string
  model: string
  year: string
  mileage_km: string
  quantity: string
  expected_price_eur: string
  purchase_bid_eur: string
  stock_ledger: StockLedgerForm
  location: string
  notes: string
}

function ledgerFormFromOffer(o: TimetableTruckOffer | null | undefined): StockLedgerForm {
  const k = angebotLedgerKind({ gekauft: o?.gekauft, verkauft: o?.verkauft })
  if (k === 'purchase') return 'purchase'
  if (k === 'disposal') return 'disposal'
  return 'neutral'
}

function ledgerPayload(mode: StockLedgerForm): Pick<TimetableOfferInput, 'gekauft' | 'verkauft'> {
  if (mode === 'purchase') return { gekauft: true, verkauft: false }
  if (mode === 'disposal') return { gekauft: false, verkauft: true }
  return { gekauft: false, verkauft: false }
}

function initialState(): OfferFormState {
  return {
    vehicle_type: '',
    brand: '',
    model: '',
    year: '',
    mileage_km: '',
    quantity: '',
    expected_price_eur: '',
    purchase_bid_eur: '',
    stock_ledger: 'neutral',
    location: '',
    notes: '',
  }
}

function toNumberOrNull(value: string): number | null {
  const cleaned = value.trim()
  if (!cleaned) return null
  const parsed = Number(cleaned.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function toFieldValue(value: number | null): string {
  return value == null ? '' : String(value)
}

export function TimetableOfferModal({ entry, allEntries, localeTag, t, onClose, onSave }: Props) {
  const [form, setForm] = useState<OfferFormState>(() => initialState())

  useEffect(() => {
    if (!entry) return
    const e0 = ensureOfferIdsAndSelection(entry)
    const sid = e0.selected_offer_id ?? e0.offers[0]?.id
    const o = (sid ? e0.offers.find((x) => x.id === sid) : e0.offers[0]) ?? null
    setForm({
      vehicle_type: o?.vehicle_type ?? '',
      brand: o?.brand ?? '',
      model: o?.model ?? '',
      year: o?.year != null ? String(o.year) : '',
      mileage_km: o?.mileage_km != null ? String(o.mileage_km) : '',
      quantity: o?.quantity != null ? String(o.quantity) : '',
      expected_price_eur: o?.expected_price_eur != null ? String(o.expected_price_eur) : '',
      purchase_bid_eur: o?.purchase_bid_eur != null ? String(o.purchase_bid_eur) : '',
      stock_ledger: ledgerFormFromOffer(o),
      location: o?.location ?? '',
      notes: o?.notes ?? '',
    })
  }, [entry])

  const activeOfferId = useMemo(() => {
    if (!entry) return null
    const e0 = ensureOfferIdsAndSelection(entry)
    return e0.selected_offer_id ?? e0.offers[0]?.id ?? null
  }, [entry])

  const draftOfferForMemory = useMemo<TimetableTruckOffer>(
    () => ({
      id: activeOfferId ?? '__draft__',
      captured_at: entry?.scheduled_at ?? new Date().toISOString(),
      vehicle_type: form.vehicle_type.trim(),
      brand: form.brand.trim(),
      model: form.model.trim(),
      year: toNumberOrNull(form.year),
      mileage_km: toNumberOrNull(form.mileage_km),
      quantity: toNumberOrNull(form.quantity),
      expected_price_eur: toNumberOrNull(form.expected_price_eur),
      purchase_bid_eur: toNumberOrNull(form.purchase_bid_eur),
      ...ledgerPayload(form.stock_ledger),
      location: form.location.trim(),
      notes: form.notes.trim(),
    }),
    [activeOfferId, entry?.scheduled_at, form]
  )

  const offerMemoryItems = useMemo(
    () =>
      entry
        ? collectTimetableOfferMemory({
            entries: allEntries,
            targetEntry: entry,
            targetOffer: draftOfferForMemory,
            currentOfferId: activeOfferId,
            limit: 6,
          })
        : [],
    [activeOfferId, allEntries, draftOfferForMemory, entry]
  )
  const hasVehicleIdentity = offerHasVehicleIdentity(draftOfferForMemory)

  const applyOfferMemoryPrices = (item: TimetableOfferMemoryItem) => {
    setForm((prev) => ({
      ...prev,
      expected_price_eur: toFieldValue(item.latestSellerAskingEur),
      purchase_bid_eur: toFieldValue(item.latestPurchaseBidEur),
    }))
  }

  if (!entry) return null

  return (
    <div
      className="fixed inset-0 z-[115] flex items-end justify-center bg-slate-950/65 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="timetable-offer-title"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl shadow-amber-900/30">
        <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <h3 id="timetable-offer-title" className="text-base font-semibold text-slate-900">
                {t('timetableOfferTitle', 'Truck offer details')}
              </h3>
              <p className="text-sm text-slate-600">{entry.company_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-100 hover:text-slate-900"
            aria-label={t('commonClose', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferVehicleType', 'Vehicle type')}
            <input
              value={form.vehicle_type}
              onChange={(e) => setForm((prev) => ({ ...prev, vehicle_type: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferBrand', 'Brand')}
            <input
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferModel', 'Model')}
            <input
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferLocation', 'Location')}
            <input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferYear', 'Year')}
            <input
              value={form.year}
              onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferMileage', 'Mileage (km)')}
            <input
              value={form.mileage_km}
              onChange={(e) => setForm((prev) => ({ ...prev, mileage_km: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferQuantity', 'Quantity')}
            <input
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferSellerAskingShort', 'Seller asking (EUR)')}
            <input
              value={form.expected_price_eur}
              onChange={(e) => setForm((prev) => ({ ...prev, expected_price_eur: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            {t('timetableOfferPurchaseBidShort', 'Purchasing bid (EUR)')}
            <input
              value={form.purchase_bid_eur}
              onChange={(e) => setForm((prev) => ({ ...prev, purchase_bid_eur: e.target.value }))}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
          <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              {t('angebotStockLedgerLabel', 'Stock transaction type')}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { id: 'purchase' as const, label: t('angebotStockLedgerPurchase', 'Purchased'), Icon: ArrowDownLeft },
                  {
                    id: 'disposal' as const,
                    label: t('angebotStockLedgerDisposal', 'Sold (third party)'),
                    Icon: ArrowUpRight,
                  },
                  { id: 'neutral' as const, label: t('angebotStockLedgerNeutral', 'Offer'), Icon: CircleDashed },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = form.stock_ledger === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, stock_ledger: id }))}
                    className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition sm:min-h-0 ${
                      active
                        ? id === 'purchase'
                          ? 'border-emerald-600 bg-emerald-600 text-white ring-1 ring-emerald-500/30'
                          : id === 'disposal'
                            ? 'border-red-600 bg-red-600 text-white ring-1 ring-red-500/30'
                            : 'border-blue-600 bg-blue-600 text-white ring-1 ring-blue-500/30'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <label className="sm:col-span-2 text-sm font-medium text-slate-700">
            {t('timetableOfferNotes', 'Offer notes')}
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </label>
        </div>

        <div className="border-t border-amber-100/90 px-5 py-4">
          <TimetableOfferMemoryPanel
            items={offerMemoryItems}
            offerHasVehicleIdentity={hasVehicleIdentity}
            localeTag={localeTag}
            t={t}
            onApplyPrices={applyOfferMemoryPrices}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-amber-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('commonCancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                vehicle_type: form.vehicle_type.trim(),
                brand: form.brand.trim(),
                model: form.model.trim(),
                year: toNumberOrNull(form.year),
                mileage_km: toNumberOrNull(form.mileage_km),
                quantity: toNumberOrNull(form.quantity),
                expected_price_eur: toNumberOrNull(form.expected_price_eur),
                purchase_bid_eur: toNumberOrNull(form.purchase_bid_eur),
                ...ledgerPayload(form.stock_ledger),
                location: form.location.trim(),
                notes: form.notes.trim(),
              })
            }
            className="h-11 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-white transition hover:bg-amber-600"
          >
            {t('commonSave', 'Save')}
          </button>
        </div>
      </div>
    </div>
  )
}
