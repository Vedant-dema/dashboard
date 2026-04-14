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

function parsePriceEur(text: string): number | null {
  const explicit = text.match(
    /\b(\d{1,3}(?:[.\s]\d{3})+|\d{4,7}|\d{1,3}(?:,\d{1,2})?)\s*(?:\u20AC|eur|euro|netto|brutto)\b/i
  )
  if (explicit) {
    const digits = compactDigits(explicit[1] ?? '')
    const n = toSafeInt(digits)
    if (n != null && n >= 500) return n
  }

  const byLabel = text.match(
    /\b(?:preis|price|vb|verhandlungsbasis)\s*[:\-]?\s*(\d{1,3}(?:[.\s]\d{3})+|\d{4,7}|\d{1,3}(?:,\d{1,2})?)\b/i
  )
  if (byLabel) {
    const digits = compactDigits(byLabel[1] ?? '')
    const n = toSafeInt(digits)
    if (n != null && n >= 500) return n
  }

  const kPrice = text.match(/\b(\d{2,3})(?:[.,]\d+)?\s*k\b/i)
  if (kPrice) {
    const n = toSafeInt(kPrice[1] ?? '')
    if (n != null && n >= 10) return n * 1000
  }
  return null
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

function extractEquipmentNotes(raw: string): string | null {
  const found: string[] = []
  const seen = new Set<string>()

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
    if (/^(ausstattung|extras?)\s*:/i.test(l)) {
      const rest = l.replace(/^(ausstattung|extras?)\s*:/i, '')
      for (const part of rest.split(/[,;/]| und /i)) push(part)
      continue
    }
    if (/^[-*]\s+/.test(l)) {
      push(l.replace(/^[-*]\s+/, ''))
    }
  }

  for (const m of raw.matchAll(/\(([^)]{3,140})\)/g)) {
    for (const part of (m[1] ?? '').split(/[,;/]| und /i)) push(part)
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
export function parseOfferFreeText(raw: string): OfferFreeTextParse {
  const normalized = normalizeInput(raw)
  if (!normalized) {
    return { offerPatch: {}, vehicleExtraPatch: {}, summaryLines: [] }
  }

  const offerPatch: Partial<TimetableTruckOffer> = {}
  const vehicleExtraPatch: Partial<TimetableVehicleDisplayExtra> = {}
  const summaryLines: string[] = []
  const summarySeen = new Set<string>()

  const vehicleType = pickVehicleType(normalized)
  if (vehicleType) {
    offerPatch.vehicle_type = vehicleType
    addLine(summaryLines, summarySeen, 'Vehicle type', vehicleType)
  }

  const { brand, model } = parseBrandModel(normalized)
  if (brand) {
    offerPatch.brand = brand
    addLine(summaryLines, summarySeen, 'Brand', brand)
  }
  if (model) {
    offerPatch.model = model
    addLine(summaryLines, summarySeen, 'Model', model)
  }

  const body = pickBody(normalized)
  if (body) {
    vehicleExtraPatch.body_type = body
    addLine(summaryLines, summarySeen, 'Body', body)
  }

  const registration = parseRegistration(normalized)
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
    const year = parseYear(normalized)
    if (year != null) {
      offerPatch.year = year
      addLine(summaryLines, summarySeen, 'Year', year)
    }
  }

  const mileage = parseKm(normalized)
  if (mileage != null) {
    offerPatch.mileage_km = mileage
    addLine(summaryLines, summarySeen, 'Mileage', mileage.toLocaleString('de-DE'))
  }

  const price = parsePriceEur(normalized)
  if (price != null) {
    offerPatch.expected_price_eur = price
    addLine(summaryLines, summarySeen, 'Price EUR', price.toLocaleString('de-DE'))
  }

  const quantity = parseQuantity(normalized)
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
