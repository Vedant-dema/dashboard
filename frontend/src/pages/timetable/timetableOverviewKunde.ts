import type {
  TimetableEntry,
  TimetableOverviewAdresseDraft,
  TimetableOverviewKundeDraft,
} from '../../types/timetable'

export function emptyOverviewAdresse(id?: string): TimetableOverviewAdresseDraft {
  return {
    id: id ?? `addr-${Math.random().toString(36).slice(2, 11)}`,
    typ: 'Hauptadresse',
    strasse: '',
    plz: '',
    ort: '',
    land_code: 'DE',
    art_land_code: 'IL',
    ust_id_nr: '',
    steuer_nr: '',
  }
}

export function emptyTimetableOverviewKunde(): TimetableOverviewKundeDraft {
  return {
    kunden_nr: '',
    customer_type: '',
    customer_status: 'active',
    branche: '',
    fzgHandel: '',
    gesellschaftsform: '',
    acquisition_source: '',
    acquisition_source_entity: '',
    profile_notes: '',
    operative_notes: '',
    firmenvorsatz: '',
    firmenname: '',
    website: '',
    addr_search_query: '',
    active_adresse_idx: 0,
    adressen: [emptyOverviewAdresse('addr-0')],
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

function normalizeAdresse(raw: unknown, fallbackId: string): TimetableOverviewAdresseDraft {
  const r = asRecord(raw)
  if (!r) return emptyOverviewAdresse(fallbackId)
  return {
    id: str(r.id, fallbackId),
    typ: str(r.typ, 'Hauptadresse'),
    strasse: str(r.strasse),
    plz: str(r.plz),
    ort: str(r.ort),
    land_code: str(r.land_code, 'DE'),
    art_land_code: str(r.art_land_code, 'IL'),
    ust_id_nr: str(r.ust_id_nr),
    steuer_nr: str(r.steuer_nr),
  }
}

/** Seed overview draft from an existing timetable row (best-effort). */
export function timetableOverviewFromEntry(entry: TimetableEntry): TimetableOverviewKundeDraft {
  const base = emptyTimetableOverviewKunde()
  const pr = entry.contact_profile
  const addr = (pr?.address ?? '').trim()
  const first = emptyOverviewAdresse('addr-0')
  first.strasse = addr
  return {
    ...base,
    kunden_nr: (pr?.customer_number ?? '').trim(),
    branche: (pr?.industry ?? '').trim(),
    firmenname: (entry.company_name ?? '').trim(),
    operative_notes: addr,
    website: (entry.contact_profile?.contacts?.[0]?.website ?? '').trim(),
    adressen: [first],
    active_adresse_idx: 0,
  }
}

export function formatOverviewAddressLine(k: TimetableOverviewKundeDraft): string {
  const list = k.adressen?.length ? k.adressen : [emptyOverviewAdresse()]
  const idx = Math.min(Math.max(0, k.active_adresse_idx ?? 0), list.length - 1)
  const a = list[idx]!
  return [a.strasse, [a.plz, a.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

export function normalizeTimetableOverviewKunde(raw: unknown): TimetableOverviewKundeDraft {
  const r = asRecord(raw)
  if (!r) return emptyTimetableOverviewKunde()

  const rawList = r.adressen
  let adressen: TimetableOverviewAdresseDraft[]
  if (Array.isArray(rawList) && rawList.length > 0) {
    adressen = rawList.map((x, i) => normalizeAdresse(x, `addr-${i}`))
  } else {
    adressen = [
      normalizeAdresse(
        {
          id: 'addr-0',
          typ: r.addr_typ,
          strasse: r.strasse,
          plz: r.plz,
          ort: r.ort,
          land_code: r.land_code,
          art_land_code: r.art_land_code,
          ust_id_nr: r.ust_id_nr,
          steuer_nr: r.steuer_nr,
        },
        'addr-0',
      ),
    ]
  }

  const rawAi = r.active_adresse_idx
  const aiNum =
    typeof rawAi === 'number' && Number.isFinite(rawAi)
      ? Math.trunc(rawAi)
      : typeof rawAi === 'string' && rawAi.trim() !== '' && Number.isFinite(Number(rawAi))
        ? Math.trunc(Number(rawAi))
        : 0
  const active_adresse_idx = Math.min(Math.max(0, aiNum), Math.max(0, adressen.length - 1))

  if (adressen.length === 0) {
    adressen = [emptyOverviewAdresse('addr-0')]
  }

  return {
    kunden_nr: str(r.kunden_nr),
    customer_type: oneOf(r.customer_type, ['', 'legal_entity', 'natural_person'], ''),
    customer_status: oneOf(r.customer_status, ['active', 'inactive', 'blocked'], 'active'),
    branche: str(r.branche),
    fzgHandel: oneOf(r.fzgHandel, ['', 'ja', 'nein'], ''),
    gesellschaftsform: str(r.gesellschaftsform),
    acquisition_source: oneOf(r.acquisition_source, ['', 'referral', 'website', 'email', 'call'], ''),
    acquisition_source_entity: str(r.acquisition_source_entity),
    profile_notes: str(r.profile_notes),
    operative_notes: str(r.operative_notes),
    firmenvorsatz: str(r.firmenvorsatz),
    firmenname: str(r.firmenname),
    website: str(r.website),
    addr_search_query: str(r.addr_search_query),
    active_adresse_idx,
    adressen,
  }
}
