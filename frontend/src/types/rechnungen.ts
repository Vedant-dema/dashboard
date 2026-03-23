/** Zeile der Legacy-Liste „RECHNUNGEN“. */
export interface RechnungListRow {
  id: number;
  rechn_nr: string;
  r_datum: string;
  kunden_nr: string;
  firmenname: string;
  land: string;
  plz: string;
  ort: string;
  art: string;
  buchung: string;
  bezahlt_am: string;
  ersteller: string;
  verkaufer: string;
  /** Betrag in Cent (Anzeige als EUR). */
  betrag_cent: number;
  vermerk: string;
  ust_id: string;
  positions_nr: string;
  fahrgestell_nr: string;
  verkaufs_nr: string;
  rechnung_erstellt_von: string;
  nicht_erledigt: boolean;
  bh_check: boolean;
  nicht_abgeholt: boolean;
}

export interface RechnungenDbState {
  version: 1;
  rows: RechnungListRow[];
  nextId: number;
}
