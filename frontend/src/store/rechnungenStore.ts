import type { RechnungListRow, RechnungenDbState } from "../types/rechnungen";

const STORAGE_KEY = "dema-rechnungen-db";

function row(
  id: number,
  partial: Omit<RechnungListRow, "id">
): RechnungListRow {
  return { id, ...partial };
}

function seedRows(): RechnungListRow[] {
  const y = 2026;
  const iso = (d: string) => `${y}-${d}`;
  return [
    row(1, {
      rechn_nr: "R-240891",
      r_datum: iso("03-19"),
      kunden_nr: "18440",
      firmenname: "SODI Industrie Service GmbH",
      land: "Deutschland",
      plz: "68159",
      ort: "Mannheim",
      art: "DIL",
      buchung: "4400",
      bezahlt_am: "",
      ersteller: "la",
      verkaufer: "tk",
      betrag_cent: 1225000,
      vermerk: "",
      ust_id: "DE123456789",
      positions_nr: "P-8821",
      fahrgestell_nr: "WDB9066331N123456",
      verkaufs_nr: "V-2026-011",
      rechnung_erstellt_von: "System",
      nicht_erledigt: true,
      bh_check: false,
      nicht_abgeholt: true,
    }),
    row(2, {
      rechn_nr: "R-240892",
      r_datum: iso("03-19"),
      kunden_nr: "22001",
      firmenname: "Zdrave-83 LTD",
      land: "Bulgarien",
      plz: "1000",
      ort: "Sofia",
      art: "DEG",
      buchung: "4401",
      bezahlt_am: iso("03-20"),
      ersteller: "tk",
      verkaufer: "es",
      betrag_cent: 3025000,
      vermerk: "",
      ust_id: "BG123456789",
      positions_nr: "P-8822",
      fahrgestell_nr: "VF1RFE00061234567",
      verkaufs_nr: "V-2026-012",
      rechnung_erstellt_von: "Büro",
      nicht_erledigt: false,
      bh_check: true,
      nicht_abgeholt: false,
    }),
    row(3, {
      rechn_nr: "R-240893",
      r_datum: iso("03-18"),
      kunden_nr: "19502",
      firmenname: "Mediterranean Trucks S.r.l.",
      land: "Italien",
      plz: "20121",
      ort: "Milano",
      art: "DSL",
      buchung: "1200",
      bezahlt_am: "",
      ersteller: "es",
      verkaufer: "sf",
      betrag_cent: 1899000,
      vermerk: "Express",
      ust_id: "IT01234567890",
      positions_nr: "P-8810",
      fahrgestell_nr: "ZCFA1AF110D123456",
      verkaufs_nr: "V-2026-009",
      rechnung_erstellt_von: "System",
      nicht_erledigt: true,
      bh_check: false,
      nicht_abgeholt: true,
    }),
    row(4, {
      rechn_nr: "R-240894",
      r_datum: iso("03-17"),
      kunden_nr: "31088",
      firmenname: "Hellenic Transport AE",
      land: "Griechenland",
      plz: "10431",
      ort: "Athen",
      art: "DEG",
      buchung: "4401",
      bezahlt_am: iso("03-18"),
      ersteller: "sf",
      verkaufer: "la",
      betrag_cent: 560000,
      vermerk: "",
      ust_id: "EL123456789",
      positions_nr: "P-8805",
      fahrgestell_nr: "WMA06SZZ9CP123456",
      verkaufs_nr: "V-2026-008",
      rechnung_erstellt_von: "Büro",
      nicht_erledigt: false,
      bh_check: false,
      nicht_abgeholt: false,
    }),
    row(5, {
      rechn_nr: "R-240895",
      r_datum: iso("03-16"),
      kunden_nr: "40102",
      firmenname: "Kabul Freight Services",
      land: "Afghanistan",
      plz: "1001",
      ort: "Kabul",
      art: "DIL",
      buchung: "4400",
      bezahlt_am: "",
      ersteller: "la",
      verkaufer: "tk",
      betrag_cent: 875000,
      vermerk: "",
      ust_id: "",
      positions_nr: "P-8799",
      fahrgestell_nr: "NLHBN51ZZPZ123456",
      verkaufs_nr: "V-2026-007",
      rechnung_erstellt_von: "System",
      nicht_erledigt: true,
      bh_check: true,
      nicht_abgeholt: true,
    }),
    row(6, {
      rechn_nr: "R-240896",
      r_datum: iso("03-15"),
      kunden_nr: "10001",
      firmenname: "Muster GmbH",
      land: "Deutschland",
      plz: "20095",
      ort: "Hamburg",
      art: "S",
      buchung: "1200",
      bezahlt_am: iso("03-16"),
      ersteller: "tk",
      verkaufer: "es",
      betrag_cent: 425000,
      vermerk: "",
      ust_id: "DE998877665",
      positions_nr: "P-8790",
      fahrgestell_nr: "WDB9630321N987654",
      verkaufs_nr: "V-2026-006",
      rechnung_erstellt_von: "Büro",
      nicht_erledigt: false,
      bh_check: false,
      nicht_abgeholt: false,
    }),
    row(7, {
      rechn_nr: "R-240897",
      r_datum: iso("03-14"),
      kunden_nr: "10002",
      firmenname: "Beispiel Autohaus AG",
      land: "Deutschland",
      plz: "80331",
      ort: "München",
      art: "DSL",
      buchung: "1200",
      bezahlt_am: "",
      ersteller: "es",
      verkaufer: "sf",
      betrag_cent: 15250000,
      vermerk: "Teillieferung",
      ust_id: "DE112233445",
      positions_nr: "P-8788",
      fahrgestell_nr: "WMAH06ZZ99X123456",
      verkaufs_nr: "V-2026-005",
      rechnung_erstellt_von: "System",
      nicht_erledigt: true,
      bh_check: false,
      nicht_abgeholt: false,
    }),
    row(8, {
      rechn_nr: "R-240898",
      r_datum: iso("03-13"),
      kunden_nr: "44510",
      firmenname: "Euro LKW Handel BV",
      land: "Niederlande",
      plz: "3084",
      ort: "Rotterdam",
      art: "DEG",
      buchung: "4401",
      bezahlt_am: iso("03-14"),
      ersteller: "sf",
      verkaufer: "la",
      betrag_cent: 990000,
      vermerk: "",
      ust_id: "NL123456789B01",
      positions_nr: "P-8777",
      fahrgestell_nr: "VF6ACAFZ0ME123456",
      verkaufs_nr: "V-2026-004",
      rechnung_erstellt_von: "Büro",
      nicht_erledigt: false,
      bh_check: true,
      nicht_abgeholt: false,
    }),
  ];
}

function seedDb(): RechnungenDbState {
  const rows = seedRows();
  return { version: 1, rows, nextId: rows.length + 1 };
}

function isState(x: unknown): x is RechnungenDbState {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.rows) && typeof o.nextId === "number";
}

export function loadRechnungenDb(): RechnungenDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDb();
    const p = JSON.parse(raw) as unknown;
    if (!isState(p)) return seedDb();
    return p;
  } catch {
    return seedDb();
  }
}

export function saveRechnungenDb(s: RechnungenDbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    window.dispatchEvent(new CustomEvent("dema-rechnungen-db-changed"));
  } catch {
    // ignore
  }
}

export function formatRechnungsbetrag(cent: number): string {
  const eur = cent / 100;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(eur);
}
