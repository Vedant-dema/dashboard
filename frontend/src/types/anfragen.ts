/** Customer inquiry (legacy „ANFRAGE“ / „ANFRAGEN“). */
export interface AnfrageStamm {
  id: number;
  /** Anzeige z. B. „160“ */
  anfrage_nr: string;
  anfrage_datum: string;
  fahrzeugart: string;
  aufbauart: string;
  fabrikat: string;
  typ: string;
  extras: string;
  /** max. Preis (Spalte „max Preis“) */
  max_preis: number;
  debitor_nr: string;
  firmenname: string;
  /** Sachbearbeiter-Kürzel (Spalte SB) */
  bearbeiter_sb: string;

  debitor_anzeige?: string;
  bearbeiter_name?: string;
  bemerkungen?: string;
  kundendaten?: string;
  extras_sidebar?: string;

  zul_gg_von?: string;
  zul_gg_bis?: string;
  ez_von?: string;
  ez_bis?: string;
  max_alter?: string;
  ps_von?: string;
  ps_bis?: string;
  max_kilometer?: string;
  preis_von?: string;
  preis_bis?: string;
}

export interface AnfragenDbState {
  version: 1;
  anfragen: AnfrageStamm[];
  nextId: number;
}

export type NewAnfragePayload = Omit<AnfrageStamm, "id" | "anfrage_nr">;
