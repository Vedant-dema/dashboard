import type { TimetableTruckOffer, TimetableVehicleDisplayExtra } from '../../types/timetable'

const BRANDS_RAW = [
  'MERCEDES-BENZ',
  'MERCEDES',
  'SCANIA',
  'MAN',
  'VOLVO',
  'IVECO',
  'DAF',
  'RENAULT',
  'SCHMITZ',
  'KRONE',
  'KOGEL',
  'KOEGEL',
  'FLIEGL',
]

const BRANDS = [...BRANDS_RAW].sort((a, b) => b.length - a.length)

const BRAND_DISPLAY: Record<string, string> = {
  'MERCEDES-BENZ': 'Mercedes-Benz',
  MERCEDES: 'Mercedes',
  SCANIA: 'Scania',
  MAN: 'MAN',
  VOLVO: 'Volvo',
  IVECO: 'IVECO',
  DAF: 'DAF',
  RENAULT: 'Renault',
  SCHMITZ: 'Schmitz',
  KRONE: 'Krone',
  KOGEL: 'Kogel',
  KOEGEL: 'Koegel',
  FLIEGL: 'Fliegl',
}

const BODY_HINTS: Array<{ re: RegExp; value: string }> = [
  { re: /\bk(?:u|ue|u\u0308)hlkoffer\b/i, value: 'Kuehlkoffer' },
  { re: /\bpritsche\b|\bplane\b/i, value: 'Pritsche / Plane' },
  { re: /\bkipper\b/i, value: 'Kipper' },
  { re: /\bsattelzug\b|\bszm\b/i, value: 'Sattelzug' },
  { re: /\bkoffer\b/i, value: 'Koffer' },
  { re: /\bcontainer\b/i, value: 'Container' },
  { re: /\btank\b/i, value: 'Tank' },
]

const TYPE_HINTS: Array<{ re: RegExp; value: string }> = [
  { re: /\blkw\b|\blastzug\b|\bsattelzug\b/i, value: 'LKW' },
  { re: /\btransporter\b|\bsprinter\b/i, value: 'Transporter' },
  { re: /\bauflieger\b|\banh(?:a|ae)nger\b|\btrailer\b/i, value: 'Auflieger / Anhaenger' },
]

const EQUIPMENT_RE =
  /\b(retarder|intarder|standklima(?:anlage)?|klimaanlage|klima|navigation|navi|tempomat|voll-?luft|luftfederung|adr|hydraulik|hebeb(?:u|ue)hne|liftachse|alufelgen|alcoa|sitzheizung|zusatztank|spoiler|schiebeplane|lenkachse|standheizung)\b/gi

export type OfferFreeTextParse = {
  offerPatch: Partial<TimetableTruckOffer>
  vehicleExtraPatch: Partial<TimetableVehicleDisplayExtra>
  summaryLines: string[]
}

type PriceEntry = {
  amount: number
  year: number | null
}

type VehicleMention = {
  line: string
  index: number
  brand: string
  model: string
  vehicle_type: string
  year: number | null
  mileage_km: number | null
  quantity: number | null
}

function normalizeInput(raw: string): string {
  return raw.replace(/\u00A0/g, ' ').replace(/\r/g, '\n').trim()
}

function compactDigits(raw: string): string {
  return raw.replace(/[^\d]/g, '')
}

function toSafeInt(raw: string): number | null {
  const n = Number(raw)
  return Number.isFinite(n) ? Math.round(n) : null
}

function titleCaseBrand(brand: string): string {
  return BRAND_DISPLAY[brand] ?? (brand.charAt(0) + brand.slice(1).toLowerCase())
}

function parseKm(text: string): number | null {
  const compact = text.replace(/\s/g, '')
  const tkmCompact = compact.match(/\b(\d{2,4})tkm\b/i)
  if (tkmCompact) {
    const n = toSafeInt(tkmCompact[1] ?? '')
    if (n != null) return n * 1000
  }

  const tkm = text.match(/\b(\d{1,3}(?:[.\s]\d{3})+|\d{2,4})\s*tkm\b/i)
  if (tkm) {
    const n = toSafeInt(compactDigits(tkm[1] ?? ''))
    if (n != null) return n * 1000
  }

  const kmLabeled = text.match(
    /\b(?:km-?stand|laufleistung|mileage)\s*[:\-]?\s*(\d{1,3}(?:[.,\s]\d{3})+|\d{4,7})\b/i
  )
  if (kmLabeled) {
    const n = toSafeInt(compactDigits(kmLabeled[1] ?? ''))
    if (n != null && n > 100) return n
  }

  const km = text.match(/\b(\d{1,3}(?:[.,\s]\d{3})+|\d{4,7})\s*(?:km|kilometer)\b/i)
  if (km) {
    const n = toSafeInt(compactDigits(km[1] ?? ''))
    if (n != null && n > 100) return n
  }
  return null
}

function parseAmountToken(raw: string): number | null {
  const compact = raw.replace(/\s/g, '').toLowerCase()
  if (!compact) return null

  if (compact.endsWith('k')) {
    const unit = compact.slice(0, -1).replace(',', '.')
    const n = Number(unit)
    if (Number.isFinite(n) && n >= 1) return Math.round(n * 1000)
    return null
  }

  const n = toSafeInt(compactDigits(raw))
  if (n == null || n < 500) return null
  return n
}

function parsePriceEntries(text: string): PriceEntry[] {
  const out: PriceEntry[] = []
  const seen = new Set<string>()
  const re = /(\d{1,3}(?:[.\s]\d{3})+|\d{4,7}|\d{2,3}(?:[.,]\d{1,2})?\s*k)\s*(?:\u20AC|eur|euro)?/gi
  const parseYearNearPrice = (start: number, end: number): number | null => {
    const ahead = text.slice(end, Math.min(text.length, end + 28))
    const aheadYear = ahead.match(/\b((?:19|20)\d{2})\b/)
    if (aheadYear) {
      const n = toSafeInt(aheadYear[1] ?? '')
      if (n != null && n >= 1980 && n <= 2060) return n
    }

    const behind = text.slice(Math.max(0, start - 18), start)
    const behindYears = [...behind.matchAll(/\b((?:19|20)\d{2})\b/g)]
    const tail = behindYears[behindYears.length - 1]
    if (tail) {
      const n = toSafeInt(tail[1] ?? '')
      if (n != null && n >= 1980 && n <= 2060) return n
    }
    return null
  }

  for (const m of text.matchAll(re)) {
    const amountRaw = m[1] ?? ''
    const amount = parseAmountToken(amountRaw)
    if (amount == null) continue

    const whole = m[0] ?? ''
    const hasExplicitMoneyUnit = /(?:\u20AC|eur|euro|\bk\b)/i.test(whole)
    if (!hasExplicitMoneyUnit && amount >= 1980 && amount <= 2060) continue

    const idx = m.index ?? 0
    const end = idx + (m[0]?.length ?? 0)
    const around = text.slice(Math.max(0, idx - 8), Math.min(text.length, end + 8))
    if (/\b(?:km|tkm|kilometer)\b/i.test(around)) continue

    const year = parseYearNearPrice(idx, end)
    const key = `${amount}-${year ?? 'na'}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ amount, year })
  }
  return out
}

const SELLER_LABEL_RE =
  /\b(?:preisidee\s*verk(?:a|ae|\u00e4)ufer|verk(?:a|ae|\u00e4)ufer(?:preis|preisidee)?|seller(?:\s*asking)?|asking|preisvorstellung|price(?:\s*idea)?|vb)\b\s*[:\-]?/i
const PURCHASE_LABEL_RE =
  /\b(?:dema\s*(?:einkauf|ankauf|bid|purchase)|einkaufspreis|ankauf|purchase(?:\s*(?:price|bid))?|our\s*bid)\b\s*[:\-]?/i

function stripLabelPrefix(line: string, labelRe: RegExp): string {
  const m = line.match(labelRe)
  if (!m || typeof m.index !== 'number') return line.trim()
  return line.slice(m.index + m[0].length).trim()
}

function pickBestPrice(entries: PriceEntry[], yearHint: number | null): number | null {
  if (entries.length === 0) return null
  if (yearHint != null) {
    const exact = entries.find((e) => e.year === yearHint)
    if (exact) return exact.amount
  }
  const yearless = entries.find((e) => e.year == null)
  if (yearless) return yearless.amount
  return entries[0]?.amount ?? null
}

function parseSellerAndPurchasePrices(
  text: string,
  yearHint: number | null
): { seller: number | null; purchase: number | null } {
  const sellerEntries: PriceEntry[] = []
  const purchaseEntries: PriceEntry[] = []
  const genericEntries: PriceEntry[] = []

  const hasMoney = (line: string) =>
    /\b(?:\d{1,3}(?:[.\s]\d{3})+|\d{4,7}|\d{2,3}(?:[.,]\d{1,2})?\s*k)\b/i.test(line) &&
    /\b(?:\u20AC|eur|euro|preis|price|vb|einkauf|ankauf|bid)\b/i.test(line)

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    if (!hasMoney(line)) continue

    if (PURCHASE_LABEL_RE.test(line)) {
      purchaseEntries.push(...parsePriceEntries(stripLabelPrefix(line, PURCHASE_LABEL_RE)))
      continue
    }
    if (SELLER_LABEL_RE.test(line)) {
      sellerEntries.push(...parsePriceEntries(stripLabelPrefix(line, SELLER_LABEL_RE)))
      continue
    }
    if (!/\b(?:km|tkm|kilometer)\b/i.test(line)) {
      genericEntries.push(...parsePriceEntries(line))
    }
  }

  if (genericEntries.length === 0) {
    genericEntries.push(...parsePriceEntries(text))
  }

  const seller = pickBestPrice(sellerEntries.length > 0 ? sellerEntries : genericEntries, yearHint)
  const purchase = pickBestPrice(purchaseEntries, yearHint)
  return { seller, purchase }
}

function parseRegistration(text: string): string | null {
  const labeled = text.match(
    /\b(?:ez|erstzulassung|first\s+registration|registration|zulassung|reg)\s*[:\-]?\s*(0?[1-9]|1[0-2])[./\\-]((?:19|20)\d{2})\b/i
  )
  if (labeled) {
    return `${String(labeled[1]).padStart(2, '0')}/${labeled[2]}`
  }

  const fallback = text.match(/\b(0?[1-9]|1[0-2])[./\\-]((?:19|20)\d{2})\b/)
  if (fallback) {
    return `${String(fallback[1]).padStart(2, '0')}/${fallback[2]}`
  }
  return null
}

function parseYear(text: string): number | null {
  const labeled = text.match(/\b(?:baujahr|bj|year|yr)\s*[:\-]?\s*((?:19|20)\d{2})\b/i)
  if (labeled) {
    const n = toSafeInt(labeled[1] ?? '')
    if (n != null && n >= 1980 && n <= 2060) return n
  }

  const any = text.match(/\b((?:19|20)\d{2})\b/)
  if (any) {
    const n = toSafeInt(any[1] ?? '')
    if (n != null && n >= 1980 && n <= 2060) return n
  }
  return null
}

function parseQuantity(text: string): number | null {
  const q = text.match(/\b(\d{1,2})\s*(?:x|stk|st(?:u|ue)ck|fahrzeuge?|trucks?|units?)\b/i)
  if (q) {
    const n = toSafeInt(q[1] ?? '')
    if (n != null && n >= 1 && n <= 99) return n
  }

  const xPrefix = text.match(/\bx\s*(\d{1,2})\b/i)
  if (xPrefix) {
    const n = toSafeInt(xPrefix[1] ?? '')
    if (n != null && n >= 1 && n <= 99) return n
  }
  return null
}

function parseLocation(text: string): string | null {
  const labeled = text.match(
    /\b(?:standort|ort|location)\s*(?:ist\s+)?[:\-]?\s*([a-z0-9 .,/()-]{2,60}?)(?=,|;|\.|\n|$)/i
  )
  if (!labeled) return null
  const value = (labeled[1] ?? '').trim().replace(/[.,;]+$/, '')
  if (value.length < 2) return null
  return value
}

function pickBody(text: string): string {
  for (const { re, value } of BODY_HINTS) {
    if (re.test(text)) return value
  }
  return ''
}

function pickVehicleType(text: string): string {
  for (const { re, value } of TYPE_HINTS) {
    if (re.test(text)) return value
  }
  return ''
}

function parseBrandModel(raw: string): { brand: string; model: string } {
  const stopRe =
    /\b(?:zu\s+verkauf(?:en)?|verkauf(?:en)?|ez|erstzulassung|first\s+registration|registration|zulassung|bj|baujahr|year|km(?:-?stand)?|tkm|laufleistung|mileage|preis|price|vb|standort|ort|location|ausstattung|extras?)\b/i

  const trimByChars = (value: string, side: 'start' | 'end') => {
    const chars = '-:/.,; '
    let s = value
    if (side === 'start') {
      while (s.length > 0 && chars.includes(s[0] ?? '')) s = s.slice(1)
      return s
    }
    while (s.length > 0 && chars.includes(s[s.length - 1] ?? '')) s = s.slice(0, -1)
    return s
  }

  const cleanModel = (source: string): string => {
    let s = trimByChars(source, 'start').replace(/\s+/g, ' ').trim()
    const stop = s.match(stopRe)
    if (stop && typeof stop.index === 'number') {
      s = s.slice(0, stop.index).trim()
    }
    s = trimByChars(s, 'end').trim()
    return s.slice(0, 80)
  }

  const upper = raw.toUpperCase()
  for (const knownBrand of BRANDS) {
    const idx = upper.indexOf(knownBrand)
    if (idx === -1) continue

    const brand = titleCaseBrand(knownBrand)
    const after = raw.slice(idx + knownBrand.length).trim()
    const firstSegment = after.split(/[\n,;|]/)[0]?.trim() ?? ''
    const cleaned = cleanModel(firstSegment)

    return {
      brand,
      model: cleaned,
    }
  }

  const fallback = raw.match(/\b([a-z]{2,20})\s+([a-z0-9-]{1,20}(?:\s+[a-z0-9-]{1,20})?)\b/i)
  if (fallback) {
    const brand = (fallback[1] ?? '').trim()
    const model = cleanModel((fallback[2] ?? '').trim())
    if (brand && model && /\d/.test(model)) {
      return { brand, model }
    }
  }
  return { brand: '', model: '' }
}

function extractVehicleMentions(raw: string): VehicleMention[] {
  const out: VehicleMention[] = []
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  lines.forEach((line, index) => {
    const clean = line.replace(/^[-*]\s*/, '').trim()
    if (!clean) return
    const bm = parseBrandModel(clean)
    const hasVehicleIdentity = !!bm.brand || !!bm.model || /\b(?:lkw|szm|transporter|trailer|auflieger)\b/i.test(clean)
    if (!hasVehicleIdentity) return
    out.push({
      line: clean,
      index,
      brand: bm.brand,
      model: bm.model,
      vehicle_type: pickVehicleType(clean),
      year: parseYear(clean),
      mileage_km: parseKm(clean),
      quantity: parseQuantity(clean),
    })
  })

  if (out.length === 0) {
    const bm = parseBrandModel(raw)
    if (bm.brand || bm.model) {
      out.push({
        line: raw,
        index: 0,
        brand: bm.brand,
        model: bm.model,
        vehicle_type: pickVehicleType(raw),
        year: parseYear(raw),
        mileage_km: parseKm(raw),
        quantity: parseQuantity(raw),
      })
    }
  }
  return out
}

function normCmp(raw: string | undefined): string {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function pickPrimaryVehicleMention(
  mentions: VehicleMention[],
  preferred?: Partial<TimetableTruckOffer>
): VehicleMention | null {
  if (mentions.length === 0) return null
  const prefBrand = normCmp(preferred?.brand)
  const prefModel = normCmp(preferred?.model)
  const prefYear = preferred?.year ?? null
  const prefType = normCmp(preferred?.vehicle_type)

  const score = (m: VehicleMention) =>
    (m.brand ? 3 : 0) +
    (m.model ? 3 : 0) +
    (m.year != null ? 2 : 0) +
    (m.mileage_km != null ? 2 : 0) +
    (m.quantity != null ? 1 : 0) +
    (prefBrand && normCmp(m.brand) === prefBrand ? 4 : 0) +
    (prefModel && normCmp(m.model) === prefModel ? 4 : 0) +
    (prefModel && normCmp(m.model).includes(prefModel) ? 2 : 0) +
    (prefType && normCmp(m.vehicle_type) === prefType ? 2 : 0) +
    (prefYear != null && m.year === prefYear ? 5 : 0)
  return [...mentions].sort((a, b) => score(b) - score(a) || a.index - b.index)[0] ?? null
}

function lineLooksLikeVehicleSpec(line: string): boolean {
  const l = line.replace(/^[-*]\s*/, '').trim()
  if (!l) return false
  const bm = parseBrandModel(l)
  if (bm.brand || bm.model) return true
  if (parseKm(l) != null) return true
  if (parseYear(l) != null) return true
  if (parseQuantity(l) != null && /\b(?:fahrzeuge?|trucks?|units?)\b/i.test(l)) return true
  return false
}

function extractEquipmentNotes(raw: string): string | null {
  const found: string[] = []
  const seen = new Set<string>()
  const equipmentKeywordRe = new RegExp(EQUIPMENT_RE.source, 'i')

  const push = (value: string) => {
    const clean = value.trim().replace(/\s+/g, ' ').replace(/[.,;:]+$/, '')
    if (clean.length < 2 || clean.length > 120) return
    const key = clean.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    found.push(clean)
  }

  for (const line of raw.split('\n')) {
    const l = line.trim()
    if (!l) continue
    if (/^(ausstattung|extras?|equipment|features?)\s*:/i.test(l)) {
      const rest = l.replace(/^(ausstattung|extras?|equipment|features?)\s*:/i, '')
      for (const part of rest.split(/[,;/]| und /i)) push(part)
      continue
    }
    if (/^[-*]\s+/.test(l) && equipmentKeywordRe.test(l) && !lineLooksLikeVehicleSpec(l)) {
      push(l.replace(/^[-*]\s+/, ''))
    }
  }

  for (const m of raw.matchAll(/\(([^)]{3,140})\)/g)) {
    const chunk = (m[1] ?? '').trim()
    if (!equipmentKeywordRe.test(chunk)) continue
    for (const part of chunk.split(/[,;/]| und /i)) push(part)
  }

  for (const m of raw.matchAll(EQUIPMENT_RE)) {
    push(m[1] ?? '')
  }

  if (found.length === 0) return null
  return found.join(', ')
}

function addLine(lines: string[], seen: Set<string>, label: string, value: string | number) {
  const line = `${label}: ${value}`
  const key = line.toLowerCase()
  if (seen.has(key)) return
  seen.add(key)
  lines.push(line)
}

/** On-device heuristic parser - no network; best-effort structured fields from pasted notes. */
export function parseOfferFreeText(
  raw: string,
  preferredOffer?: Partial<TimetableTruckOffer>
): OfferFreeTextParse {
  const normalized = normalizeInput(raw)
  if (!normalized) {
    return { offerPatch: {}, vehicleExtraPatch: {}, summaryLines: [] }
  }

  const offerPatch: Partial<TimetableTruckOffer> = {}
  const vehicleExtraPatch: Partial<TimetableVehicleDisplayExtra> = {}
  const summaryLines: string[] = []
  const summarySeen = new Set<string>()

  const mentions = extractVehicleMentions(normalized)
  const primary = pickPrimaryVehicleMention(mentions, preferredOffer)
  if (mentions.length > 1) {
    addLine(summaryLines, summarySeen, 'Vehicle records', mentions.length)
  }

  const vehicleType = primary?.vehicle_type || pickVehicleType(normalized)
  if (vehicleType) {
    offerPatch.vehicle_type = vehicleType
    addLine(summaryLines, summarySeen, 'Vehicle type', vehicleType)
  }

  const { brand, model } = primary ?? parseBrandModel(normalized)
  if (brand) {
    offerPatch.brand = brand
    addLine(summaryLines, summarySeen, 'Brand', brand)
  }
  if (model) {
    offerPatch.model = model
    addLine(summaryLines, summarySeen, 'Model', model)
  }

  const body = pickBody(primary?.line ?? normalized)
  if (body) {
    vehicleExtraPatch.body_type = body
    addLine(summaryLines, summarySeen, 'Body', body)
  }

  const registration = parseRegistration(primary?.line ?? '') || parseRegistration(normalized)
  if (registration) {
    vehicleExtraPatch.registration_mm_yyyy = registration
    addLine(summaryLines, summarySeen, 'First reg', registration)

    const yearFromReg = registration.split('/')[1]
    if (yearFromReg && /^\d{4}$/.test(yearFromReg)) {
      const n = Number(yearFromReg)
      if (Number.isFinite(n) && n >= 1980 && n <= 2060) {
        offerPatch.year = n
      }
    }
  }

  if (offerPatch.year == null) {
    const year = primary?.year ?? parseYear(normalized)
    if (year != null) {
      offerPatch.year = year
      addLine(summaryLines, summarySeen, 'Year', year)
    }
  }

  const mileage = primary?.mileage_km ?? parseKm(normalized)
  if (mileage != null) {
    offerPatch.mileage_km = mileage
    addLine(summaryLines, summarySeen, 'Mileage', mileage.toLocaleString('de-DE'))
  }

  const yearHint = offerPatch.year ?? primary?.year ?? null
  const prices = parseSellerAndPurchasePrices(normalized, yearHint)
  if (prices.seller != null) {
    offerPatch.expected_price_eur = prices.seller
    addLine(summaryLines, summarySeen, 'Seller EUR', prices.seller.toLocaleString('de-DE'))
  }
  if (prices.purchase != null) {
    offerPatch.purchase_bid_eur = prices.purchase
    addLine(summaryLines, summarySeen, 'Purchasing EUR', prices.purchase.toLocaleString('de-DE'))
  }

  const quantity = primary?.quantity ?? parseQuantity(normalized)
  if (quantity != null) {
    offerPatch.quantity = quantity
    addLine(summaryLines, summarySeen, 'Quantity', quantity)
  }

  const location = parseLocation(normalized)
  if (location) {
    offerPatch.location = location
    addLine(summaryLines, summarySeen, 'Location', location)
  }

  const equipment = extractEquipmentNotes(normalized)
  if (equipment) {
    offerPatch.notes = equipment
    addLine(summaryLines, summarySeen, 'Equipment', equipment)
  }

  return { offerPatch, vehicleExtraPatch, summaryLines }
}

export function buildGeneratorSummary(p: OfferFreeTextParse): string {
  if (p.summaryLines.length === 0) return ''
  return p.summaryLines.map((line) => `- ${line}`).join('\n')
}
