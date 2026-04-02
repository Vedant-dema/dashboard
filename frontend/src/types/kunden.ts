/** Last VAT (VIES) check stored on the customer when saving from the New/Edit customer modal. */
export interface ViesCustomerSnapshot {
  valid: boolean;
  country_code: string;
  vat_number: string;
  name: string | null;
  address: string | null;
  request_date?: string | null;
  request_identifier?: string | null;
  trader_details_available?: boolean;
  trader_name_match?: string | null;
  trader_street_match?: string | null;
  trader_postal_code_match?: string | null;
  trader_city_match?: string | null;
  trader_company_type_match?: string | null;
  /** ISO timestamp when this snapshot was written at save time */
  saved_at: string;
}

/** Full address entry captured in the customer modal (multi-address capable). */
export interface KundenAdresse {
  id: string;
  typ: string;
  strasse: string;
  plz: string;
  ort: string;
  land_code: string;
  art_land_code: string;
  ust_id_nr: string;
  steuer_nr: string;
  branchen_nr: string;
}

/** Full contact entry captured in the customer modal (multi-contact capable). */
export interface KundenKontakt {
  id: string;
  name: string;
  rolle: string;
  telefonCode: string;
  telefon: string;
  handyCode: string;
  handy: string;
  email: string;
  /** Contact-level website (DB `contacts.website`). */
  website?: string;
  bemerkung: string;
}

/**
 * Master customer – one row per company/person (`kunden` table).
 * Shared by Sales, Purchase, Werkstatt; Waschanlage uses the same row + `KundenWashStamm`.
 */
export interface KundenStamm {
  id: number;
  kunden_nr: string;

  customer_type?: "legal_entity" | "natural_person";
  status?: "active" | "inactive" | "blocked";

  branche?: string;
  fzg_haendler?: boolean;
  juristische_person?: boolean;
  natuerliche_person?: boolean;
  gesellschaftsform?: string;
  ansprache?: string;
  firmenvorsatz?: string;
  firmenname: string;
  first_name?: string;
  last_name?: string;
  profile_notes?: string;
  /** How the customer was acquired: referral | website | email | call (empty = unset). */
  acquisition_source?: string;
  /** Name of the specific referrer, site, campaign, etc. (optional; pairs with acquisition_source). */
  acquisition_source_entity?: string;
  acquisition_date?: string;
  lifecycle_stage?: "lead" | "qualified" | "active" | "inactive" | "vip" | "lost";
  preferred_channel?: "email" | "phone" | "sms" | "whatsapp" | "mixed" | "none";
  segment?: string;
  score?: number;
  consent_email?: boolean;
  consent_sms?: boolean;
  consent_phone?: boolean;
  marketing_notes?: string;
  customer_role?: "supplier" | "buyer" | "workshop" | "wash";
  role_valid_from?: string;
  role_valid_to?: string;
  bemerkungen?: string;
  /** Pfad/UNC zu Kundenunterlagen (wie Legacy „Unterlagen“ + Ordner-Icon). */
  unterlagen_pfad?: string;
  /** Anzeigename bis API für Mitarbeiter-ID existiert. */
  zustaendige_person_name?: string;
  zustaendige_person_id?: number | null;

  strasse?: string;
  plz?: string;
  ort?: string;
  land_code?: string;
  art_land_code?: string;
  ust_id_nr?: string;
  steuer_nr?: string;
  branchen_nr?: string;
  tax_country_type_code?: string;
  account_number?: string;
  credit_limit?: number;
  billing_name?: string;
  billing_street?: string;
  billing_postal_code?: string;
  billing_city?: string;
  payment_blocked?: boolean;
  bank_name?: string;
  bic?: string;
  iban?: string;
  direct_debit_enabled?: boolean;
  financial_notes?: string;
  ansprechpartner?: string;
  /** Role / job title of the primary contact person (e.g. Geschäftsführer, Disponent). */
  rolle_kontakt?: string;
  telefonnummer?: string;
  faxnummer?: string;
  email?: string;
  internet_adr?: string;
  bemerkungen_kontakt?: string;
  faxen_flag?: boolean;

  art_kunde?: string;
  /** Main booking account (Art/Buchungskonto) */
  buchungskonto_haupt?: string;

  aufnahme?: string;
  created_at?: string;
  updated_at?: string;
  /** Soft-delete flag — customer is hidden from main list but not permanently removed. */
  deleted?: boolean;
  /** ISO timestamp of when the customer was marked for deletion. */
  deleted_at?: string;

  /** Audit: full name of the user who created this record. */
  created_by_name?: string;
  /** Audit: email of the user who created this record. */
  created_by_email?: string;
  /** Audit: full name of the user who last saved/modified this record. */
  last_edited_by_name?: string;
  /** Audit: email of the user who last saved/modified this record. */
  last_edited_by_email?: string;

  /** Last VIES VAT check outcome and trader fields (persisted with save). */
  vies_snapshot?: ViesCustomerSnapshot | null;
  /** Full modal addresses (multi-entry); top-level address fields remain primary summary. */
  adressen?: KundenAdresse[];
  /** Full modal contacts (multi-entry); top-level contact fields remain primary summary. */
  kontakte?: KundenKontakt[];
}

/** Waschanlage-specific profile (`kunden_wash` table), 1:1 with `kunden.id`. */
export interface KundenWashStamm {
  id: number;
  kunden_id: number;
  bukto?: string;
  limit_betrag?: number;
  rechnung_zusatz?: string;
  rechnung_plz?: string;
  rechnung_ort?: string;
  rechnung_strasse?: string;
  kunde_gesperrt?: boolean;
  bankname?: string;
  bic?: string;
  iban?: string;
  wichtige_infos?: string;
  bemerkungen?: string;
  lastschrift?: boolean;
  /** Kennzeichen / Fuhrpark-Bezug (Waschanlage) */
  kennzeichen?: string;
  /** z. B. PKW, LKW, Transporter */
  wasch_fahrzeug_typ?: string;
  /** Standardprogramm, Tarif */
  wasch_programm?: string;
  /** Optional netto price for selected wash program */
  netto_preis?: number;
  /** Optional brutto price for selected wash program */
  brutto_preis?: number;
  /** z. B. wöchentlich, bei Bedarf */
  wasch_intervall?: string;
  created_at?: string;
  updated_at?: string;
}

export type KundenRolleCode = "LIEFERANT" | "KAUFER" | "WERKSTATT";

export interface KundenRolleRow {
  id: number;
  kunden_id: number;
  rolle: KundenRolleCode;
  gueltig_ab?: string | null;
  gueltig_bis?: string | null;
}

/** Appointment linked to a customer. */
export interface KundenTermin {
  id: number;
  kunden_id: number;
  datum: string;       // ISO date YYYY-MM-DD
  zeit: string;        // HH:MM
  zweck: string;
  erledigt: boolean;
  created_at?: string;
}

/** Relationship between two customers (e.g. parent company, branch, sister site). */
export interface KundenBeziehung {
  id: number;
  kunden_id: number;
  verknuepfter_kunden_id: number;
  art: string;
  created_at?: string;
}

/**
 * Risk-analysis profile per customer — tracks document expiry dates.
 * All date fields are ISO `YYYY-MM-DD` strings (nullable).
 * A date stored here is treated as the *expiry / valid-until* date for that document.
 */
export interface KundenRisikoanalyse {
  id: number;
  kunden_id: number;
  /** Allgemeiner Dokumentenbogen — submitted flag */
  allg_dok_bogen?: boolean;
  /** Registerauszug — valid-until / renewal-due date */
  reg_ausz?: string;
  /** Wirtschaftsberichts-Ermächtigung — valid-until date */
  wirt_ber_erm?: string;
  /** Ausweis-Kopie + Wirtschaftsbericht — valid-until date */
  ausw_kop_wirt_ber?: string;
  /** Ausweis gültig bis — direct ID expiry date */
  ausw_gueltig_bis?: string;
  /** Ausweis-Kopie Abholer — valid-until date */
  ausw_kop_abholer?: string;
  /** Verständigungs-Dokumentenbogen — submitted flag */
  verst_dok_bogen?: boolean;
  /** Responsible staff initials / name */
  bearbeiter?: string;
  created_at?: string;
  updated_at?: string;
}

/** One changed field recorded inside a history entry. */
export interface KundenFieldChange {
  /** The KundenStamm field key, e.g. "firmenname" */
  field: string;
  /** Human-readable label key (maps to i18n) */
  labelKey: string;
  from: string;
  to: string;
}

/** One entry in the change-history log for a customer. */
export interface KundenHistoryEntry {
  id: number;
  kunden_id: number;
  /** ISO timestamp of when the action occurred. */
  timestamp: string;
  action: "created" | "updated" | "deleted" | "restored";
  editor_name?: string;
  editor_email?: string;
  /** Field-level diff — only present for "updated" entries. */
  changes?: KundenFieldChange[];
}

/** Vom Kunden hochgeladene Datei (Demo: als Data-URL in localStorage). */
export interface KundenUnterlage {
  id: number;
  kunden_id: number;
  name: string;
  size: number;
  mime_type: string;
  uploaded_at: string;
  data_url: string;
}

export interface KundenDetailWithWash {
  kunden: KundenStamm;
  kunden_wash?: KundenWashStamm | null;
  rollen?: KundenRolleRow[];
}

/** Persisted bundle (browser localStorage until API exists). */
export interface KundenDbState {
  version: 1;
  kunden: KundenStamm[];
  kundenWash: KundenWashStamm[];
  rollen: KundenRolleRow[];
  /** Hochgeladene Kundenunterlagen (pro kunden.id) */
  unterlagen: KundenUnterlage[];
  termine: KundenTermin[];
  beziehungen: KundenBeziehung[];
  /** Risk-analysis / document-expiry records (1 row per kunden.id) */
  risikoanalysen: KundenRisikoanalyse[];
  /** Full change-history log (one entry per save/delete/restore action). */
  history: KundenHistoryEntry[];
  nextKundeId: number;
  nextWashId: number;
  nextRolleId: number;
  nextUnterlageId: number;
  nextTerminId: number;
  nextBeziehungId: number;
  nextRisikoanalyseId: number;
  nextHistoryId: number;
}
