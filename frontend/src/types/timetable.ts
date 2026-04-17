import type { KontaktEntry } from '../features/customers/mappers/customerFormMapper';

export type TimetableOutcome = 'pending' | 'no_trucks' | 'follow_up' | 'has_trucks';

export type TimetableFilterMode =
  | 'all_day'
  | 'open'
  | 'open_other_buyer'
  | 'other_buyer_range'
  | 'follow_up'
  | 'offers'
  | 'completed'
  | 'completed_no_followup'
  | 'parked';

/** Same fields as customer modal `KontaktEntry` / `KundenKontakt` for future CRM sync. */
export type TimetableContactPerson = KontaktEntry;

/** One saved price pair from a call/visit (purchasing bid vs seller asking). */
export interface TimetableNegotiationPriceRound {
  id: string;
  /** ISO 8601 when this round was recorded. */
  at: string;
  /** Who saved the round (display only). */
  author_name?: string;
  /** Seller/customer asking price (EUR). */
  seller_asking_eur: number | null;
  /** Purchasing (DEMA) bid (EUR). */
  purchase_bid_eur: number | null;
  note?: string;
}

export interface TimetableTruckOffer {
  /** Stable id for multi-offer rows (per vehicle / offer slot). */
  id: string;
  captured_at: string;
  vehicle_type: string;
  brand: string;
  model: string;
  year: number | null;
  mileage_km: number | null;
  quantity: number | null;
  expected_price_eur: number | null;
  /** Latest purchasing bid (EUR); snapshotted into `negotiation_rounds` when recording. */
  purchase_bid_eur?: number | null;
  /** Inbound purchase lane (DEMA acquires) — mutually exclusive with `verkauft` in UI. */
  gekauft?: boolean;
  /** Outbound disposal to another company — mutually exclusive with `gekauft` in UI. */
  verkauft?: boolean;
  location: string;
  notes: string;
  /** Chronological record of quoted prices for follow-up calls on the same vehicle. */
  negotiation_rounds?: TimetableNegotiationPriceRound[];
  /** Client-sent photos / PDFs for this vehicle slot (per tab in the offer workspace). */
  vehicle_unterlagen?: TimetableContactUnterlage[];
}

/** One row in “weitere Termine Kunde”. */
export interface TimetableAppointmentHistoryRow {
  date: string;
  time: string;
  purpose: string;
  remark: string;
  done: boolean;
  initials: string;
}

export interface TimetableAssignmentRow {
  name: string;
  since?: string;
}

/** UI-only vehicle fields beyond `offer` (body, flags, customer price). */
export interface TimetableVehicleDisplayExtra {
  body_type?: string;
  registration_mm_yyyy?: string;
  mileage_replacement_km?: number | null;
  sold?: boolean;
  deregistered?: boolean;
  customer_price_eur?: number | null;
  /** Legacy single processor label (fallback). */
  processor_name?: string;
  /** Legacy Kundenkontakt — who entered / fetched / negotiated the offer. */
  processor_entered?: string;
  processor_fetched?: string;
  processor_negotiated?: string;
}

/** One address row inside timetable overview “Stammdaten” (mirrors customer modal address card). */
export interface TimetableOverviewAdresseDraft {
  id: string;
  typ: string;
  strasse: string;
  plz: string;
  ort: string;
  land_code: string;
  art_land_code: string;
  ust_id_nr: string;
  steuer_nr: string;
}

/** Customer & Address–style fields for the timetable contact drawer overview (frontend draft; persists on row). */
export interface TimetableOverviewKundeDraft {
  kunden_nr: string;
  customer_type: '' | 'legal_entity' | 'natural_person';
  customer_status: 'active' | 'inactive' | 'blocked';
  branche: string;
  fzgHandel: '' | 'ja' | 'nein';
  gesellschaftsform: string;
  acquisition_source: '' | 'referral' | 'website' | 'email' | 'call';
  acquisition_source_entity: string;
  profile_notes: string;
  operative_notes: string;
  firmenvorsatz: string;
  firmenname: string;
  website: string;
  /** UI-only worldwide address search (no external API in timetable drawer). */
  addr_search_query: string;
  /** Index into `adressen` for the nested address card. */
  active_adresse_idx: number;
  adressen: TimetableOverviewAdresseDraft[];
}

/** File attached from the timetable contact drawer when the row is not linked to a CRM customer (stored on the row). */
export interface TimetableContactUnterlage {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  data_url: string;
}

/** One dated remark in the correspondence / Bemerkungen thread (chat-style log). */
export interface TimetableActivityNoteEntry {
  id: string;
  /** ISO 8601 (e.g. from `Date.toISOString()`). */
  at: string;
  text: string;
  /** Display name of the user who added the line (optional for legacy/imported rows). */
  author_name?: string;
}

/** Rich CRM-style context for the customer-contact drawer (optional per row). */
export interface TimetableContactProfile {
  industry?: string;
  address?: string;
  customer_number?: string;
  fleet_summary?: string;
  contacts?: TimetableContactPerson[];
  assignment_history?: TimetableAssignmentRow[];
  appointment_history?: TimetableAppointmentHistoryRow[];
  /** Long-form correspondence (legacy single block — migrated to `activity_notes_log` in UI). */
  activity_notes?: string;
  /** Dated correspondence lines (preferred; shown as chat bubbles with timestamps). */
  activity_notes_log?: TimetableActivityNoteEntry[];
  vehicle_extra?: TimetableVehicleDisplayExtra;
  /** Per-offer vehicle display fields (key = `TimetableTruckOffer.id`). */
  vehicle_extras?: Record<string, TimetableVehicleDisplayExtra>;
  /** Purchase confirmation tick (legacy Kaufbestätigung). */
  purchase_confirmed?: boolean;
  /** Extended “Customer & Address” overview (Kalender drawer). */
  overview_kunde?: TimetableOverviewKundeDraft;
  /** Row-level uploads when no matching customer exists in the CRM DB (demo: data URLs on the timetable entry). */
  timetable_unterlagen?: TimetableContactUnterlage[];
  /** Responsible person (Zuständige) — UI draft on timetable row, no backend. */
  zustaendige_person?: string;
}

/** Frontend timetable row for purchase outbound calls. */
export interface TimetableEntry {
  id: number;
  /** Legacy Termin-Kalender “Ka” column; defaults to A in the table when omitted. */
  legacy_ka?: string;
  /** Legacy “arte” column (KA / A); when omitted, table derives from outcome / offer. */
  legacy_arte?: string;
  buyer_name: string;
  scheduled_at: string;
  company_name: string;
  phone: string;
  contact_name: string;
  purpose: string;
  notes: string;
  outcome: TimetableOutcome;
  follow_up_at: string | null;
  is_completed: boolean;
  is_parked: boolean;
  last_called_at: string | null;
  /** One or more vehicle / offer slots for this row. */
  offers: TimetableTruckOffer[];
  /** Which offer slot the drawer generator and minimal form edit (`offers` id). */
  selected_offer_id: string | null;
  contact_profile?: TimetableContactProfile;
}

export interface TimetableDbState {
  entries: TimetableEntry[];
  nextId: number;
}

export interface TimetableCallLogInput {
  outcome: TimetableOutcome;
  note_append: string;
  follow_up_at: string | null;
}

export interface TimetableOfferInput {
  vehicle_type: string;
  brand: string;
  model: string;
  year: number | null;
  mileage_km: number | null;
  quantity: number | null;
  expected_price_eur: number | null;
  purchase_bid_eur: number | null;
  /** Optional; omitted preserves existing offer flags on merge. */
  gekauft?: boolean;
  verkauft?: boolean;
  location: string;
  notes: string;
}
