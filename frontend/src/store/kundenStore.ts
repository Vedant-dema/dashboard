import type {
  KundenDbState,
  KundenDetailWithWash,
  KundenRolleRow,
  KundenStamm,
  KundenUnterlage,
  KundenWashStamm,
} from "../types/kunden";

const STORAGE_KEY = "dema-kunden-db";

export type KundenListRow = {
  kuNr: string;
  firmenname: string;
  termin: string;
  branche: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function seedDb(): KundenDbState {
  const kunden: KundenStamm[] = [
    {
      id: 1,
      kunden_nr: "10001",
      firmenname: "Muster GmbH",
      branche: "KFZ",
      strasse: "Hafenstr. 1",
      plz: "20095",
      ort: "Hamburg",
      land_code: "DE",
      ansprechpartner: "Max Mustermann",
      telefonnummer: "+49 40 123456",
      zustaendige_person_name: "Anna Schmidt",
      aufnahme: todayIsoDate(),
    },
    {
      id: 2,
      kunden_nr: "10002",
      firmenname: "Beispiel Autohaus AG",
      branche: "Handel",
      strasse: "Industrieweg 12",
      plz: "80331",
      ort: "München",
      land_code: "DE",
      ansprechpartner: "Erika Musterfrau",
      telefonnummer: "+49 89 987654",
      zustaendige_person_name: "Team Verkauf",
      aufnahme: todayIsoDate(),
    },
    /** Demo-Duplikate: Tel./Ansprech/Adresse (Doppelte-Kunden-Ansicht). */
    {
      id: 3,
      kunden_nr: "10003",
      firmenname: "Muster Zweig GmbH",
      branche: "KFZ",
      strasse: "Industrieweg 5",
      plz: "20097",
      ort: "Hamburg",
      land_code: "DE",
      ansprechpartner: "Max Mustermann",
      telefonnummer: "+49 40 123456",
      zustaendige_person_name: "Anna Schmidt",
      art_kunde: "S",
      buchungskonto_haupt: "1200",
      aufnahme: todayIsoDate(),
    },
    {
      id: 4,
      kunden_nr: "10004",
      firmenname: "Hafen Logistik GmbH",
      branche: "Logistik",
      strasse: "Hafenstr. 1",
      plz: "20095",
      ort: "Hamburg",
      land_code: "DE",
      ansprechpartner: "Sabine Nord",
      telefonnummer: "+49 40 555111",
      zustaendige_person_name: "Team Verkauf",
      art_kunde: "DSL",
      aufnahme: todayIsoDate(),
    },
    {
      id: 5,
      kunden_nr: "10005",
      firmenname: "Beispiel Filiale Süd",
      branche: "Handel",
      strasse: "Sendlinger Str. 3",
      plz: "80331",
      ort: "München",
      land_code: "DE",
      ansprechpartner: "Erika Musterfrau",
      telefonnummer: "+49 89 987654",
      zustaendige_person_name: "Liciu Ana-Maria",
      art_kunde: "NSL",
      aufnahme: todayIsoDate(),
    },
    {
      id: 6,
      kunden_nr: "10006",
      firmenname: "Nordfleet Logistics GmbH",
      branche: "Logistik",
      strasse: "Werftallee 17",
      plz: "28195",
      ort: "Bremen",
      land_code: "DE",
      ansprechpartner: "Jonas Peters",
      telefonnummer: "+49 421 884422",
      zustaendige_person_name: "Liciu Ana-Maria",
      art_kunde: "DSL",
      buchungskonto_haupt: "1300",
      aufnahme: todayIsoDate(),
    },
    {
      id: 7,
      kunden_nr: "10007",
      firmenname: "Rhein Cargo Service AG",
      branche: "Transport",
      strasse: "Rheinufer 28",
      plz: "50667",
      ort: "Köln",
      land_code: "DE",
      ansprechpartner: "Miriam Schulte",
      telefonnummer: "+49 221 445566",
      zustaendige_person_name: "Team Verkauf",
      art_kunde: "S",
      buchungskonto_haupt: "1200",
      aufnahme: todayIsoDate(),
    },
    {
      id: 8,
      kunden_nr: "10008",
      firmenname: "Bavaria Nutzfahrzeuge KG",
      branche: "KFZ",
      strasse: "Dieselring 4",
      plz: "90411",
      ort: "Nürnberg",
      land_code: "DE",
      ansprechpartner: "Tim Gärtner",
      telefonnummer: "+49 911 332211",
      zustaendige_person_name: "Anna Schmidt",
      art_kunde: "NSL",
      buchungskonto_haupt: "1400",
      aufnahme: todayIsoDate(),
    },
    {
      id: 9,
      kunden_nr: "10009",
      firmenname: "Autozentrum Elbe GmbH",
      branche: "Handel",
      strasse: "Elbchaussee 90",
      plz: "22763",
      ort: "Hamburg",
      land_code: "DE",
      ansprechpartner: "Daniel Krüger",
      telefonnummer: "+49 40 778899",
      zustaendige_person_name: "Team Verkauf",
      art_kunde: "S",
      aufnahme: todayIsoDate(),
    },
    {
      id: 10,
      kunden_nr: "10010",
      firmenname: "Westfalen Trailer Hub",
      branche: "Auflieger",
      strasse: "Industriepark 12",
      plz: "44135",
      ort: "Dortmund",
      land_code: "DE",
      ansprechpartner: "Lea Franke",
      telefonnummer: "+49 231 112233",
      zustaendige_person_name: "Farouk Al-Amin",
      art_kunde: "DSL",
      aufnahme: todayIsoDate(),
    },
    {
      id: 11,
      kunden_nr: "10011",
      firmenname: "Alpen Fleet Management",
      branche: "Leasing",
      strasse: "Bergstr. 3",
      plz: "86150",
      ort: "Augsburg",
      land_code: "DE",
      ansprechpartner: "Robin Hartmann",
      telefonnummer: "+49 821 667788",
      zustaendige_person_name: "Sandra Brandt",
      art_kunde: "NSL",
      aufnahme: todayIsoDate(),
    },
    {
      id: 12,
      kunden_nr: "10012",
      firmenname: "Hanse Bus & Truck Center",
      branche: "Werkstatt",
      strasse: "Kieler Str. 140",
      plz: "24534",
      ort: "Neumünster",
      land_code: "DE",
      ansprechpartner: "Kai Lorenz",
      telefonnummer: "+49 4321 556677",
      zustaendige_person_name: "Kemal Yildirim",
      art_kunde: "S",
      aufnahme: todayIsoDate(),
    },
    {
      id: 13,
      kunden_nr: "10013",
      firmenname: "Spedition Möller e.K.",
      branche: "Spedition",
      strasse: "Lagerweg 21",
      plz: "39104",
      ort: "Magdeburg",
      land_code: "DE",
      ansprechpartner: "Nina Möller",
      telefonnummer: "+49 391 778866",
      zustaendige_person_name: "Petra Schneider",
      art_kunde: "DSL",
      aufnahme: todayIsoDate(),
    },
    {
      id: 14,
      kunden_nr: "10014",
      firmenname: "EuroTrailer Süd GmbH",
      branche: "Anhänger",
      strasse: "Karlstraße 44",
      plz: "70173",
      ort: "Stuttgart",
      land_code: "DE",
      ansprechpartner: "Fabian Kühn",
      telefonnummer: "+49 711 445588",
      zustaendige_person_name: "Luisa Hoffmann",
      art_kunde: "NSL",
      aufnahme: todayIsoDate(),
    },
    {
      id: 15,
      kunden_nr: "10015",
      firmenname: "Nordic Truckpoint Hamburg",
      branche: "Nutzfahrzeuge",
      strasse: "Wendenstr. 200",
      plz: "20537",
      ort: "Hamburg",
      land_code: "DE",
      ansprechpartner: "Svenja Albers",
      telefonnummer: "+49 40 223344",
      zustaendige_person_name: "Tom Müller",
      art_kunde: "S",
      aufnahme: todayIsoDate(),
    },
  ];
  const kundenWash: KundenWashStamm[] = [
    {
      id: 1,
      kunden_id: 2,
      limit_betrag: 5000,
      lastschrift: true,
      kunde_gesperrt: false,
      kennzeichen: "HH-AB 1234",
      wasch_fahrzeug_typ: "PKW",
    },
  ];
  const rollen: KundenRolleRow[] = [];
  const demoUnterlageText =
    "Beispiel: vom Kunden hochgeladene Datei.\n(Anschrift: Muster GmbH, Hamburg)";
  const unterlagen: KundenUnterlage[] = [
    {
      id: 1,
      kunden_id: 1,
      name: "Kundenanfrage_Beispiel.txt",
      size: new Blob([demoUnterlageText]).size,
      mime_type: "text/plain",
      uploaded_at: new Date().toISOString(),
      data_url: `data:text/plain;charset=utf-8,${encodeURIComponent(demoUnterlageText)}`,
    },
  ];
  return {
    version: 1,
    kunden,
    kundenWash,
    rollen,
    unterlagen,
    nextKundeId: 16,
    nextWashId: 2,
    nextRolleId: 1,
    nextUnterlageId: 2,
  };
}

function ensureSeedCustomers(db: KundenDbState): KundenDbState {
  const seed = seedDb();
  const existingNr = new Set(db.kunden.map((k) => k.kunden_nr));
  const missing = seed.kunden.filter((k) => !existingNr.has(k.kunden_nr));
  if (missing.length === 0) return db;

  let nextId = Math.max(1, ...db.kunden.map((k) => k.id)) + 1;
  const remapped = missing.map((k) => ({ ...k, id: nextId++ }));

  return {
    ...db,
    kunden: [...db.kunden, ...remapped],
    nextKundeId: Math.max(db.nextKundeId, nextId),
  };
}

function isKundenDbState(x: unknown): x is KundenDbState {
  if (x == null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.version === 1 &&
    Array.isArray(o.kunden) &&
    Array.isArray(o.kundenWash) &&
    Array.isArray(o.rollen) &&
    typeof o.nextKundeId === "number" &&
    typeof o.nextWashId === "number" &&
    typeof o.nextRolleId === "number"
  );
}

function normalizeUnterlagen(db: KundenDbState): KundenDbState {
  const u = db.unterlagen;
  const n = db.nextUnterlageId;
  return {
    ...db,
    unterlagen: Array.isArray(u) ? u : [],
    nextUnterlageId: typeof n === "number" && n >= 1 ? n : 1,
  };
}

export function loadKundenDb(): KundenDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDb();
    const parsed = JSON.parse(raw) as unknown;
    if (!isKundenDbState(parsed)) return seedDb();
    return ensureSeedCustomers(normalizeUnterlagen(parsed));
  } catch {
    return seedDb();
  }
}

export function saveKundenDb(state: KundenDbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent("dema-kunden-db-changed"));
  } catch {
    // ignore
  }
}

export function listRowsFromState(db: KundenDbState): KundenListRow[] {
  return db.kunden.map((k) => ({
    kuNr: k.kunden_nr,
    firmenname: k.firmenname,
    termin: k.aufnahme ?? "—",
    branche: k.branche ?? "—",
    strasse: k.strasse ?? "—",
    plz: k.plz ?? "—",
    ort: k.ort ?? "—",
    land: k.land_code ?? "—",
  }));
}

export function getDetailByKundenNr(db: KundenDbState, kuNr: string): KundenDetailWithWash | null {
  const kunden = db.kunden.find((k) => k.kunden_nr === kuNr);
  if (!kunden) return null;
  const kunden_wash = db.kundenWash.find((w) => w.kunden_id === kunden.id) ?? null;
  const rollen = db.rollen.filter((r) => r.kunden_id === kunden.id);
  return { kunden, kunden_wash, rollen };
}

/** Felder für neuen Kunden (ohne `id`; `kunden_nr` optional = automatisch). */
export type NewKundeInput = Pick<KundenStamm, "firmenname"> &
  Partial<Omit<KundenStamm, "id" | "firmenname">>;

function defaultAufnahme(): string {
  return new Date().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" });
}

/** Nächste freie numerische KundenNr. (max aller rein numerischen Nrn. + 1, min. 10001). */
export function generateNextKundenNr(db: KundenDbState): string {
  let maxNum = 10000;
  for (const k of db.kunden) {
    const t = k.kunden_nr.trim();
    if (!/^\d+$/.test(t)) continue;
    const n = parseInt(t, 10);
    if (!Number.isNaN(n) && n > maxNum) maxNum = n;
  }
  return String(maxNum + 1);
}

export function createKunde(db: KundenDbState, input: NewKundeInput): KundenDbState {
  const nr = input.kunden_nr?.trim();
  if (nr) {
    if (db.kunden.some((k) => k.kunden_nr === nr)) {
      throw new Error(`Kundennummer ${nr} ist bereits vergeben.`);
    }
  }
  const id = db.nextKundeId;
  const kunden_nr = nr || generateNextKundenNr(db);
  if (db.kunden.some((k) => k.kunden_nr === kunden_nr)) {
    throw new Error("Kundennummer bereits vergeben — bitte erneut speichern.");
  }
  const now = new Date().toISOString();
  const { firmenname, kunden_nr: _omitNr, created_at: _c, updated_at: _u, ...optional } = input;
  const row: KundenStamm = {
    ...optional,
    id,
    kunden_nr,
    firmenname,
    aufnahme: input.aufnahme ?? defaultAufnahme(),
    created_at: now,
    updated_at: now,
  };
  return {
    ...db,
    kunden: [...db.kunden, row],
    nextKundeId: id + 1,
  };
}

export function updateKunde(db: KundenDbState, kunde: KundenStamm): KundenDbState {
  const now = new Date().toISOString();
  const next = db.kunden.map((k) =>
    k.id === kunde.id ? { ...kunde, updated_at: now } : k
  );
  if (!next.some((k) => k.id === kunde.id)) return db;
  return { ...db, kunden: next };
}

export type KundenWashUpsertFields = Partial<
  Pick<
    KundenWashStamm,
    | "bukto"
    | "limit_betrag"
    | "rechnung_zusatz"
    | "rechnung_plz"
    | "rechnung_ort"
    | "rechnung_strasse"
    | "kunde_gesperrt"
    | "bankname"
    | "bic"
    | "iban"
    | "wichtige_infos"
    | "bemerkungen"
    | "lastschrift"
    | "kennzeichen"
    | "wasch_fahrzeug_typ"
    | "wasch_programm"
    | "wasch_intervall"
  >
>;

export function upsertKundenWash(
  db: KundenDbState,
  kundenId: number,
  fields: KundenWashUpsertFields
): KundenDbState {
  const now = new Date().toISOString();
  const idx = db.kundenWash.findIndex((w) => w.kunden_id === kundenId);
  if (idx >= 0) {
    const prev = db.kundenWash[idx]!;
    const merged: KundenWashStamm = {
      ...prev,
      ...fields,
      kunden_id: kundenId,
      updated_at: now,
    };
    const kundenWash = [...db.kundenWash];
    kundenWash[idx] = merged;
    return { ...db, kundenWash };
  }
  const id = db.nextWashId;
  const created: KundenWashStamm = {
    id,
    kunden_id: kundenId,
    limit_betrag: fields.limit_betrag ?? 0,
    lastschrift: fields.lastschrift ?? false,
    kunde_gesperrt: fields.kunde_gesperrt ?? false,
    bukto: fields.bukto,
    rechnung_zusatz: fields.rechnung_zusatz,
    rechnung_plz: fields.rechnung_plz,
    rechnung_ort: fields.rechnung_ort,
    rechnung_strasse: fields.rechnung_strasse,
    bankname: fields.bankname,
    bic: fields.bic,
    iban: fields.iban,
    wichtige_infos: fields.wichtige_infos,
    bemerkungen: fields.bemerkungen,
    kennzeichen: fields.kennzeichen,
    wasch_fahrzeug_typ: fields.wasch_fahrzeug_typ,
    wasch_programm: fields.wasch_programm,
    wasch_intervall: fields.wasch_intervall,
    created_at: now,
    updated_at: now,
  };
  return {
    ...db,
    kundenWash: [...db.kundenWash, created],
    nextWashId: id + 1,
  };
}

export type NewKundenUnterlageInput = Pick<
  KundenUnterlage,
  "name" | "size" | "mime_type" | "data_url"
>;

export function listUnterlagenForKunde(db: KundenDbState, kundenId: number): KundenUnterlage[] {
  return db.unterlagen
    .filter((x) => x.kunden_id === kundenId)
    .slice()
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
}

export function addKundenUnterlage(
  db: KundenDbState,
  kundenId: number,
  input: NewKundenUnterlageInput
): KundenDbState {
  const id = db.nextUnterlageId;
  const row: KundenUnterlage = {
    id,
    kunden_id: kundenId,
    name: input.name,
    size: input.size,
    mime_type: input.mime_type,
    uploaded_at: new Date().toISOString(),
    data_url: input.data_url,
  };
  return {
    ...db,
    unterlagen: [...db.unterlagen, row],
    nextUnterlageId: id + 1,
  };
}

export function removeKundenUnterlage(db: KundenDbState, unterlageId: number): KundenDbState {
  return {
    ...db,
    unterlagen: db.unterlagen.filter((u) => u.id !== unterlageId),
  };
}
