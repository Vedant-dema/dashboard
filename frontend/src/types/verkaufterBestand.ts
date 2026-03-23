/** Sold inventory search row (legacy „Suche verkaufter Bestand“). */
export interface VerkaufterBestandRow {
  id: number;
  position_anzeige: string;
  verkauf_datum: string;
  kauf_datum: string;
  fahrzeugart: string;
  fabrikat: string;
  typ: string;
  aufbauart: string;
  ez: string;
  fahrgestellnummer: string;
  debitor_nr: string;
  firmenname: string;
  plz: string;
  ort: string;
  land: string;
  einkaeufer: string;

  linkaeufer?: string;
  beteiligter?: string;
  verkaeufer?: string;
  telefonnummer?: string;
  extras?: string;
  import_verkaufs_nr?: string;

  fehlende_kosten?: boolean;
  kein_abholer?: boolean;
  kein_kaeufer?: boolean;
  keine_erstkontrolle?: boolean;
  kein_auftrag_erteilt?: boolean;
  auftrag_erledigt?: boolean;
  reinigung_offen?: boolean;
  offene_auftraege?: boolean;
  kein_eingang?: boolean;
  verkauf_check?: boolean;
  abgeholt?: boolean;
  bh_check?: boolean;
}

export interface VerkaufterBestandDbState {
  version: 1;
  rows: VerkaufterBestandRow[];
}
