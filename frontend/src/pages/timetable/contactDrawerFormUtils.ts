import type {
  TimetableAppointmentHistoryRow,
  TimetableAssignmentRow,
  TimetableContactPerson,
  TimetableContactProfile,
  TimetableEntry,
  TimetableOutcome,
  TimetableTruckOffer,
  TimetableVehicleDisplayExtra,
} from '../../types/timetable'

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

export const EMPTY_OFFER: TimetableTruckOffer = {
  captured_at: '',
  vehicle_type: '',
  brand: '',
  model: '',
  year: null,
  mileage_km: null,
  quantity: null,
  expected_price_eur: null,
  location: '',
  notes: '',
}

export function emptyAppointmentRow(): TimetableAppointmentHistoryRow {
  return { date: '', time: '', purpose: '', remark: '', done: false, initials: '' }
}

export function emptyContactPerson(): TimetableContactPerson {
  return { name: '', phone: '', fax: '' }
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
  return false
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
