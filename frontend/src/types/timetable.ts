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

export interface TimetableTruckOffer {
  captured_at: string;
  vehicle_type: string;
  brand: string;
  model: string;
  year: number | null;
  mileage_km: number | null;
  quantity: number | null;
  expected_price_eur: number | null;
  location: string;
  notes: string;
}

/** Extra person lines in the legacy Kundenkontakt header. */
export interface TimetableContactPerson {
  name: string;
  phone?: string;
  fax?: string;
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

/** Rich CRM-style context for the customer-contact drawer (optional per row). */
export interface TimetableContactProfile {
  industry?: string;
  address?: string;
  customer_number?: string;
  fleet_summary?: string;
  contacts?: TimetableContactPerson[];
  assignment_history?: TimetableAssignmentRow[];
  appointment_history?: TimetableAppointmentHistoryRow[];
  /** Long-form correspondence (legacy right-hand Bemerkung pane). */
  activity_notes?: string;
  vehicle_extra?: TimetableVehicleDisplayExtra;
  /** Purchase confirmation tick (legacy Kaufbestätigung). */
  purchase_confirmed?: boolean;
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
  offer: TimetableTruckOffer | null;
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
  location: string;
  notes: string;
}
