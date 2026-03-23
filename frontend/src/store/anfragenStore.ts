import type { AnfrageStamm, AnfragenDbState, NewAnfragePayload } from "../types/anfragen";

const STORAGE_KEY = "dema-anfragen-db";

function parseGermanMoney(s?: string): number {
  if (!s?.trim()) return 0;
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isNaN(n) ? 0 : n;
}

/** Listenpreis: bevorzugt „Preis bis“, sonst explizites Maximum. */
export function resolveMaxPreis(p: NewAnfragePayload): number {
  const bis = parseGermanMoney(p.preis_bis);
  if (bis > 0) return bis;
  const von = parseGermanMoney(p.preis_von);
  if (von > 0) return von;
  if (p.max_preis > 0) return p.max_preis;
  return 0;
}

function seed(): AnfragenDbState {
  const rows: AnfrageStamm[] = [
    {
      id: 1,
      anfrage_nr: "160",
      anfrage_datum: "2026-03-05",
      fahrzeugart: "LKW",
      aufbauart: "SZM",
      fabrikat: "SCANIA",
      typ: "",
      extras: "V8 - Euro 6d !!",
      max_preis: 50000,
      debitor_nr: "38304",
      firmenname: "Sciortino Fabio",
      bearbeiter_sb: "es",
    },
    {
      id: 2,
      anfrage_nr: "159",
      anfrage_datum: "2026-03-04",
      fahrzeugart: "Auflieger",
      aufbauart: "Silo",
      fabrikat: "Feldbinder",
      typ: "",
      extras: "Lebensmittel Silo",
      max_preis: 12000,
      debitor_nr: "85412",
      firmenname: "Kalotinis Theodoros",
      bearbeiter_sb: "tk",
    },
    {
      id: 3,
      anfrage_nr: "158",
      anfrage_datum: "2026-03-03",
      fahrzeugart: "LKW",
      aufbauart: "Viehtransporter",
      fabrikat: "DAF",
      typ: "",
      extras: "",
      max_preis: 85000,
      debitor_nr: "12001",
      firmenname: "Müller Transporte",
      bearbeiter_sb: "sf",
    },
    {
      id: 4,
      anfrage_nr: "157",
      anfrage_datum: "2026-03-02",
      fahrzeugart: "LKW",
      aufbauart: "Betonmischer",
      fabrikat: "VOLVO",
      typ: "",
      extras: "Kran",
      max_preis: 95000,
      debitor_nr: "22088",
      firmenname: "Betonbau Süd GmbH",
      bearbeiter_sb: "la",
    },
    {
      id: 5,
      anfrage_nr: "156",
      anfrage_datum: "2026-03-01",
      fahrzeugart: "PKW",
      aufbauart: "Koffer",
      fabrikat: "MB",
      typ: "Transit",
      extras: "",
      max_preis: 28000,
      debitor_nr: "99100",
      firmenname: "Kurier Express Leipzig",
      bearbeiter_sb: "es",
    },
  ];
  return { version: 1, anfragen: rows, nextId: 6 };
}

function isState(x: unknown): x is AnfragenDbState {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.anfragen) && typeof o.nextId === "number";
}

export function loadAnfragenDb(): AnfragenDbState {
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

export function saveAnfragenDb(state: AnfragenDbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function nextAnfrageNr(anfragen: AnfrageStamm[]): string {
  const nums = anfragen
    .map((a) => parseInt(a.anfrage_nr, 10))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 159;
  return String(max + 1);
}

export function previewNextAnfrageNr(db: AnfragenDbState): string {
  return nextAnfrageNr(db.anfragen);
}

export function createAnfrage(db: AnfragenDbState, payload: NewAnfragePayload): AnfragenDbState {
  const max_preis = resolveMaxPreis(payload);
  const row: AnfrageStamm = {
    ...payload,
    id: db.nextId,
    anfrage_nr: nextAnfrageNr(db.anfragen),
    max_preis,
  };
  return {
    version: 1,
    anfragen: [row, ...db.anfragen],
    nextId: db.nextId + 1,
  };
}
