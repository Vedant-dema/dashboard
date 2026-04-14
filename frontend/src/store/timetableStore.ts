import type {
  TimetableActivityNoteEntry,
  TimetableAppointmentHistoryRow,
  TimetableAssignmentRow,
  TimetableContactPerson,
  TimetableContactProfile,
  TimetableDbState,
  TimetableEntry,
  TimetableNegotiationPriceRound,
  TimetableOutcome,
  TimetableTruckOffer,
  TimetableVehicleDisplayExtra,
} from '../types/timetable';
import { splitStoredPhone } from '../features/customers/mappers/customerFormMapper';
import { newTruckOfferId, offerHasContent } from '../pages/timetable/contactDrawerFormUtils';
import { normalizeTimetableOverviewKunde } from '../pages/timetable/timetableOverviewKunde';

const STORAGE_KEY = 'dema-purchase-timetable-v6';
const LEGACY_STORAGE_KEY = 'dema-purchase-timetable-v1';

function localIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localIsoDateTime(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

function toScheduledAt(dateIso: string, timeHm: string): string {
  return `${dateIso}T${timeHm}:00`;
}

/**
 * Placeholder calendar day baked into seed templates; remapped to real days in buildSpreadSeeds().
 * (Legacy screenshot: 09.04.2026 — content preserved, dates applied at runtime.)
 */
const SEED_PLACEHOLDER_DAY = '2000-01-01';

function remapSeedDay(entries: TimetableEntry[], realIso: string): TimetableEntry[] {
  return entries.map((e) => {
    const timeFrom = (raw: string, fallbackHm: string) => {
      const m = raw.match(/T(\d{2}:\d{2})/);
      return m ? m[1] : fallbackHm;
    };
    const hm = timeFrom(e.scheduled_at, '09:00');
    const follow =
      e.follow_up_at != null
        ? toScheduledAt(realIso, timeFrom(e.follow_up_at, '15:00'))
        : null;
    const offers = (e.offers ?? []).map((o) => ({
      ...o,
      captured_at: toScheduledAt(realIso, timeFrom(o.captured_at, '09:00')),
    }));
    return {
      ...e,
      scheduled_at: toScheduledAt(realIso, hm),
      follow_up_at: follow,
      offers,
    };
  });
}

/**
 * Legacy Termin-Kalender demo rows (same calendar day), for a dense “Tagesübersicht” like the reference UI.
 * `startId` is the first assigned `id` (use 1 for empty DB, or `state.nextId` when appending).
 */
function demoSeedsForDay(realIso: string, startId: number): TimetableEntry[] {
  const remapped = remapSeedDay(SEED_ENTRIES_RAW, realIso);
  return remapped.map((e, i) => ({ ...e, id: startId + i }));
}

/**
 * If the DB has user rows but no shared demo buyer queue, append demo seeds once (manager demo).
 */
function ensureSharedDemoTimetableRows(state: TimetableDbState): TimetableDbState {
  if (state.entries.some((e) => e.buyer_name === TIMETABLE_DEMO_BUYER)) return state;
  const seeds = demoSeedsForDay(localIsoDate(), state.nextId);
  return {
    entries: [...state.entries, ...seeds],
    nextId: state.nextId + seeds.length,
  };
}

/** Remove built-in demo buyer rows after the user saves their own appointment. */
export function stripTimetableDemoBuyerRows(state: TimetableDbState): TimetableDbState {
  return {
    ...state,
    entries: state.entries.filter((e) => e.buyer_name !== TIMETABLE_DEMO_BUYER),
  };
}

/** Shared demo buyer — visible to every signed-in user alongside their own code. */
export const TIMETABLE_DEMO_BUYER = 'DEMO';

/** Demo rows transcribed from legacy Termin-Kalender (Tagesübersicht, 09.04.2026). */
const SEED_ENTRIES_RAW: TimetableEntry[] = [
  {
    id: 1,
    legacy_ka: 'A',
    legacy_arte: 'KA',
    buyer_name: TIMETABLE_DEMO_BUYER,
    scheduled_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '00:00'),
    company_name: 'Dahm GmbH Eis & Tiefkühlkost',
    phone: '06551-981960',
    contact_name: 'Mathias Dahm',
    purpose: 'Anruf',
    notes:
      'PV warte auf Rückruf / habe per email 11.3.26 wieder angefragt / überlegen beide für die 50% / habe email gesendet da nie erreichbar',
    outcome: 'has_trucks',
    follow_up_at: null,
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [
      {
        id: 'seed-tt-o-dahm',
        captured_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '08:30'),
        vehicle_type: 'LKW',
        brand: 'MB',
        model: 'Atego 818',
        year: 2007,
        mileage_km: 782000,
        quantity: 1,
        expected_price_eur: 6000,
        location: 'Prüm',
        notes: 'Kühlkoffer · Ersatzmotor-Laufleistung ca. 500000 km',
      },
    ],
    selected_offer_id: 'seed-tt-o-dahm',
    contact_profile: {
      industry: 'Kühltransporte',
      address: '54595 Prüm, Rudolf-Diesel-Str. 5',
      customer_number: '35258',
      fleet_summary: 'gekauft am 04-2014 Atego 818 Bj 2003, TS 300',
      contacts: [
        {
          id: 'seed-tt-c1',
          name: 'Mathias Dahm',
          rolle: '',
          telefonCode: '+49',
          telefon: '06551-981960',
          handyCode: '+49',
          handy: '',
          email: '',
          website: '',
          bemerkung: '',
        },
        {
          id: 'seed-tt-c2',
          name: 'Frau Monika Dahm',
          rolle: '',
          telefonCode: '+49',
          telefon: '06551-981961',
          handyCode: '+49',
          handy: '',
          email: '',
          website: '',
          bemerkung: 'Fax: 06551-981962',
        },
      ],
      assignment_history: [{ name: 'Valergas Panagiotis', since: '2023' }],
      appointment_history: [
        {
          date: '15.03.2023',
          time: '09:00',
          purpose: 'Anruf',
          remark: 'PV Erstkontakt Kühltransporte',
          done: false,
          initials: 'PV',
        },
        {
          date: '12.08.2024',
          time: '14:30',
          purpose: 'Anruf',
          remark: 'PV Nachfrage Kühlkoffer / Bilder angefordert',
          done: true,
          initials: 'PV',
        },
        {
          date: '11.03.2026',
          time: '11:20',
          purpose: 'Anruf',
          remark: 'PV E-Mail mit 50%-Option / Rückruf ausstehend',
          done: false,
          initials: 'MD',
        },
        {
          date: '09.04.2026',
          time: '00:00',
          purpose: 'Anruf',
          remark:
            'PV warte auf Rückruf / habe per email 11.3.26 wieder angefragt / überlegen beide für die 50%',
          done: false,
          initials: 'MD',
        },
      ],
      activity_notes_log: [
        {
          id: 'demo-act-1',
          at: '2026-04-08T12:00:00.000Z',
          author_name: 'Valergas Panagiotis',
          text: [
            'Sehr geehrter Herr Valergas,',
            '',
            'vielen Dank für die Rückmeldung. Die Batterien des MAN TGL wurden heute erneuert; Fahrzeug steht wieder zur Besichtigung.',
          ].join('\n'),
        },
        {
          id: 'demo-act-2',
          at: '2026-04-09T07:30:00.000Z',
          author_name: 'Valergas Panagiotis',
          text: [
            'Preisstand (netto, Stand 09.04.2026):',
            '— Mercedes Atego 818 je Fahrzeug 6.000 €',
            '— MAN TGL 12.250 14.000 €',
            '— SZM MAN TGA 18.430 nach Absprache / Bestand prüfen',
            '',
            'Wir melden uns nach Rücklauf aus der Werkstatt bzgl. Probefahrt-Termin.',
            '',
            'Mit freundlichen Grüßen',
          ].join('\n'),
        },
      ],
      vehicle_extras: {
        'seed-tt-o-dahm': {
          body_type: 'Kühlkoffer',
          registration_mm_yyyy: '09/2007',
          mileage_replacement_km: 500000,
          sold: false,
          deregistered: false,
          customer_price_eur: 6000,
          processor_name: 'Valergas Panagiotis',
          processor_entered: 'Valergas Panagiotis',
          processor_fetched: 'Valergas Panagiotis',
          processor_negotiated: 'Valergas Panagiotis',
        },
      },
    },
  },
  {
    id: 2,
    legacy_ka: 'A',
    legacy_arte: 'KA',
    buyer_name: TIMETABLE_DEMO_BUYER,
    scheduled_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '00:00'),
    company_name: 'Wichmann Enten GmbH',
    phone: '09548-922915',
    contact_name: 'Frau Heinlein',
    purpose: 'Anruf',
    notes:
      'PV warte auf Rechnung 32500.- / hat kauf bestätigt soll mit Chef sprechen !!! / habe 32500 per whatsapp geboten!',
    outcome: 'follow_up',
    follow_up_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '15:00'),
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [],
    selected_offer_id: null,
  },
  {
    id: 3,
    legacy_ka: 'A',
    legacy_arte: 'KA',
    buyer_name: TIMETABLE_DEMO_BUYER,
    scheduled_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '00:30'),
    company_name: 'ABATTOIR ETTELBRUCK',
    phone: '00352-81 79 21-1',
    contact_name: 'Zentrale',
    purpose: 'Anruf',
    notes: 'PV Gebot abgegeben am 07.04.26 per email',
    outcome: 'has_trucks',
    follow_up_at: null,
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [
      {
        id: 'seed-tt-o-abat',
        captured_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '09:00'),
        vehicle_type: 'Angebot',
        brand: '—',
        model: '—',
        year: null,
        mileage_km: null,
        quantity: null,
        expected_price_eur: null,
        location: 'Ettelbruck',
        notes: 'Gebot per E-Mail; Rückmeldung offen.',
      },
    ],
    selected_offer_id: 'seed-tt-o-abat',
  },
  {
    id: 4,
    legacy_ka: 'A',
    legacy_arte: 'A',
    buyer_name: TIMETABLE_DEMO_BUYER,
    scheduled_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '00:30'),
    company_name: 'Beck GmbH & Co. KG',
    phone: '07944-91310',
    contact_name: 'Herr Beck Horst Junior',
    purpose: 'Anruf',
    notes: 'PV ab 4/26 melden / ab 3 / 26 melden kommen 2 x Transit und 1 x 18tonner',
    outcome: 'has_trucks',
    follow_up_at: null,
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [
      {
        id: 'seed-tt-o-beck',
        captured_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '09:05'),
        vehicle_type: '2× Transit, 1× 18 t',
        brand: '—',
        model: '—',
        year: null,
        mileage_km: null,
        quantity: 3,
        expected_price_eur: null,
        location: 'DE',
        notes: 'Lieferfenster 3–4/26',
      },
    ],
    selected_offer_id: 'seed-tt-o-beck',
  },
  {
    id: 5,
    legacy_ka: 'A',
    legacy_arte: 'KA',
    buyer_name: TIMETABLE_DEMO_BUYER,
    scheduled_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '00:30'),
    company_name: 'Brand Qualitätsfleisch G',
    phone: '04442-92360',
    contact_name: 'Herr Brand',
    purpose: 'Anruf',
    notes: 'PV er überlegt nächste Woche / habe 21000 geboten, er überlegt',
    outcome: 'follow_up',
    follow_up_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '17:00'),
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [],
    selected_offer_id: null,
  },
  {
    id: 6,
    legacy_ka: 'A',
    legacy_arte: 'A',
    buyer_name: TIMETABLE_DEMO_BUYER,
    scheduled_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '00:30'),
    company_name: 'CARGOTRANS GmbH & Co.',
    phone: '0231 476479-65',
    contact_name: 'Hr. Morsbach FPL',
    purpose: 'Anruf',
    notes:
      'PV macht es noch diese Woche / hat zurückgerufen, hat welche wo verkauft werden, meldet sich ab 19.03',
    outcome: 'pending',
    follow_up_at: null,
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [],
    selected_offer_id: null,
  },
  {
    id: 7,
    legacy_ka: 'A',
    legacy_arte: 'KA',
    buyer_name: TIMETABLE_DEMO_BUYER,
    scheduled_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '01:00'),
    company_name: 'AICHER Manfred Transp',
    phone: '08373 93068',
    contact_name: 'Frau Aicher',
    purpose: 'Anruf',
    notes:
      'PV NE / MD 25.03.26: Hat mich nicht vergessen. Fzg ist gerade in der Werkstatt...',
    outcome: 'pending',
    follow_up_at: null,
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [],
    selected_offer_id: null,
  },
  {
    id: 8,
    legacy_ka: 'A',
    legacy_arte: 'A',
    buyer_name: TIMETABLE_DEMO_BUYER,
    scheduled_at: toScheduledAt(SEED_PLACEHOLDER_DAY, '01:00'),
    company_name: 'ATS Schwuchow GmbH',
    phone: '0361 7898811',
    contact_name: 'Hr u. Fr Schwuchow',
    purpose: 'Anruf',
    notes:
      'PV @@09.04.26 per whatsapp / DB hat was anzubieten. Hat viel erzählt, ob was dahinter steckt...',
    outcome: 'pending',
    follow_up_at: null,
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [],
    selected_offer_id: null,
  },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function asBool(value: unknown, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (!lowered) return defaultValue;
    return ['1', 'true', 'yes', 'on'].includes(lowered);
  }
  return defaultValue;
}

function asNumberOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOutcome(value: unknown): TimetableOutcome {
  const raw = asText(value).toLowerCase();
  if (raw === 'pending' || raw === 'open') return 'pending';
  if (raw === 'no_trucks' || raw === 'no-trucks' || raw === 'none') return 'no_trucks';
  if (raw === 'follow_up' || raw === 'follow-up' || raw === 'callback') return 'follow_up';
  if (raw === 'has_trucks' || raw === 'has-trucks' || raw === 'offer') return 'has_trucks';
  return 'pending';
}

function normalizeScheduledAt(raw: unknown): string {
  const direct = asText(raw);
  if (direct && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(direct)) return direct;
  return toScheduledAt(localIsoDate(), '09:00');
}

function normalizeNegotiationRound(raw: unknown): TimetableNegotiationPriceRound | null {
  const r = asRecord(raw);
  if (!r) return null;
  const seller = asNumberOrNull(r.seller_asking_eur);
  const purchase = asNumberOrNull(r.purchase_bid_eur);
  const note = asText(r.note);
  if (seller == null && purchase == null && !note) return null;
  const id = asText(r.id) || newTruckOfferId();
  let at = asText(r.at);
  if (!at || Number.isNaN(Date.parse(at))) at = new Date().toISOString();
  const author_name = asText(r.author_name);
  return {
    id,
    at,
    seller_asking_eur: seller,
    purchase_bid_eur: purchase,
    ...(note ? { note } : {}),
    ...(author_name ? { author_name } : {}),
  };
}

function normalizeOffer(raw: unknown): TimetableTruckOffer | null {
  const r = asRecord(raw);
  if (!r) return null;
  const id = asText(r.id) || newTruckOfferId();
  const vehicle_type = asText(r.vehicle_type);
  const brand = asText(r.brand);
  const model = asText(r.model);
  const location = asText(r.location);
  const notes = asText(r.notes);
  const purchase_bid_eur = asNumberOrNull(r.purchase_bid_eur);
  const roundsRaw = r.negotiation_rounds;
  const negotiation_rounds = Array.isArray(roundsRaw)
    ? roundsRaw
        .map((item) => normalizeNegotiationRound(item))
        .filter((x): x is TimetableNegotiationPriceRound => x != null)
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    : [];
  const o: TimetableTruckOffer = {
    id,
    captured_at: normalizeScheduledAt(r.captured_at),
    vehicle_type,
    brand,
    model,
    year: asNumberOrNull(r.year),
    mileage_km: asNumberOrNull(r.mileage_km),
    quantity: asNumberOrNull(r.quantity),
    expected_price_eur: asNumberOrNull(r.expected_price_eur),
    ...(purchase_bid_eur != null ? { purchase_bid_eur } : {}),
    location,
    notes,
    ...(negotiation_rounds.length > 0 ? { negotiation_rounds } : {}),
  };
  return offerHasContent(o) ? o : null;
}

function normalizeVehicleExtrasRecord(
  raw: unknown
): Record<string, TimetableVehicleDisplayExtra> | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const out: Record<string, TimetableVehicleDisplayExtra> = {};
  for (const [k, v] of Object.entries(r)) {
    const ex = normalizeVehicleExtra(v);
    if (ex) out[k] = ex;
  }
  return Object.keys(out).length ? out : undefined;
}

function normalizeOffersFromRaw(r: Record<string, unknown>): {
  offers: TimetableTruckOffer[];
  selected_offer_id: string | null;
} {
  const selectedRaw = asText(r.selected_offer_id);
  const arrRaw = r.offers;
  let offers: TimetableTruckOffer[] = [];
  if (Array.isArray(arrRaw)) {
    for (const item of arrRaw) {
      const o = normalizeOffer(item);
      if (o) offers.push(o);
    }
  }
  const legacyOffer = r.offer;
  if (offers.length === 0 && legacyOffer !== undefined && legacyOffer !== null) {
    const o = normalizeOffer(legacyOffer);
    if (o) offers = [o];
  }
  offers = offers.map((o) => ({ ...o, id: o.id?.trim() ? o.id : newTruckOfferId() }));
  const selected_offer_id =
    offers.length === 0
      ? null
      : selectedRaw && offers.some((x) => x.id === selectedRaw)
        ? selectedRaw
        : offers[0]!.id;
  return { offers, selected_offer_id };
}

function normalizeContactPerson(raw: unknown): TimetableContactPerson | null {
  const r = asRecord(raw);
  if (!r) return null;

  const id =
    asText(r.id) ||
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));

  const legacyPhone = asText(r.phone);
  const legacyFax = asText(r.fax);

  let telefonCode = asText(r.telefonCode);
  let telefon = asText(r.telefon);
  if (!telefon && legacyPhone) {
    const sp = splitStoredPhone(legacyPhone);
    telefonCode = sp.code || '+49';
    telefon = sp.number;
  }
  if (!telefonCode) telefonCode = '+49';

  let handyCode = asText(r.handyCode);
  if (!handyCode) handyCode = '+49';
  const handy = asText(r.handy);

  let bemerkung = asText(r.bemerkung);
  if (legacyFax) {
    const faxLine = `Fax: ${legacyFax}`;
    if (!bemerkung.includes(legacyFax.trim())) {
      bemerkung = bemerkung ? `${bemerkung}\n${faxLine}` : faxLine;
    }
  }

  return {
    id,
    name: asText(r.name),
    rolle: asText(r.rolle),
    telefonCode,
    telefon,
    handyCode,
    handy,
    email: asText(r.email),
    website: asText(r.website),
    bemerkung,
  };
}

function normalizeAppointmentHistoryRow(raw: unknown): TimetableAppointmentHistoryRow | null {
  const r = asRecord(raw);
  if (!r) return null;
  return {
    date: asText(r.date) || '—',
    time: asText(r.time) || '—',
    purpose: asText(r.purpose) || '—',
    remark: asText(r.remark),
    done: asBool(r.done, false),
    initials: asText(r.initials) || '—',
  };
}

function normalizeAssignmentRow(raw: unknown): TimetableAssignmentRow | null {
  const r = asRecord(raw);
  if (!r) return null;
  const name = asText(r.name);
  if (!name) return null;
  const since = asText(r.since);
  return { name, ...(since ? { since } : {}) };
}

function normalizeActivityNoteEntry(raw: unknown, fallbackIdx: number): TimetableActivityNoteEntry | null {
  const r = asRecord(raw);
  if (!r) return null;
  const text = asText(r.text);
  if (!text) return null;
  const id =
    asText(r.id) ||
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `note-${fallbackIdx}-${Math.random().toString(36).slice(2)}`);
  let at = asText(r.at);
  if (!at || Number.isNaN(Date.parse(at))) {
    const norm = normalizeScheduledAt(r.at);
    at = Number.isNaN(Date.parse(norm)) ? toScheduledAt(localIsoDate(), '09:00') : norm;
  }
  const author_name = asText(r.author_name);
  return {
    id,
    at,
    text,
    ...(author_name ? { author_name } : {}),
  };
}

function normalizeVehicleExtra(raw: unknown): TimetableVehicleDisplayExtra | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const body_type = asText(r.body_type);
  const registration_mm_yyyy = asText(r.registration_mm_yyyy);
  const processor_name = asText(r.processor_name);
  const processor_entered = asText(r.processor_entered);
  const processor_fetched = asText(r.processor_fetched);
  const processor_negotiated = asText(r.processor_negotiated);
  const mileage_replacement_km = asNumberOrNull(r.mileage_replacement_km);
  const customer_price_eur = asNumberOrNull(r.customer_price_eur);
  const sold = asBool(r.sold, false);
  const deregistered = asBool(r.deregistered, false);
  if (
    !body_type &&
    !registration_mm_yyyy &&
    !processor_name &&
    !processor_entered &&
    !processor_fetched &&
    !processor_negotiated &&
    mileage_replacement_km == null &&
    customer_price_eur == null &&
    !sold &&
    !deregistered
  ) {
    return undefined;
  }
  return {
    ...(body_type ? { body_type } : {}),
    ...(registration_mm_yyyy ? { registration_mm_yyyy } : {}),
    ...(mileage_replacement_km != null ? { mileage_replacement_km } : {}),
    ...(sold ? { sold: true } : {}),
    ...(deregistered ? { deregistered: true } : {}),
    ...(customer_price_eur != null ? { customer_price_eur } : {}),
    ...(processor_name ? { processor_name } : {}),
    ...(processor_entered ? { processor_entered } : {}),
    ...(processor_fetched ? { processor_fetched } : {}),
    ...(processor_negotiated ? { processor_negotiated } : {}),
  };
}

function normalizeContactProfile(raw: unknown): TimetableContactProfile | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const industry = asText(r.industry);
  const address = asText(r.address);
  const customer_number = asText(r.customer_number);
  const fleet_summary = asText(r.fleet_summary);
  const activity_notes = asText(r.activity_notes);
  const purchase_confirmed = asBool(r.purchase_confirmed, false);

  const contactsRaw = r.contacts;
  const contacts = Array.isArray(contactsRaw)
    ? contactsRaw.map(normalizeContactPerson).filter((x): x is TimetableContactPerson => x != null)
    : [];

  const ahRaw = r.appointment_history;
  const appointment_history = Array.isArray(ahRaw)
    ? ahRaw.map(normalizeAppointmentHistoryRow).filter((x): x is TimetableAppointmentHistoryRow => x != null)
    : [];

  const asgRaw = r.assignment_history;
  const assignment_history = Array.isArray(asgRaw)
    ? asgRaw.map(normalizeAssignmentRow).filter((x): x is TimetableAssignmentRow => x != null)
    : [];

  const logRaw = r.activity_notes_log;
  const activity_notes_log = Array.isArray(logRaw)
    ? logRaw
        .map((item, i) => normalizeActivityNoteEntry(item, i))
        .filter((x): x is TimetableActivityNoteEntry => x != null)
    : [];

  const vehicle_extra = normalizeVehicleExtra(r.vehicle_extra);
  const vehicle_extras = normalizeVehicleExtrasRecord(r.vehicle_extras);

  const overview_kunde =
    r.overview_kunde !== undefined && r.overview_kunde !== null
      ? normalizeTimetableOverviewKunde(r.overview_kunde)
      : undefined;

  const zustaendige_person = asText(r.zustaendige_person);

  const profile: TimetableContactProfile = {
    ...(industry ? { industry } : {}),
    ...(address ? { address } : {}),
    ...(customer_number ? { customer_number } : {}),
    ...(fleet_summary ? { fleet_summary } : {}),
    ...(contacts.length ? { contacts } : {}),
    ...(assignment_history.length ? { assignment_history } : {}),
    ...(appointment_history.length ? { appointment_history } : {}),
    ...(activity_notes ? { activity_notes } : {}),
    ...(activity_notes_log.length ? { activity_notes_log } : {}),
    ...(vehicle_extra ? { vehicle_extra } : {}),
    ...(vehicle_extras ? { vehicle_extras } : {}),
    ...(purchase_confirmed ? { purchase_confirmed: true } : {}),
    ...(overview_kunde ? { overview_kunde } : {}),
    ...(zustaendige_person ? { zustaendige_person } : {}),
  };

  return Object.keys(profile).length > 0 ? profile : undefined;
}

function normalizeLegacyEntry(raw: Record<string, unknown>, fallbackId: number): TimetableEntry {
  const legacyDate = asText(raw.datum) || localIsoDate();
  const legacyTime = asText(raw.zeit) || '09:00';
  const kaArt = asText(raw.kaArt).toUpperCase();
  const hasFollowUp = asBool(raw.hasFollowUp, false);
  const erledigt = asBool(raw.erledigt, false);
  const outcome: TimetableOutcome = hasFollowUp
    ? 'follow_up'
    : kaArt === 'KA'
      ? 'has_trucks'
      : erledigt
        ? 'no_trucks'
        : 'pending';

  return {
    id: asNumberOrNull(raw.id) ?? fallbackId,
    buyer_name: asText(raw.vp || raw.buyer_name || 'ES').toUpperCase(),
    scheduled_at: toScheduledAt(legacyDate, legacyTime),
    company_name: asText(raw.firmenname || raw.company_name || 'Unknown company'),
    phone: asText(raw.telefon || raw.phone),
    contact_name: asText(raw.ansprechpartner || raw.contact_name),
    purpose: asText(raw.zweck || raw.purpose || 'Outbound call'),
    notes: asText(raw.bemerkung || raw.notes),
    outcome,
    follow_up_at: hasFollowUp ? normalizeScheduledAt(raw.follow_up_at || toScheduledAt(legacyDate, '15:00')) : null,
    is_completed: outcome === 'no_trucks' ? true : erledigt,
    is_parked: asBool(raw.parked || raw.is_parked, false),
    last_called_at:
      erledigt || hasFollowUp
        ? normalizeScheduledAt(raw.last_called_at || toScheduledAt(legacyDate, legacyTime))
        : null,
    offers: [],
    selected_offer_id: null,
  };
}

function normalizeEntry(raw: unknown, fallbackId: number): TimetableEntry | null {
  const r = asRecord(raw);
  if (!r) return null;

  if (r.datum || r.zeit || r.firmenname || r.ansprechpartner || r.telefon || r.kaArt) {
    return normalizeLegacyEntry(r, fallbackId);
  }

  const id = asNumberOrNull(r.id) ?? fallbackId;
  const outcome = normalizeOutcome(r.outcome);
  const legacyKa = asText(r.legacy_ka);
  const legacyArte = asText(r.legacy_arte);
  const { offers, selected_offer_id } = normalizeOffersFromRaw(r);
  let contact_profile = normalizeContactProfile(r.contact_profile);
  const vexEmpty =
    !contact_profile?.vehicle_extras || Object.keys(contact_profile.vehicle_extras).length === 0;
  if (contact_profile?.vehicle_extra && vexEmpty && offers[0]) {
    const firstId = offers[0].id;
    const { vehicle_extra, ...rest } = contact_profile;
    contact_profile = { ...rest, vehicle_extras: { [firstId]: vehicle_extra } };
  }
  return {
    id,
    ...(legacyKa ? { legacy_ka: legacyKa } : {}),
    ...(legacyArte ? { legacy_arte: legacyArte } : {}),
    ...(contact_profile && Object.keys(contact_profile).length ? { contact_profile } : {}),
    buyer_name: asText(r.buyer_name || 'ES').toUpperCase(),
    scheduled_at: normalizeScheduledAt(r.scheduled_at),
    company_name: asText(r.company_name || 'Unknown company'),
    phone: asText(r.phone),
    contact_name: asText(r.contact_name),
    purpose: asText(r.purpose || 'Outbound call'),
    notes: asText(r.notes),
    outcome,
    follow_up_at: asText(r.follow_up_at) ? normalizeScheduledAt(r.follow_up_at) : null,
    is_completed: asBool(r.is_completed, outcome === 'no_trucks'),
    is_parked: asBool(r.is_parked, false),
    last_called_at: asText(r.last_called_at) ? normalizeScheduledAt(r.last_called_at) : null,
    offers,
    selected_offer_id,
  };
}

function fallbackState(): TimetableDbState {
  const entries = demoSeedsForDay(localIsoDate(), 1);
  return {
    entries,
    nextId: entries.length + 1,
  };
}

export function loadTimetableDb(): TimetableDbState {
  try {
    const rawCurrent = localStorage.getItem(STORAGE_KEY);
    const rawLegacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    const raw = rawCurrent || rawLegacy;
    if (!raw) return fallbackState();

    const parsed = JSON.parse(raw) as { entries?: unknown; nextId?: unknown };
    const entriesRaw = Array.isArray(parsed.entries) ? parsed.entries : [];
    const normalized = entriesRaw
      .map((entry, index) => normalizeEntry(entry, index + 1))
      .filter((entry): entry is TimetableEntry => entry != null);
    if (normalized.length === 0) return fallbackState();

    const parsedNext = asNumberOrNull(parsed.nextId);
    const nextId = parsedNext && parsedNext > 0 ? parsedNext : Math.max(...normalized.map((e) => e.id)) + 1;
    return ensureSharedDemoTimetableRows({ entries: normalized, nextId });
  } catch {
    return fallbackState();
  }
}

export function saveTimetableDb(state: TimetableDbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function upsertTimetableEntry(state: TimetableDbState, entry: TimetableEntry): TimetableDbState {
  const idx = state.entries.findIndex((e) => e.id === entry.id);
  if (idx === -1) return { ...state, entries: [...state.entries, entry] };
  const nextEntries = state.entries.slice();
  nextEntries[idx] = entry;
  return { ...state, entries: nextEntries };
}

export function addTimetableEntries(state: TimetableDbState, newOnes: Omit<TimetableEntry, 'id'>[]): TimetableDbState {
  let nextId = state.nextId;
  const added: TimetableEntry[] = newOnes.map((entry) => {
    const id = nextId++;
    return { ...entry, id };
  });
  return {
    entries: [...state.entries, ...added],
    nextId,
  };
}

export function createDraftTimetableEntry(buyerName: string): Omit<TimetableEntry, 'id'> {
  const now = new Date();
  const date = localIsoDate(now);
  const hh = String(Math.max(8, now.getHours())).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return {
    buyer_name: buyerName.trim().toUpperCase() || 'ES',
    scheduled_at: toScheduledAt(date, `${hh}:${mm}`),
    company_name: '',
    phone: '',
    contact_name: '',
    purpose: '',
    notes: '',
    outcome: 'pending',
    follow_up_at: null,
    is_completed: false,
    is_parked: false,
    last_called_at: null,
    offers: [],
    selected_offer_id: null,
  };
}

/** Inserts five empty draft rows at staggered times (legacy “5 Termine einfügen”). */
export function insertFiveDraftTimetableRows(
  state: TimetableDbState,
  buyerName: string,
  dateIso: string
): TimetableDbState {
  const base = createDraftTimetableEntry(buyerName);
  const slots = ['08:00', '08:30', '09:00', '09:30', '10:00'];
  const drafts: Omit<TimetableEntry, 'id'>[] = slots.map((hm) => ({
    ...base,
    buyer_name: buyerName.trim().toUpperCase() || 'ES',
    scheduled_at: toScheduledAt(dateIso, hm),
    purpose: '',
  }));
  return addTimetableEntries(state, drafts);
}

export function nowIsoDateTime(): string {
  return localIsoDateTime();
}

export function timetableRowIsMine(row: TimetableEntry, viewerCode: string): boolean {
  const v = viewerCode.trim().toUpperCase();
  return row.buyer_name === v || row.buyer_name === TIMETABLE_DEMO_BUYER;
}

export function timetableRowIsOtherBuyer(row: TimetableEntry, viewerCode: string): boolean {
  return !timetableRowIsMine(row, viewerCode);
}
