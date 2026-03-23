/**
 * Master customer – one row per company/person (`kunden` table).
 * Shared by Sales, Purchase, Werkstatt; Waschanlage uses the same row + `KundenWashStamm`.
 */
export interface KundenStamm {
  id: number;
  kunden_nr: string;

  branche?: string;
  fzg_haendler?: boolean;
  juristische_person?: boolean;
  natuerliche_person?: boolean;
  gesellschaftsform?: string;
  ansprache?: string;
  firmenvorsatz?: string;
  firmenname: string;
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
  ansprechpartner?: string;
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
  nextKundeId: number;
  nextWashId: number;
  nextRolleId: number;
  nextUnterlageId: number;
}
