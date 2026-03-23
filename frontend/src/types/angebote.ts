/** Vehicle offer row (legacy „ANGEBOT“ / „ANGEBOTE“). */
export interface AngebotStamm {
  id: number;
  angebot_nr: string;
  angebot_datum: string;
  abgabetermin?: string;
  fahrzeugart: string;
  fabrikat: string;
  /** Modell / Typ (Hauptfeld) */
  typ: string;
  modellreihe?: string;
  aufbauart: string;
  /** Erstzulassung (ISO Datum oder leer) */
  ez: string;
  fahrgestellnummer?: string;
  preis: number;
  verkauft: boolean;
  anbieten: boolean;
  gekauft?: boolean;
  /** Legacy „Anbieter“ */
  abgebieter?: string;
  plz: string;
  ort: string;
  firmenname: string;
  termin: string;
  eingetragen?: string;
  eingeholt?: string;
  verhandelt?: string;
  land_code?: string;

  abgemeldet?: boolean;
  bemerkungen?: string;

  kw?: string;
  ps?: string;
  km_stand_gesamt?: string;
  km_stand_atm?: string;
  bereifung_pct?: string;
  allgemeiner_zustand?: string;
  zul_gesamtgewicht_kg?: string;
  leergewicht_kg?: string;
  preisvorstellung_kunde?: string;
  preisvorstellung_dema?: string;

  preis_datum_1?: string;
  preis_datum_2?: string;
  preis_datum_3?: string;
  preis_dema_1?: number;
  preis_dema_2?: number;
  preis_dema_3?: number;
  preis_kunde_1?: number;
  preis_kunde_2?: number;
  preis_kunde_3?: number;

  /** Freitext „Extras“ */
  extras?: string;
  /** Demo: angehängte Bild-Dateinamen oder Ordnerhinweis */
  bilder_liste?: string;
}

export interface AngeboteDbState {
  version: 1;
  angebote: AngebotStamm[];
  nextId: number;
}

/** Payload when creating an offer (IDs vergeben beim Speichern). */
export type NewAngebotPayload = Omit<AngebotStamm, "id" | "angebot_nr">;
