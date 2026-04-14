import type {
  TimetableEntry,
  TimetableNegotiationPriceRound,
  TimetableTruckOffer,
} from '../../types/timetable'

export type TimetableOfferMemoryMatchKind = 'same_vehicle' | 'same_supplier'

export type TimetableOfferMemoryItem = {
  entryId: number
  offerId: string
  matchKind: TimetableOfferMemoryMatchKind
  matchScore: number
  happenedAt: string
  companyName: string
  contactName: string
  phone: string
  vehicleLabel: string
  latestSellerAskingEur: number | null
  latestPurchaseBidEur: number | null
  latestNote: string
  roundCount: number
  roundsPreview: TimetableNegotiationPriceRound[]
}

type OfferMemoryQuery = {
  entries: TimetableEntry[]
  targetEntry: TimetableEntry
  targetOffer: TimetableTruckOffer
  currentOfferId?: string | null
  limit?: number
}

type SupplierFingerprint = {
  company: string
  contact: string
  phone: string
}

function parseMs(raw: string): number {
  const ms = Date.parse(raw)
  return Number.isNaN(ms) ? 0 : ms
}

function normalizeText(raw: string | null | undefined): string {
  return (raw ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function normalizePhone(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\D/g, '')
}

function vehicleTokens(offer: TimetableTruckOffer): Set<string> {
  const bag = [offer.brand, offer.model, offer.vehicle_type].map((v) => normalizeText(v))
  const split = bag.flatMap((v) => v.split(' ').filter(Boolean))
  if (offer.year != null) split.push(String(offer.year))
  return new Set(split)
}

function overlapCount(a: Set<string>, b: Set<string>): number {
  let c = 0
  for (const token of a) {
    if (b.has(token)) c += 1
  }
  return c
}

function supplierFingerprint(entry: TimetableEntry): SupplierFingerprint {
  return {
    company: normalizeText(entry.company_name),
    contact: normalizeText(entry.contact_name),
    phone: normalizePhone(entry.phone),
  }
}

function supplierMatches(a: SupplierFingerprint, b: SupplierFingerprint): boolean {
  if (a.phone && b.phone && a.phone === b.phone) return true
  if (a.company && b.company) {
    if (a.company === b.company) return true
    if (a.company.includes(b.company) || b.company.includes(a.company)) return true
  }
  if (a.contact && b.contact && a.contact === b.contact && (a.company || b.company || a.phone || b.phone)) {
    return true
  }
  return false
}

function sortedRounds(offer: TimetableTruckOffer): TimetableNegotiationPriceRound[] {
  return [...(offer.negotiation_rounds ?? [])].sort((a, b) => parseMs(a.at) - parseMs(b.at))
}

function latestRound(offer: TimetableTruckOffer): TimetableNegotiationPriceRound | null {
  const rounds = sortedRounds(offer)
  return rounds.length > 0 ? rounds[rounds.length - 1] ?? null : null
}

function offerHasPrices(offer: TimetableTruckOffer): boolean {
  if ((offer.negotiation_rounds ?? []).length > 0) return true
  if (offer.expected_price_eur != null) return true
  if (offer.purchase_bid_eur != null) return true
  return false
}

export function offerHasVehicleIdentity(offer: TimetableTruckOffer): boolean {
  return Boolean(normalizeText(offer.brand) || normalizeText(offer.model) || offer.year != null)
}

function offerVehicleSimilarity(a: TimetableTruckOffer, b: TimetableTruckOffer): number {
  let score = 0
  const brandA = normalizeText(a.brand)
  const brandB = normalizeText(b.brand)
  const modelA = normalizeText(a.model)
  const modelB = normalizeText(b.model)
  const typeA = normalizeText(a.vehicle_type)
  const typeB = normalizeText(b.vehicle_type)
  if (brandA && brandA === brandB) score += 35
  if (modelA && modelA === modelB) score += 35
  if (typeA && typeA === typeB) score += 12
  if (a.year != null && b.year != null) score += a.year === b.year ? 20 : -30
  const overlap = overlapCount(vehicleTokens(a), vehicleTokens(b))
  if (overlap >= 2) score += 20
  else if (overlap === 1) score += 8
  return Math.max(0, score)
}

function offerLabel(offer: TimetableTruckOffer): string {
  const main = [offer.brand, offer.model].filter((v) => (v ?? '').trim()).join(' ').trim()
  if (main) {
    return offer.year != null ? `${main} (${offer.year})` : main
  }
  const alt = offer.vehicle_type.trim()
  if (alt) return alt
  return 'Vehicle'
}

function offerTouchedAt(entry: TimetableEntry, offer: TimetableTruckOffer): string {
  const latest = latestRound(offer)
  if (latest?.at) return latest.at
  const captured = (offer.captured_at ?? '').trim()
  if (captured && !Number.isNaN(Date.parse(captured))) return captured
  return entry.scheduled_at
}

export function collectTimetableOfferMemory({
  entries,
  targetEntry,
  targetOffer,
  currentOfferId,
  limit = 6,
}: OfferMemoryQuery): TimetableOfferMemoryItem[] {
  const supplier = supplierFingerprint(targetEntry)
  if (!supplier.company && !supplier.contact && !supplier.phone) return []

  const requiresSameVehicle = offerHasVehicleIdentity(targetOffer)
  const out: TimetableOfferMemoryItem[] = []

  for (const entry of entries) {
    if (!supplierMatches(supplier, supplierFingerprint(entry))) continue
    for (const offer of entry.offers ?? []) {
      if (!offerHasPrices(offer)) continue
      if (entry.id === targetEntry.id && currentOfferId && offer.id === currentOfferId) continue

      const similarity = offerVehicleSimilarity(targetOffer, offer)
      const sameVehicle = similarity >= 45
      if (requiresSameVehicle && !sameVehicle) continue

      const latest = latestRound(offer)
      const rounds = sortedRounds(offer)
      out.push({
        entryId: entry.id,
        offerId: offer.id,
        matchKind: sameVehicle ? 'same_vehicle' : 'same_supplier',
        matchScore: sameVehicle ? similarity : 10,
        happenedAt: offerTouchedAt(entry, offer),
        companyName: entry.company_name,
        contactName: entry.contact_name,
        phone: entry.phone,
        vehicleLabel: offerLabel(offer),
        latestSellerAskingEur: latest?.seller_asking_eur ?? offer.expected_price_eur ?? null,
        latestPurchaseBidEur: latest?.purchase_bid_eur ?? offer.purchase_bid_eur ?? null,
        latestNote: (latest?.note ?? '').trim(),
        roundCount: rounds.length,
        roundsPreview: rounds.slice(-3),
      })
    }
  }

  return out
    .sort((a, b) => {
      if (a.matchKind !== b.matchKind) return a.matchKind === 'same_vehicle' ? -1 : 1
      const dt = parseMs(b.happenedAt) - parseMs(a.happenedAt)
      if (dt !== 0) return dt
      return b.matchScore - a.matchScore
    })
    .slice(0, Math.max(1, limit))
}
