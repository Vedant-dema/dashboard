import type { KundenDbState, KundenStamm } from "../types/kunden";

/** Eine Zeile wie Legacy „Doppelte KUNDEN“ (KU-NR … Beziehung). */
export interface DoppelterKundeRow {
  id: string;
  ku_nr: string;
  firmenname: string;
  termin: string;
  branche: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  telefonnummer: string;
  /** Kurzspalte „T“ (z. B. aus Art). */
  t: string;
  /** Kurzzeichen (z. B. aus Zuständigkeit). */
  zeichen: string;
  art: string;
  markiert: string;
  bknr: string;
  bfirma: string;
  beziehung: string;
  /** Für Filter: Ansprechpartner der Zeilen-Kunden (Hauptdatensatz). */
  ansprechpartner: string;
  faxnummer: string;
  aufnahme_raw: string;
  /** Hauptkunde der Zeile hat Rollen / Verknüpfungen. */
  hauptHatVerkn: boolean;
  zpk: string;
}

function normPhone(s?: string): string {
  const d = (s ?? "").replace(/\D/g, "");
  return d.length >= 6 ? d : "";
}

function normAddr(k: KundenStamm): string {
  return [k.strasse, k.plz, k.ort]
    .map((x) => (x ?? "").trim().toLowerCase())
    .join("|");
}

function normContact(s?: string): string {
  const t = (s ?? "").trim().toLowerCase();
  return t.length >= 2 ? t : "";
}

function zeichenFromZustaendig(name?: string): string {
  const p = (name ?? "").trim();
  if (!p) return "—";
  const parts = p.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]!.slice(0, 1);
    const b = parts[parts.length - 1]!.slice(0, 1);
    return (a + b).toLowerCase();
  }
  return p.slice(0, 3).toLowerCase();
}

function beziehungenForPair(a: KundenStamm, b: KundenStamm): string[] {
  const out: string[] = [];
  const pA = normPhone(a.telefonnummer);
  const pB = normPhone(b.telefonnummer);
  if (pA && pA === pB) out.push("gleiche Telefonnr");

  const cA = normContact(a.ansprechpartner);
  const cB = normContact(b.ansprechpartner);
  if (cA && cA === cB) out.push("gleiche Ansprechperson");

  const addrA = normAddr(a);
  const addrB = normAddr(b);
  if (addrA.length > 4 && addrA === addrB) out.push("gleiche Adresse");

  return out;
}

function rowFromPair(
  a: KundenStamm,
  b: KundenStamm,
  beziehung: string,
  db: KundenDbState
): DoppelterKundeRow {
  const art = (a.art_kunde ?? a.buchungskonto_haupt ?? "—").toString();
  const t = art.length ? art.slice(0, 1).toUpperCase() : "—";
  return {
    id: `dup-${a.id}-${b.id}`,
    ku_nr: a.kunden_nr,
    firmenname: a.firmenname,
    termin: a.aufnahme?.slice(0, 10) ?? "—",
    branche: a.branche ?? "—",
    strasse: a.strasse ?? "—",
    plz: a.plz ?? "—",
    ort: a.ort ?? "—",
    land: a.land_code ?? "—",
    telefonnummer: a.telefonnummer ?? "—",
    t,
    zeichen: zeichenFromZustaendig(a.zustaendige_person_name),
    art,
    markiert: "",
    bknr: b.kunden_nr,
    bfirma: b.firmenname,
    beziehung,
    ansprechpartner: a.ansprechpartner ?? "",
    faxnummer: a.faxnummer ?? "",
    aufnahme_raw: a.aufnahme ?? "",
    hauptHatVerkn: db.rollen.some((r) => r.kunden_id === a.id),
    zpk: (a.buchungskonto_haupt ?? "").trim(),
  };
}

/**
 * Findet Kundenpaare mit gleicher Telefonnr., gleichem Ansprechpartner oder gleicher Adresse.
 * Pro Paar (niedrigere `id` = Zeilenstamm) eine Zeile — wie Bezug KU-NR → BKNr.
 */
export function buildDoppelteKundenRows(db: KundenDbState): DoppelterKundeRow[] {
  const kunden = db.kunden;
  const rows: DoppelterKundeRow[] = [];
  for (let i = 0; i < kunden.length; i++) {
    for (let j = i + 1; j < kunden.length; j++) {
      const a = kunden[i]!;
      const b = kunden[j]!;
      const reasons = beziehungenForPair(a, b);
      if (reasons.length === 0) continue;
      const text = reasons.join(", ");
      rows.push(rowFromPair(a, b, text, db));
      rows.push(rowFromPair(b, a, text, db));
    }
  }
  return rows;
}

/**
 * Beispielzeilen wie Legacy „Doppelte KUNDEN“ (Screenshot), wenn die lokale DB keine Dubletten liefert.
 * Wortlaut Beziehung wie Maske: „gleiche Telefonn“, „gleiche Ansprech“, „gleiche Adresse“.
 */
export const DEMO_DOPPELTE_KUNDEN_ROWS: DoppelterKundeRow[] = [
  {
    id: "demo-1",
    ku_nr: "14201",
    firmenname: "Autohaus Nord GmbH",
    termin: "15.03.2024",
    branche: "KFZ",
    strasse: "Werftstr. 12",
    plz: "20457",
    ort: "Hamburg",
    land: "DE",
    telefonnummer: "+49 40 889900",
    t: "S",
    zeichen: "kna",
    art: "S",
    markiert: "",
    bknr: "15883",
    bfirma: "Nordfahrzeuge Vertrieb OHG",
    beziehung: "gleiche Telefonn",
    ansprechpartner: "Klaus Meyer",
    faxnummer: "+49 40 889901",
    aufnahme_raw: "2024-03-15",
    hauptHatVerkn: true,
    zpk: "1200",
  },
  {
    id: "demo-2",
    ku_nr: "15883",
    firmenname: "Nordfahrzeuge Vertrieb OHG",
    termin: "18.03.2024",
    branche: "KONTROLLIERT",
    strasse: "Industriestr. 4",
    plz: "22335",
    ort: "Hamburg",
    land: "DE",
    telefonnummer: "+49 40 889900",
    t: "D",
    zeichen: "ab",
    art: "DSL",
    markiert: "",
    bknr: "14201",
    bfirma: "Autohaus Nord GmbH",
    beziehung: "gleiche Telefonn",
    ansprechpartner: "Klaus Meyer",
    faxnummer: "",
    aufnahme_raw: "2024-03-18",
    hauptHatVerkn: true,
    zpk: "1200",
  },
  {
    id: "demo-3",
    ku_nr: "20144",
    firmenname: "Logistik Petersen",
    termin: "02.01.2024",
    branche: "Spedition",
    strasse: "Hafenstr. 88",
    plz: "28195",
    ort: "Bremen",
    land: "DE",
    telefonnummer: "+49 421 556677",
    t: "S",
    zeichen: "wj",
    art: "NSL",
    markiert: "",
    bknr: "20901",
    bfirma: "Petersen & Söhne KG",
    beziehung: "gleiche Ansprech",
    ansprechpartner: "Jens Petersen",
    faxnummer: "",
    aufnahme_raw: "2024-01-02",
    hauptHatVerkn: false,
    zpk: "",
  },
  {
    id: "demo-4",
    ku_nr: "20901",
    firmenname: "Petersen & Söhne KG",
    termin: "05.01.2024",
    branche: "KFZ",
    strasse: "Überseetor 1",
    plz: "28217",
    ort: "Bremen",
    land: "DE",
    telefonnummer: "+49 421 334455",
    t: "S",
    zeichen: "wj",
    art: "S",
    markiert: "",
    bknr: "20144",
    bfirma: "Logistik Petersen",
    beziehung: "gleiche Ansprech",
    ansprechpartner: "Jens Petersen",
    faxnummer: "",
    aufnahme_raw: "2024-01-05",
    hauptHatVerkn: false,
    zpk: "1200",
  },
  {
    id: "demo-5",
    ku_nr: "31022",
    firmenname: "Südwerkstatt Müller",
    termin: "22.06.2023",
    branche: "Werkstatt",
    strasse: "Bahnhofstr. 3",
    plz: "80335",
    ort: "München",
    land: "DE",
    telefonnummer: "+49 89 112233",
    t: "D",
    zeichen: "ms",
    art: "DEG",
    markiert: "",
    bknr: "31088",
    bfirma: "KFZ Müller Filiale Ost",
    beziehung: "gleiche Adresse",
    ansprechpartner: "Maria Schulz",
    faxnummer: "",
    aufnahme_raw: "2023-06-22",
    hauptHatVerkn: false,
    zpk: "",
  },
  {
    id: "demo-6",
    ku_nr: "31088",
    firmenname: "KFZ Müller Filiale Ost",
    termin: "22.06.2023",
    branche: "KONTROLLIERT",
    strasse: "Bahnhofstr. 3",
    plz: "80335",
    ort: "München",
    land: "DE",
    telefonnummer: "+49 89 998877",
    t: "S",
    zeichen: "ms",
    art: "S",
    markiert: "",
    bknr: "31022",
    bfirma: "Südwerkstatt Müller",
    beziehung: "gleiche Adresse",
    ansprechpartner: "Thomas Müller",
    faxnummer: "",
    aufnahme_raw: "2023-06-22",
    hauptHatVerkn: false,
    zpk: "1200",
  },
  {
    id: "demo-7",
    ku_nr: "44510",
    firmenname: "Euro LKW Handel BV",
    termin: "11.09.2024",
    branche: "Handel",
    strasse: "Havenweg 20",
    plz: "3084",
    ort: "Rotterdam",
    land: "NL",
    telefonnummer: "+31 10 4455667",
    t: "S",
    zeichen: "rl",
    art: "S",
    markiert: "",
    bknr: "44511",
    bfirma: "Euro LKW Parts",
    beziehung: "gleiche Telefonn",
    ansprechpartner: "Ruud de Vries",
    faxnummer: "",
    aufnahme_raw: "2024-09-11",
    hauptHatVerkn: true,
    zpk: "1400",
  },
  {
    id: "demo-8",
    ku_nr: "44511",
    firmenname: "Euro LKW Parts",
    termin: "12.09.2024",
    branche: "Ersatzteile",
    strasse: "Maasvlakte 5",
    plz: "3199",
    ort: "Rotterdam",
    land: "NL",
    telefonnummer: "+31 10 4455667",
    t: "D",
    zeichen: "rl",
    art: "DSL",
    markiert: "",
    bknr: "44510",
    bfirma: "Euro LKW Handel BV",
    beziehung: "gleiche Telefonn",
    ansprechpartner: "Ruud de Vries",
    faxnummer: "",
    aufnahme_raw: "2024-09-12",
    hauptHatVerkn: true,
    zpk: "1400",
  },
  {
    id: "demo-9",
    ku_nr: "50102",
    firmenname: "Alpen Garagen AG",
    termin: "03.02.2024",
    branche: "KFZ",
    strasse: "Gotthardstr. 7",
    plz: "6460",
    ort: "Altdorf",
    land: "CH",
    telefonnummer: "+41 41 5558899",
    t: "S",
    zeichen: "hf",
    art: "S",
    markiert: "",
    bknr: "50188",
    bfirma: "Garage Gotthard",
    beziehung: "gleiche Ansprech, gleiche Adresse",
    ansprechpartner: "Hans Fischer",
    faxnummer: "",
    aufnahme_raw: "2024-02-03",
    hauptHatVerkn: false,
    zpk: "",
  },
  {
    id: "demo-10",
    ku_nr: "50188",
    firmenname: "Garage Gotthard",
    termin: "03.02.2024",
    branche: "Werkstatt",
    strasse: "Gotthardstr. 7",
    plz: "6460",
    ort: "Altdorf",
    land: "CH",
    telefonnummer: "+41 41 7770011",
    t: "D",
    zeichen: "hf",
    art: "DEG",
    markiert: "",
    bknr: "50102",
    bfirma: "Alpen Garagen AG",
    beziehung: "gleiche Ansprech, gleiche Adresse",
    ansprechpartner: "Hans Fischer",
    faxnummer: "",
    aufnahme_raw: "2024-02-03",
    hauptHatVerkn: false,
    zpk: "",
  },
  {
    id: "demo-11",
    ku_nr: "61200",
    firmenname: "Ostsee Trans GmbH",
    termin: "19.07.2024",
    branche: "Spedition",
    strasse: "Hafendamm 2",
    plz: "23570",
    ort: "Lübeck",
    land: "DE",
    telefonnummer: "+49 451 667788",
    t: "S",
    zeichen: "tb",
    art: "NSL",
    markiert: "",
    bknr: "61205",
    bfirma: "Lübecker Fuhrpark Service",
    beziehung: "gleiche Telefonn",
    ansprechpartner: "Torben Braun",
    faxnummer: "+49 451 667789",
    aufnahme_raw: "2024-07-19",
    hauptHatVerkn: false,
    zpk: "1200",
  },
  {
    id: "demo-12",
    ku_nr: "61205",
    firmenname: "Lübecker Fuhrpark Service",
    termin: "20.07.2024",
    branche: "KFZ",
    strasse: "Zum Hafen 15",
    plz: "23568",
    ort: "Lübeck",
    land: "DE",
    telefonnummer: "+49 451 667788",
    t: "S",
    zeichen: "tb",
    art: "S",
    markiert: "",
    bknr: "61200",
    bfirma: "Ostsee Trans GmbH",
    beziehung: "gleiche Telefonn",
    ansprechpartner: "Torben Braun",
    faxnummer: "",
    aufnahme_raw: "2024-07-20",
    hauptHatVerkn: false,
    zpk: "1200",
  },
];

export function listDoppelteKundenRowsForUi(db: KundenDbState): {
  rows: DoppelterKundeRow[];
  isDemoFallback: boolean;
} {
  const fromDb = buildDoppelteKundenRows(db);
  if (fromDb.length > 0) {
    return { rows: fromDb, isDemoFallback: false };
  }
  return { rows: DEMO_DOPPELTE_KUNDEN_ROWS, isDemoFallback: true };
}
