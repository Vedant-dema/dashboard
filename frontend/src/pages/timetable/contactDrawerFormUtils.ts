import { isOfferSoldDisposal } from '../../lib/angebotLedger'
import type {
  TimetableActivityNoteEntry,
  TimetableAppointmentHistoryRow,
  TimetableAssignmentRow,
  TimetableContactPerson,
  TimetableContactProfile,
  TimetableEntry,
  TimetableNegotiationPriceRound,
  TimetableOfferInput,
  TimetableOutcome,
  TimetableTruckOffer,
  TimetableVehicleDisplayExtra,
} from '../../types/timetable'
import { emptyKontakt } from '../../features/customers/mappers/customerFormMapper'

export const OUTCOME_ORDER: TimetableOutcome[] = ['pending', 'follow_up', 'has_trucks', 'no_trucks']

export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const trimmed = iso.trim()
  if (!trimmed) return ''
  const d = new Date(trimmed)
  if (Number.isNaN(d.getTime())) return trimmed.length >= 16 ? trimmed.slice(0, 16) : ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(local: string): string | null {
  const v = local.trim()
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function formatEur(value: number | null | undefined, localeTag: string): string {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(localeTag, { style: 'currency', currency: 'EUR' }).format(value)
}

export function newTruckOfferId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `o-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyTruckOffer(): TimetableTruckOffer {
  return {
    id: newTruckOfferId(),
    captured_at: '',
    vehicle_type: '',
    brand: '',
    model: '',
    year: null,
    mileage_km: null,
    quantity: null,
    expected_price_eur: null,
    purchase_bid_eur: null,
    gekauft: false,
    verkauft: false,
    location: '',
    notes: '',
  }
}

/** True if any persisted offer slot has user-entered content. */
export function entryAnyOfferHasContent(entry: TimetableEntry): boolean {
  return (entry.offers ?? []).some((o) => offerHasContent(o))
}

/** Ensure every offer has an id and `selected_offer_id` points at a non–sold-disposal slot when possible. */
export function ensureOfferIdsAndSelection(entry: TimetableEntry): TimetableEntry {
  const offers = (entry.offers ?? []).map((o) => (o.id ? o : { ...o, id: newTruckOfferId() }))
  const active = offers.filter((o) => !isOfferSoldDisposal(o))
  let selected_offer_id = entry.selected_offer_id
  if (offers.length === 0) {
    selected_offer_id = null
  } else if (active.length === 0) {
    selected_offer_id = null
  } else if (!selected_offer_id || !active.some((x) => x.id === selected_offer_id)) {
    selected_offer_id = active[0]!.id
  }
  return { ...entry, offers, selected_offer_id }
}

/** Merge modal “truck offer” payload into the selected (or first) offer slot. */
function latestNegotiationRound(offer: TimetableTruckOffer): TimetableNegotiationPriceRound | null {
  const rounds = offer.negotiation_rounds ?? []
  if (rounds.length === 0) return null
  return [...rounds].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[rounds.length - 1] ?? null
}

/**
 * Add one snapshot round when current offer prices changed since the latest round.
 * This keeps repeated calls on the same truck professionally traceable.
 */
export function withAutoNegotiationRound(
  offer: TimetableTruckOffer,
  nowIso: string,
  authorName?: string,
): TimetableTruckOffer {
  const seller = offer.expected_price_eur ?? null
  const purchase = offer.purchase_bid_eur ?? null
  if (seller == null && purchase == null) return offer

  const latest = latestNegotiationRound(offer)
  if (
    latest &&
    (latest.seller_asking_eur ?? null) === seller &&
    (latest.purchase_bid_eur ?? null) === purchase
  ) {
    return offer
  }

  const author = (authorName ?? '').trim()
  const at = nowIso && !Number.isNaN(Date.parse(nowIso)) ? nowIso : new Date().toISOString()
  const row: TimetableNegotiationPriceRound = {
    id: newTruckOfferId(),
    at,
    seller_asking_eur: seller,
    purchase_bid_eur: purchase,
    ...(author ? { author_name: author } : {}),
  }
  return {
    ...offer,
    negotiation_rounds: [...(offer.negotiation_rounds ?? []), row].sort(
      (a, b) => Date.parse(a.at) - Date.parse(b.at)
    ),
  }
}

export function withAutoNegotiationRoundsForEntry(
  entry: TimetableEntry,
  nowIso: string,
  authorName?: string,
): TimetableEntry {
  if ((entry.offers ?? []).length === 0) return entry
  return {
    ...entry,
    offers: entry.offers.map((o) => withAutoNegotiationRound(o, nowIso, authorName)),
  }
}

export function mergeTimetableOfferInputIntoEntry(
  entry: TimetableEntry,
  payload: TimetableOfferInput,
  nowIso: string,
  authorName?: string,
): TimetableEntry {
  const base = ensureOfferIdsAndSelection(entry)
  const offers = [...base.offers]
  const targetId = base.selected_offer_id ?? offers[0]?.id
  if (offers.length === 0) {
    const nu = createEmptyTruckOffer()
    const nextOffer = withAutoNegotiationRound(
      {
        ...nu,
        captured_at: nowIso,
        vehicle_type: payload.vehicle_type,
        brand: payload.brand,
        model: payload.model,
        year: payload.year,
        mileage_km: payload.mileage_km,
        quantity: payload.quantity,
        expected_price_eur: payload.expected_price_eur,
        purchase_bid_eur: payload.purchase_bid_eur,
        gekauft: payload.gekauft ?? false,
        verkauft: payload.verkauft ?? false,
        location: payload.location,
        notes: payload.notes,
      },
      nowIso,
      authorName
    )
    return {
      ...entry,
      offers: [nextOffer],
      selected_offer_id: nu.id,
    }
  }
  const idx = targetId ? offers.findIndex((o) => o.id === targetId) : -1
  const i = idx >= 0 ? idx : 0
  const cur = offers[i]!
  const nextOffer = withAutoNegotiationRound(
    {
      ...cur,
      captured_at: nowIso,
      vehicle_type: payload.vehicle_type,
      brand: payload.brand,
      model: payload.model,
      year: payload.year,
      mileage_km: payload.mileage_km,
      quantity: payload.quantity,
      expected_price_eur: payload.expected_price_eur,
      purchase_bid_eur: payload.purchase_bid_eur,
      ...(payload.gekauft !== undefined ? { gekauft: payload.gekauft } : {}),
      ...(payload.verkauft !== undefined ? { verkauft: payload.verkauft } : {}),
      location: payload.location,
      notes: payload.notes,
    },
    nowIso,
    authorName
  )
  offers[i] = nextOffer
  return { ...entry, offers, selected_offer_id: nextOffer.id }
}

export type FinalizeOffersResult = {
  entry: TimetableEntry
  prunedOfferIds: string[]
}

/** Drop empty offer shells; stamp `captured_at` when missing; returns ids removed for cleaning `vehicle_extras`. */
export function finalizeOffersForPersist(entry: TimetableEntry, nowIso: string): FinalizeOffersResult {
  const prevIds = (entry.offers ?? []).map((o) => o.id)
  const kept = (entry.offers ?? [])
    .filter((o) => offerHasContent(o))
    .map((o) => ({
      ...o,
      captured_at: o.captured_at?.trim() ? o.captured_at : nowIso,
    }))
  const keptIds = new Set(kept.map((o) => o.id))
  const prunedOfferIds = prevIds.filter((id) => !keptIds.has(id))
  return {
    entry: {
      ...entry,
      offers: kept,
      selected_offer_id: kept[0]?.id ?? null,
    },
    prunedOfferIds,
  }
}

export function emptyAppointmentRow(): TimetableAppointmentHistoryRow {
  return { date: '', time: '', purpose: '', remark: '', done: false, initials: '' }
}

export function emptyContactPerson(): TimetableContactPerson {
  return emptyKontakt()
}

export function emptyAssignment(): TimetableAssignmentRow {
  return { name: '', since: '' }
}

/** Shallow clone — never mutate `entry.contact_profile` in place. */
export function ensureProfile(entry: TimetableEntry): TimetableContactProfile {
  return { ...(entry.contact_profile ?? {}) }
}

export function offerHasContent(o: TimetableTruckOffer | null | undefined): boolean {
  if (!o) return false
  if (o.vehicle_type.trim()) return true
  if (o.brand.trim()) return true
  if (o.model.trim()) return true
  if (o.location.trim()) return true
  if (o.notes.trim()) return true
  if (o.year != null) return true
  if (o.mileage_km != null) return true
  if (o.quantity != null) return true
  if (o.expected_price_eur != null) return true
  if (o.purchase_bid_eur != null) return true
  if ((o.negotiation_rounds ?? []).length > 0) return true
  if ((o.vehicle_unterlagen ?? []).length > 0) return true
  return false
}

/** Move legacy row-level `timetable_unterlagen` onto the selected (or first) offer slot. */
export function migrateLegacyTimetableUnterlagenOntoOffers(entry: TimetableEntry): TimetableEntry {
  const pr = entry.contact_profile
  const legacy = pr?.timetable_unterlagen
  if (!legacy?.length || !pr) return entry
  const offers = entry.offers ?? []
  if (offers.length === 0) return entry
  const sel = entry.selected_offer_id
  let targetIdx = sel ? offers.findIndex((o) => o.id === sel) : 0
  if (targetIdx < 0) targetIdx = 0
  const target = offers[targetIdx]!
  const merged = [...(target.vehicle_unterlagen ?? []), ...legacy]
  const { timetable_unterlagen: _removed, ...restProfile } = pr
  const contact_profile: TimetableContactProfile | undefined =
    Object.keys(restProfile).length > 0 ? (restProfile as TimetableContactProfile) : undefined
  return {
    ...entry,
    offers: offers.map((o, i) => (i === targetIdx ? { ...o, vehicle_unterlagen: merged } : o)),
    contact_profile,
  }
}

export function vehicleExtraHasContent(v: TimetableVehicleDisplayExtra | undefined): boolean {
  if (!v) return false
  if (v.body_type?.trim()) return true
  if (v.registration_mm_yyyy?.trim()) return true
  if (v.processor_name?.trim()) return true
  if (v.processor_entered?.trim()) return true
  if (v.processor_fetched?.trim()) return true
  if (v.processor_negotiated?.trim()) return true
  if (v.mileage_replacement_km != null) return true
  if (v.customer_price_eur != null) return true
  if (v.sold) return true
  if (v.deregistered) return true
  return false
}

/** Synthetic id for legacy `activity_notes` shown as one bubble before migration. */
export const LEGACY_ACTIVITY_NOTE_VIRTUAL_ID = '__legacy_activity_display__'

/** Synthetic id for row `TimetableEntry.notes` shown before migration into the log. */
export const ROW_NOTES_VIRTUAL_ID = '__row_notes_display__'

function bumpIsoMs(iso: string, addMs: number): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return new Date().toISOString()
  return new Date(ms + addMs).toISOString()
}

/** Second virtual legacy line (e.g. `activity_notes` after row `notes`) sorts after the first. */
export function activityNotesStaggerAfter(iso: string): string {
  return bumpIsoMs(iso, 1000)
}

export type ActivityNoteDisplayRow = TimetableActivityNoteEntry & { isVirtual?: boolean }

export function newActivityNoteId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `n-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Prefer row appointment time as the legacy note timestamp. */
export function activityNotesLegacyTimestampIso(scheduledAt: string): string {
  const ms = Date.parse(scheduledAt)
  if (!Number.isNaN(ms)) return new Date(ms).toISOString()
  return new Date().toISOString()
}

/** Sorted bubbles: real log, or virtual rows from `notes` / legacy `activity_notes`. */
export function buildActivityNotesDisplayList(
  p: TimetableContactProfile,
  scheduledAt: string,
  rowNotes?: string,
): ActivityNoteDisplayRow[] {
  const rawLog = p.activity_notes_log
  if (rawLog && rawLog.length > 0) {
    return [...rawLog]
      .filter((e) => (e.text ?? '').trim())
      .map((e) => ({ ...e, isVirtual: false as const }))
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  }
  const legacy = (p.activity_notes ?? '').trim()
  const rowN = (rowNotes ?? '').trim()
  const t0 = activityNotesLegacyTimestampIso(scheduledAt)
  const rows: ActivityNoteDisplayRow[] = []
  if (rowN) {
    rows.push({
      id: ROW_NOTES_VIRTUAL_ID,
      at: t0,
      text: rowNotes ?? '',
      isVirtual: true,
    })
  }
  if (legacy) {
    rows.push({
      id: LEGACY_ACTIVITY_NOTE_VIRTUAL_ID,
      at: rowN ? activityNotesStaggerAfter(t0) : t0,
      text: legacy,
      isVirtual: true,
    })
  }
  return rows.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
}

/** Plain text for exports / search — joined note bodies. */
export function getActivityNotesPlainText(
  p: TimetableContactProfile,
  rowNotes?: string,
  scheduledAt?: string,
): string {
  const log = p.activity_notes_log?.filter((e) => (e.text ?? '').trim()) ?? []
  if (log.length > 0) {
    return [...log]
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
      .map((e) => e.text.trim())
      .join('\n\n')
  }
  const slot = scheduledAt && !Number.isNaN(Date.parse(scheduledAt)) ? scheduledAt : '2000-01-01T09:00:00'
  return buildActivityNotesDisplayList(p, slot, rowNotes)
    .map((r) => r.text.trim())
    .join('\n\n')
}

/** Latest note body for short summaries (smart bullets, snippets, table preview). */
export function getActivityNotesLastSnippet(
  p: TimetableContactProfile,
  rowNotes?: string,
  scheduledAt?: string,
): string {
  const log = p.activity_notes_log?.filter((e) => (e.text ?? '').trim()) ?? []
  if (log.length > 0) {
    const sorted = [...log].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    const last = sorted[sorted.length - 1]
    return last ? last.text.trim() : ''
  }
  const slot = scheduledAt && !Number.isNaN(Date.parse(scheduledAt)) ? scheduledAt : '2000-01-01T09:00:00'
  const virtual = buildActivityNotesDisplayList(p, slot, rowNotes)
  const tail = virtual[virtual.length - 1]
  return tail ? tail.text.trim() : ''
}

/** Append a dated line from the call modal into the activity log (migrates row `notes` / legacy block once). */
export function appendTimetableCallNoteToEntry(
  entry: TimetableEntry,
  appendRaw: string,
  authorName?: string,
): TimetableEntry {
  const append = appendRaw.trim()
  if (!append) return entry
  const pr = { ...(entry.contact_profile ?? {}) }
  const existingLog = pr.activity_notes_log?.filter((e) => (e.text ?? '').trim()) ?? []
  const rowN = (entry.notes ?? '').trim()
  const legacyAct = (pr.activity_notes ?? '').trim()
  const t0 = activityNotesLegacyTimestampIso(entry.scheduled_at)
  const t1 = activityNotesStaggerAfter(t0)
  const author = authorName?.trim()
  const newEntry: TimetableActivityNoteEntry = {
    id: newActivityNoteId(),
    at: new Date().toISOString(),
    text: append,
    ...(author ? { author_name: author } : {}),
  }
  if (existingLog.length > 0) {
    const prepend: TimetableActivityNoteEntry[] = []
    if (rowN) prepend.push({ id: newActivityNoteId(), at: t0, text: rowN })
    if (legacyAct) prepend.push({ id: newActivityNoteId(), at: rowN ? t1 : t0, text: legacyAct })
    const merged = [...prepend, ...existingLog, newEntry].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    return {
      ...entry,
      notes: '',
      contact_profile: {
        ...pr,
        activity_notes: undefined,
        activity_notes_log: merged,
      },
    }
  }
  const seeds: TimetableActivityNoteEntry[] = []
  if (rowN) seeds.push({ id: newActivityNoteId(), at: t0, text: rowN })
  if (legacyAct) seeds.push({ id: newActivityNoteId(), at: rowN ? t1 : t0, text: legacyAct })
  return {
    ...entry,
    notes: '',
    contact_profile: {
      ...pr,
      activity_notes: undefined,
      activity_notes_log: [...seeds, newEntry],
    },
  }
}
