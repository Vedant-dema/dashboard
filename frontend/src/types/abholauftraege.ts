/** Pickup order list row (legacy „ABHOLAUFTRÄGE“ / Abholliste). */
export interface AbholauftragRow {
  id: number;
  erledigt: boolean;
  erstellt_datum: string;
  abholbereit_datum: string;
  /** Freitext wie im Legacy: PLZ Ort, Straße (Firma) */
  kunde_anzeige: string;
  fahrzeugart: string;
  fabrikat: string;
  typ: string;
  aufbauart: string;
  fahrgestellnummer: string;
  fahrgestellnummer_2?: string;
}

export interface AbholauftraegeDbState {
  version: 1;
  rows: AbholauftragRow[];
}
