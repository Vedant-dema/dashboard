import type { VerkaufterBestandDbState, VerkaufterBestandRow } from "../types/verkaufterBestand";

const STORAGE_KEY = "dema-verkaufter-bestand-db";

function seed(): VerkaufterBestandDbState {
  const rows: VerkaufterBestandRow[] = [
    {
      id: 1,
      position_anzeige: "1842",
      verkauf_datum: "2026-03-10",
      kauf_datum: "2026-02-28",
      fahrzeugart: "LKW",
      fabrikat: "MAN",
      typ: "TGX 18.470",
      aufbauart: "SZM",
      ez: "2018-06",
      fahrgestellnummer: "WMA06XZZ99Y123456",
      debitor_nr: "44120",
      firmenname: "Nordlogistik GmbH",
      plz: "20095",
      ort: "Hamburg",
      land: "Deutschland",
      einkaeufer: "TK",
      verkaeufer: "Schmidt",
      telefonnummer: "+49 40 123456",
      extras: "Retarder; Klima",
      kein_abholer: false,
      abgeholt: true,
      verkauf_check: true,
    },
    {
      id: 2,
      position_anzeige: "1841",
      verkauf_datum: "2026-03-08",
      kauf_datum: "2026-02-15",
      fahrzeugart: "Auflieger",
      fabrikat: "Krone",
      typ: "Cool Liner",
      aufbauart: "Koffer",
      ez: "",
      fahrgestellnummer: "WKR12345678901234",
      debitor_nr: "88201",
      firmenname: "Kalotinis Theodoros",
      plz: "55101",
      ort: "Mannheim",
      land: "Deutschland",
      einkaeufer: "ES",
      linkaeufer: "Athens Trading",
      fehlende_kosten: true,
      kein_kaeufer: false,
      reinigung_offen: true,
    },
    {
      id: 3,
      position_anzeige: "1840",
      verkauf_datum: "2026-03-05",
      kauf_datum: "2026-01-20",
      fahrzeugart: "Anhänger",
      fabrikat: "Schmitz",
      typ: "SCB*S3B",
      aufbauart: "Pritsche",
      ez: "2015-03",
      fahrgestellnummer: "WSM98765432109876",
      debitor_nr: "12033",
      firmenname: "Sciortino Fabio",
      plz: "10437",
      ort: "Athens",
      land: "Griechenland",
      einkaeufer: "SF",
      offene_auftraege: true,
      kein_eingang: false,
    },
    {
      id: 4,
      position_anzeige: "1839",
      verkauf_datum: "2026-03-01",
      kauf_datum: "2026-01-10",
      fahrzeugart: "LKW",
      fabrikat: "DAF",
      typ: "XF 480",
      aufbauart: "Kastenwagen",
      ez: "2019-11",
      fahrgestellnummer: "NLP1234567890ABCD",
      debitor_nr: "55001",
      firmenname: "Spedition Mitte",
      plz: "50667",
      ort: "Köln",
      land: "Deutschland",
      einkaeufer: "LA",
      auftrag_erledigt: true,
      bh_check: true,
    },
    {
      id: 5,
      position_anzeige: "1838",
      verkauf_datum: "2026-02-20",
      kauf_datum: "2025-12-01",
      fahrzeugart: "Wechselbrücke",
      fabrikat: "Kaessbohrer",
      typ: "WB Carrier",
      aufbauart: "Plane",
      ez: "",
      fahrgestellnummer: "KAE55443322110099",
      debitor_nr: "99001",
      firmenname: "Ost EU Logistics",
      plz: "1000",
      ort: "Skopje",
      land: "Nordmazedonien",
      einkaeufer: "TK",
      kein_abholer: true,
      kein_auftrag_erteilt: true,
    },
    {
      id: 6,
      position_anzeige: "1837",
      verkauf_datum: "2026-02-12",
      kauf_datum: "2025-11-18",
      fahrzeugart: "LKW",
      fabrikat: "DB",
      typ: "Actros 1845",
      aufbauart: "Kipper",
      ez: "2017-04",
      fahrgestellnummer: "WDB93012345678901",
      debitor_nr: "33410",
      firmenname: "Erdbau Nord",
      plz: "10115",
      ort: "Berlin",
      land: "Deutschland",
      einkaeufer: "ES",
      keine_erstkontrolle: true,
      import_verkaufs_nr: "IMP-2025-889",
    },
    {
      id: 7,
      position_anzeige: "1836",
      verkauf_datum: "2026-02-01",
      kauf_datum: "2025-10-05",
      fahrzeugart: "Auflieger",
      fabrikat: "RENAULT",
      typ: "Premium Lander",
      aufbauart: "Silo",
      ez: "2016-08",
      fahrgestellnummer: "VF61234567890ABCD",
      debitor_nr: "77100",
      firmenname: "Mineralöl Transport",
      plz: "60311",
      ort: "Frankfurt",
      land: "Deutschland",
      einkaeufer: "SF",
      kein_eingang: true,
      verkauf_check: false,
    },
    {
      id: 8,
      position_anzeige: "1835",
      verkauf_datum: "2026-01-15",
      kauf_datum: "2025-09-22",
      fahrzeugart: "LKW",
      fabrikat: "VOLVO",
      typ: "FH 500",
      aufbauart: "SZM",
      ez: "2020-01",
      fahrgestellnummer: "YV2R4X12345678901",
      debitor_nr: "22001",
      firmenname: "Baltic Line OÜ",
      plz: "10145",
      ort: "Tallinn",
      land: "Estland",
      einkaeufer: "LA",
      kein_kaeufer: true,
      beteiligter: "Bank xy",
    },
  ];
  return { version: 1, rows };
}

function isState(x: unknown): x is VerkaufterBestandDbState {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.rows);
}

export function loadVerkaufterBestandDb(): VerkaufterBestandDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (isState(parsed)) return parsed;
    }
  } catch {
    /* ignore */
  }
  return seed();
}

export function saveVerkaufterBestandDb(state: VerkaufterBestandDbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
