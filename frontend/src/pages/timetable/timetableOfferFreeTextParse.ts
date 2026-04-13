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
  'KÖGEL',
  'KOEGEL',
  'FLIEGL',
]

const BRANDS = [...BRANDS_RAW].sort((a, b) => b.length - a.length)

const BODY_HINTS: Array<{ re: RegExp; value: string }> = [
  { re: /\bkühlkoffer\b/i, value: 'Kühlkoffer' },
  { re: /\bpritsche\b/i, value: 'Pritsche / Plane' },
  { re: /\bkipper\b/i, value: 'Kipper' },
  { re: /\bsattelzug\b|\bSZM\b/i, value: 'Sattelzug' },
  { re: /\bkoffer\b/i, value: 'Koffer' },
  { re: /\bplane\b/i, value: 'Plane' },
]

const TYPE_HINTS: Array<{ re: RegExp; value: string }> = [
  { re: /\blkw\b|\bsattelzug\b|\blastzug\b/i, value: 'LKW' },
  { re: /\btransporter\b|\bsprinter\b/i, value: 'Transporter' },
  { re: /\bauflieger\b|\banhänger\b|\banhaenger\b/i, value: 'Auflieger / Anhänger' },
]

function parseKm(text: string): number | null {
  const tkmTight = text.match(/\b(\d+)tkm\b/i)
  if (tkmTight) {
    const n = Number(tkmTight[1])
    if (Number.isFinite(n)) return n * 1000
  }
  const tkm = text.match(/\b(\d{1,3}(?:\.\d{3})*|\d+)\s*tkm\b/i)
  if (tkm) {
    const n = Number(tkm[1]!.replace(/\./g, '').replace(/\s/g, ''))
    if (Number.isFinite(n)) return n * 1000
  }
  const km = text.match(/\b(\d{1,3}(?:\.\d{3})+|\d{2,})\s*km\b/i)
  if (km) {
    const raw = km[1]!.replace(/\./g, '').replace(/\s/g, '')
    const n = Number(raw)
    if (Number.isFinite(n) && n > 100) return n
  }
  return null
}

function parsePriceEur(text: string): number | null {
  const m = text.match(
    /\b(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*(€|eur|euro)\b/i
  )
  if (m) {
    const num = m[1]!.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    const n = Number(num)
    return Number.isFinite(n) ? Math.round(n) : null
  }
  const tail = text.match(/\b(\d{4,})\s*€?\b/)
  if (tail) {
    const n = Number(tail[1])
    if (Number.isFinite(n) && n >= 1000) return n
  }
  return null
}

function parseRegistration(text: string): string | null {
  const m = text.match(/\b(0[1-9]|1[0-2])[./\\-]((?:19|20)\d{2})\b/)
  return m ? `${m[1]}/${m[2]}` : null
}

function titleCaseBrand(b: string): string {
  if (b === 'MERCEDES-BENZ') return 'Mercedes-Benz'
  return b.charAt(0) + b.slice(1).toLowerCase()
}

function parseBrandModel(upper: string, raw: string): { brand: string; model: string } {
  let brand = ''
  let model = ''
  for (const b of BRANDS) {
    const idx = upper.indexOf(b)
    if (idx !== -1) {
      brand = titleCaseBrand(b)
      const after = raw.slice(idx + b.length).trim()
      const words = after.split(/[,\n]|km|tkm|€|eur|\d{2}\/\d{2,4}/i)[0]?.trim() ?? ''
      model = words.replace(/^[-–—]\s*/, '').slice(0, 80)
      break
    }
  }
  if (!brand && raw.trim()) {
    const parts = raw.trim().split(/\s+/)
    if (parts.length >= 2 && parts[0] && parts[0].length <= 24) {
      brand = parts[0]!
      model = parts.slice(1, 5).join(' ')
    }
  }
  return { brand, model }
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

/** Ausstattung / equipment lines — complements structured fields (no network). */
function extractEquipmentNotes(raw: string): string | null {
  const parts: string[] = []
  const seen = new Set<string>()
  const add = (s: string) => {
    const t = s.trim().replace(/\s+/g, ' ')
    if (t.length < 2 || t.length > 120) return
    const k = t.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    parts.push(t)
  }

  for (const m of raw.matchAll(/\(([^)]{3,200})\)/g)) {
    for (const bit of m[1]!.split(/[,;/]| und /i)) add(bit)
  }

  const eqRe =
    /\b(Retarder|Intarder|Standklima(?:anlage)?|Klimaanlage|Klima|Navigation|Navi|Tempomat|Voll-Luft|Vollluft|Luftfederung|ADR|Hydraulik|Hebebühne|Hebebuehne|Liftachse|Alufelgen|Alcoa|Sitzheizung|Zusatztank|Spoiler|Schiebeplane|Lenkachse|Standheizung)\b/gi
  for (const m of raw.matchAll(eqRe)) add(m[1]!)

  if (parts.length === 0) return null
  return parts.join(', ')
}

export type OfferFreeTextParse = {
  offerPatch: Partial<TimetableTruckOffer>
  vehicleExtraPatch: Partial<TimetableVehicleDisplayExtra>
  summaryLines: string[]
}

/** On-device heuristic — no network; best-effort structured fields from pasted notes. */
export function parseOfferFreeText(raw: string): OfferFreeTextParse {
  const trimmed = raw.trim()
  if (!trimmed) {
    return { offerPatch: {}, vehicleExtraPatch: {}, summaryLines: [] }
  }
  const upper = trimmed.toUpperCase()
  const offerPatch: Partial<TimetableTruckOffer> = {}
  const vehicleExtraPatch: Partial<TimetableVehicleDisplayExtra> = {}
  const lines: string[] = []

  const km = parseKm(upper)
  if (km != null) {
    offerPatch.mileage_km = km
    lines.push(`KM: ${km.toLocaleString('de-DE')}`)
  }

  const price = parsePriceEur(trimmed)
  if (price != null) {
    offerPatch.expected_price_eur = price
    lines.push(`Preis: ${price.toLocaleString('de-DE')} €`)
  }

  const reg = parseRegistration(trimmed)
  if (reg) {
    vehicleExtraPatch.registration_mm_yyyy = reg
    lines.push(`Erstzulassung: ${reg}`)
    const yPart = reg.split('/')[1]
    if (yPart && /^\d{4}$/.test(yPart)) {
      const yr = Number(yPart)
      if (yr >= 1980 && yr <= 2060) offerPatch.year = yr
    }
  }

  const body = pickBody(trimmed)
  if (body) {
    vehicleExtraPatch.body_type = body
    lines.push(`Aufbau: ${body}`)
  }

  const vt = pickVehicleType(trimmed)
  if (vt) {
    offerPatch.vehicle_type = vt
    lines.push(`Fahrzeugart: ${vt}`)
  }

  const { brand, model } = parseBrandModel(upper, trimmed)
  if (brand) {
    offerPatch.brand = brand
    lines.push(`Hersteller: ${brand}`)
  }
  if (model) {
    offerPatch.model = model
    lines.push(`Modell: ${model}`)
  }

  const equipment = extractEquipmentNotes(trimmed)
  if (equipment) {
    offerPatch.notes = equipment
    lines.push(`Ausstattung: ${equipment}`)
  }

  return { offerPatch, vehicleExtraPatch, summaryLines: lines }
}

export function buildGeneratorSummary(p: OfferFreeTextParse): string {
  if (p.summaryLines.length === 0) return ''
  return p.summaryLines.join('\n')
}
