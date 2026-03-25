/** Active vehicle inventory (BESTAND) — mirrors the legacy E_Bestand view. */
export interface BestandRow {
  id: number;
  positions_nr: string;        // e.g. "19252"
  kaufdatum: string;           // ISO date "YYYY-MM-DD"
  fahrzeugart: string;         // LKW | Auflieger | Anhänger | Wechselbrücke | Sonstige
  aufbau_art: string;          // SZM | Kühlkoffer | Getränkeaufbau | Pritsche/Plane | Koffer | Kipper | Sonstige | …
  fabrikat: string;            // MAN | MB | DAF | IVECO | SCANIA | Schmitz | Krone | …
  modellreihe?: string;        // e.g. "TGX", "Actros"
  typ: string;                 // e.g. "TGX 18.470", "Actros 2543"
  ez?: string;                 // Erstzulassung "MM-YYYY"
  fahrgestellnummer: string;
  kw?: number;
  ps?: number;
  km_stand?: number;
  letzte_kz?: string;          // last registration plate
  standtage?: number;          // days on lot
  einkaeufer?: string;         // buyer code / name
  // Kreditor / customer
  kreditor_nr?: string;
  firmenname?: string;
  plz?: string;
  ort?: string;
  land?: string;
  telefonnummer?: string;
  beteiligter?: string;
  // Reservation
  reserviert?: boolean;
  reserviert_name?: string;
  reserviert_bis?: string;     // ISO date
  reserviert_preis?: number;
  // Status
  angezahlt?: boolean;
  angefragt?: boolean;
  angefragt_von?: string;
  angefragt_bis?: string;
  import_nr?: string;
  in_mobile?: boolean;         // listed on Mobile.de
  in_aufbereitung?: boolean;   // currently being prepared/detailed
  im_vorfeld?: boolean;        // incoming / pre-purchase
  // Flags
  kein_abholer?: boolean;
  kein_kaeufer?: boolean;
  bh_check?: boolean;
  fehlende_kosten?: boolean;
  keine_erstkontrolle?: boolean;
  auftrag_erledigt?: boolean;
  reinigung_offen?: boolean;
  offene_auftraege?: boolean;
  kein_eingang?: boolean;
  // Keys
  hauptschluessel?: boolean;
  ersatzschluessel?: boolean;
  bemerkung_verkauf?: string;
  bemerkung_werkstatt?: string;
}

export interface BestandDbState {
  version: 1;
  rows: BestandRow[];
}
