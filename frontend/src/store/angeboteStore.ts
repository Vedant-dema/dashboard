import type { AngeboteDbState, AngebotStamm, NewAngebotPayload } from "../types/angebote";

const STORAGE_KEY = "dema-angebote-db";

function parseGermanNumber(s?: string): number {
  if (!s?.trim()) return 0;
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isNaN(n) ? 0 : n;
}

/** Listenpreis: erste gesetzte DEMA-Stufe, sonst Preis, sonst Preisvorstellung DEMA. */
export function resolveListPreis(p: NewAngebotPayload): number {
  for (const x of [p.preis_dema_1, p.preis_dema_2, p.preis_dema_3]) {
    if (typeof x === "number" && !Number.isNaN(x) && x > 0) return x;
  }
  if (typeof p.preis === "number" && p.preis > 0) return p.preis;
  const fromText = parseGermanNumber(p.preisvorstellung_dema);
  if (fromText > 0) return fromText;
  return 0;
}

function seed(): AngeboteDbState {
  const today = new Date().toISOString().slice(0, 10);
  const angebote: AngebotStamm[] = [
    {
      id: 1,
      angebot_nr: "A-24001",
      angebot_datum: today,
      abgabetermin: "2026-04-15",
      fahrzeugart: "LKW",
      fabrikat: "MAN",
      typ: "TGX 18.500",
      aufbauart: "SZM",
      ez: "2019-03-12",
      preis: 55000,
      verkauft: false,
      gekauft: true,
      anbieten: true,
      plz: "10115",
      ort: "Berlin",
      firmenname: "Spedition Nord GmbH",
      termin: "2026-04-10",
      eingetragen: "AS",
      eingeholt: "MD",
      verhandelt: "—",
      land_code: "DE",
    },
    {
      id: 2,
      angebot_nr: "A-24002",
      angebot_datum: today,
      fahrzeugart: "PKW",
      fabrikat: "Ford",
      typ: "Pickup F35",
      aufbauart: "Sonstige",
      ez: "2021-08-01",
      preis: 0,
      verkauft: false,
      anbieten: true,
      plz: "80331",
      ort: "München",
      firmenname: "Autohaus Example",
      termin: "2026-03-28",
      eingetragen: "AS",
      land_code: "DE",
    },
    {
      id: 3,
      angebot_nr: "A-24003",
      angebot_datum: today,
      fahrzeugart: "Auflieger",
      fabrikat: "Krone",
      typ: "Cool Liner",
      aufbauart: "Koffer",
      ez: "2020-11-20",
      preis: 28500,
      verkauft: true,
      anbieten: false,
      plz: "20095",
      ort: "Hamburg",
      firmenname: "Logistik HH",
      termin: "2026-02-01",
      verhandelt: "TV",
      land_code: "DE",
    },
    {
      id: 4,
      angebot_nr: "A-24004",
      angebot_datum: today,
      fahrzeugart: "LKW",
      fabrikat: "Scania",
      typ: "R 450",
      aufbauart: "Kipper",
      ez: "2018-05-14",
      preis: 67200,
      verkauft: false,
      gekauft: true,
      anbieten: true,
      plz: "50667",
      ort: "Köln",
      firmenname: "Bau & Transport KG",
      termin: "2026-05-01",
      eingetragen: "MD",
      land_code: "DE",
    },
    {
      id: 5,
      angebot_nr: "A-24005",
      angebot_datum: today,
      fahrzeugart: "LKW",
      fabrikat: "Renault",
      typ: "AROC 1833",
      aufbauart: "Kipper",
      ez: "2017-09-01",
      preis: 0,
      verkauft: false,
      anbieten: true,
      plz: "70173",
      ort: "Stuttgart",
      firmenname: "Erdbau Süd",
      termin: "2026-03-22",
      land_code: "DE",
    },
    {
      id: 6,
      angebot_nr: "A-24006",
      angebot_datum: today,
      fahrzeugart: "PKW",
      fabrikat: "MB",
      typ: "Sprinter",
      aufbauart: "Koffer",
      ez: "2022-01-10",
      preis: 38900,
      verkauft: false,
      anbieten: true,
      plz: "04109",
      ort: "Leipzig",
      firmenname: "Kurier Express",
      termin: "2026-04-02",
      eingeholt: "AS",
      land_code: "DE",
    },
  ];
  return { version: 1, angebote, nextId: 7 };
}

function isState(x: unknown): x is AngeboteDbState {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.angebote) && typeof o.nextId === "number";
}

export function loadAngeboteDb(): AngeboteDbState {
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

export function saveAngeboteDb(state: AngeboteDbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function nextAngebotNr(nextId: number): string {
  const y = new Date().getFullYear().toString().slice(-2);
  return `A-${y}${String(nextId).padStart(4, "0")}`;
}

export function previewNextAngebotNr(db: AngeboteDbState): string {
  return nextAngebotNr(db.nextId);
}

export function createAngebot(db: AngeboteDbState, payload: NewAngebotPayload): AngeboteDbState {
  const listPreis = resolveListPreis(payload);
  const row: AngebotStamm = {
    ...payload,
    id: db.nextId,
    angebot_nr: nextAngebotNr(db.nextId),
    preis: listPreis,
  };
  return {
    version: 1,
    angebote: [...db.angebote, row],
    nextId: db.nextId + 1,
  };
}
