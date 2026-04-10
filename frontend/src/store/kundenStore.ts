import type {
  KundenBeziehung,
  KundenDbState,
  KundenDetailWithWash,
  KundenFieldChange,
  KundenHistoryEntry,
  KundenRisikoanalyse,
  KundenRolleRow,
  KundenStamm,
  KundenTermin,
  KundenUnterlage,
  KundenWashStamm,
  ViesCustomerSnapshot,
} from "../types/kunden";

export type { KundenHistoryEntry, KundenFieldChange };

const STORAGE_KEY = "dema-kunden-db";
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "")
  .trim()
  .replace(/\/+$/, "");
const API_MODE =
  ((import.meta.env.VITE_CUSTOMERS_SOURCE as string | undefined) ?? "").trim().toLowerCase() === "api";
const DEMO_API_KEY = (import.meta.env.VITE_DEMO_API_KEY as string | undefined) ?? "";

function demoApiUrl(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

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
    termine: [],
    beziehungen: [],
    risikoanalysen: [],
    history: [],
    nextKundeId: 16,
    nextWashId: 2,
    nextRolleId: 1,
    nextUnterlageId: 2,
    nextTerminId: 1,
    nextBeziehungId: 1,
    nextRisikoanalyseId: 1,
    nextHistoryId: 1,
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
  const t = (db as Partial<KundenDbState>).termine;
  const b = (db as Partial<KundenDbState>).beziehungen;
  const nt = (db as Partial<KundenDbState>).nextTerminId;
  const nb = (db as Partial<KundenDbState>).nextBeziehungId;
  const r = (db as Partial<KundenDbState>).risikoanalysen;
  const nr = (db as Partial<KundenDbState>).nextRisikoanalyseId;
  const h = (db as Partial<KundenDbState>).history;
  const nh = (db as Partial<KundenDbState>).nextHistoryId;
  return {
    ...db,
    unterlagen: Array.isArray(u) ? u : [],
    nextUnterlageId: typeof n === "number" && n >= 1 ? n : 1,
    termine: Array.isArray(t) ? t : [],
    beziehungen: Array.isArray(b) ? b : [],
    nextTerminId: typeof nt === "number" && nt >= 1 ? nt : 1,
    nextBeziehungId: typeof nb === "number" && nb >= 1 ? nb : 1,
    risikoanalysen: Array.isArray(r) ? r : [],
    nextRisikoanalyseId: typeof nr === "number" && nr >= 1 ? nr : 1,
    history: Array.isArray(h) ? h : [],
    nextHistoryId: typeof nh === "number" && nh >= 1 ? nh : 1,
  };
}

type DemoCustomersDbResponse = {
  state: KundenDbState | null;
  updated_at?: string | null;
};

type DemoCustomersDbConflictDetail = {
  code: "customers_db_conflict";
  message?: string;
  expected_updated_at?: string | null;
  actual_updated_at?: string | null;
};

type DemoCustomersDbErrorResponse = {
  detail?: unknown;
};

type CustomerHistoryApiResponse = {
  items?: unknown[];
};

let sharedCustomersUpdatedAt: string | null = null;

function normalizeUpdatedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeHistoryAction(raw: unknown): KundenHistoryEntry["action"] {
  if (raw === "created" || raw === "updated" || raw === "deleted" || raw === "restored") {
    return raw;
  }
  return "updated";
}

function normalizeHistoryChanges(raw: unknown): KundenFieldChange[] {
  if (!Array.isArray(raw)) return [];
  const out: KundenFieldChange[] = [];
  for (const row of raw) {
    const obj = asRecord(row);
    if (!obj) continue;
    const field = typeof obj.field === "string" ? obj.field.trim() : "";
    if (!field) continue;
    const labelKeyRaw = typeof obj.labelKey === "string" ? obj.labelKey.trim() : "";
    out.push({
      field,
      labelKey: labelKeyRaw || field,
      from: typeof obj.from === "string" ? obj.from : String(obj.from ?? ""),
      to: typeof obj.to === "string" ? obj.to : String(obj.to ?? ""),
    });
  }
  return out;
}

function normalizeHistoryEntryApi(raw: unknown, customerId: number): KundenHistoryEntry | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  const id = parseNumber(obj.id);
  const kundenIdRaw = parseNumber(obj.kunden_id ?? obj.customer_id);
  const timestampRaw = typeof obj.timestamp === "string" ? obj.timestamp.trim() : "";
  if (!id || !timestampRaw) return null;
  return {
    id,
    kunden_id: kundenIdRaw ?? customerId,
    timestamp: timestampRaw,
    action: normalizeHistoryAction(obj.action),
    editor_name: typeof obj.editor_name === "string" ? obj.editor_name : undefined,
    editor_email: typeof obj.editor_email === "string" ? obj.editor_email : undefined,
    changes: normalizeHistoryChanges(obj.changes),
  };
}

function extractCustomersDbConflictDetail(raw: unknown): DemoCustomersDbConflictDetail | null {
  const obj = asRecord(raw);
  if (!obj) return null;
  if (obj.code !== "customers_db_conflict") return null;
  return {
    code: "customers_db_conflict",
    message: typeof obj.message === "string" ? obj.message : undefined,
    expected_updated_at: normalizeUpdatedAt(obj.expected_updated_at),
    actual_updated_at: normalizeUpdatedAt(obj.actual_updated_at),
  };
}

export class CustomersDbConflictError extends Error {
  readonly code = "customers_db_conflict";
  readonly expectedUpdatedAt: string | null;
  readonly actualUpdatedAt: string | null;

  constructor(detail: DemoCustomersDbConflictDetail) {
    super(detail.message || "Shared customers data has changed since your last load.");
    this.name = "CustomersDbConflictError";
    this.expectedUpdatedAt = normalizeUpdatedAt(detail.expected_updated_at);
    this.actualUpdatedAt = normalizeUpdatedAt(detail.actual_updated_at);
  }
}

export function isCustomersDbConflictError(error: unknown): error is CustomersDbConflictError {
  return error instanceof CustomersDbConflictError;
}

function demoHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (DEMO_API_KEY.trim()) headers["x-demo-key"] = DEMO_API_KEY.trim();
  return headers;
}

export function isCustomersApiMode(): boolean {
  return API_MODE;
}

export async function loadSharedKundenDb(): Promise<KundenDbState | null> {
  if (!API_MODE) return null;
  const res = await fetch(demoApiUrl("/api/v1/demo/customers-db"), {
    method: "GET",
    headers: demoHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Shared customers load failed (${res.status})`);
  }
  const payload = (await res.json()) as DemoCustomersDbResponse;
  sharedCustomersUpdatedAt = normalizeUpdatedAt(payload?.updated_at);
  if (!payload?.state) return null;
  if (!isKundenDbState(payload.state)) {
    throw new Error("Shared customers payload has invalid shape");
  }
  return ensureSeedCustomers(normalizeUnterlagen(payload.state));
}

export async function saveSharedKundenDb(state: KundenDbState): Promise<KundenDbState> {
  if (!API_MODE) return state;
  // Backend `_is_kunden_db_state_shape` requires unterlagen + nextUnterlageId; normalize so PUT never omits them.
  const bodyState = normalizeUnterlagen(state);
  const requestBody: {
    state: KundenDbState;
    expected_updated_at?: string;
    source: string;
  } = {
    state: bodyState,
    source: "ui.customers-page",
  };
  if (sharedCustomersUpdatedAt) {
    requestBody.expected_updated_at = sharedCustomersUpdatedAt;
  }
  const res = await fetch(demoApiUrl("/api/v1/demo/customers-db"), {
    method: "PUT",
    headers: demoHeaders(),
    body: JSON.stringify(requestBody),
  });
  if (!res.ok) {
    if (res.status === 409) {
      const raw = (await res.json().catch(() => null)) as DemoCustomersDbErrorResponse | null;
      const detail = extractCustomersDbConflictDetail(raw?.detail);
      if (detail) {
        throw new CustomersDbConflictError(detail);
      }
    }
    throw new Error(`Shared customers save failed (${res.status})`);
  }
  const responseJson: DemoCustomersDbResponse = (await res.json()) as DemoCustomersDbResponse;
  if (!responseJson.state || !isKundenDbState(responseJson.state)) {
    throw new Error("Shared customers save response has invalid shape");
  }
  sharedCustomersUpdatedAt = normalizeUpdatedAt(responseJson.updated_at);
  return ensureSeedCustomers(normalizeUnterlagen(responseJson.state));
}

export async function loadOfficialCustomerHistory(customerId: number): Promise<KundenHistoryEntry[]> {
  if (!API_MODE) return [];
  const res = await fetch(demoApiUrl(`/api/v1/customers/${customerId}/history`), {
    method: "GET",
    headers: demoHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Customer history load failed (${res.status})`);
  }
  const payload = (await res.json()) as CustomerHistoryApiResponse;
  const rows = Array.isArray(payload.items) ? payload.items : [];
  const normalized = rows
    .map((row) => normalizeHistoryEntryApi(row, customerId))
    .filter((row): row is KundenHistoryEntry => row != null);
  return normalized.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
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
  return db.kunden
    .filter((k) => !k.deleted)
    .map((k) => ({
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

export function listDeletedRowsFromState(db: KundenDbState): KundenListRow[] {
  return db.kunden
    .filter((k) => k.deleted)
    .map((k) => ({
      kuNr: k.kunden_nr,
      firmenname: k.firmenname,
      termin: k.deleted_at ? k.deleted_at.slice(0, 10) : "—",
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

/** Normalize company name for timetable ↔ Kundenstamm matching. */
function normalizeTimetableCompanyKey(name: string): string {
  return name
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Resolve master customer for the purchase timetable contact drawer.
 * Prefers `contact_profile.customer_number` when it equals a live `kunden_nr`;
 * otherwise matches non-deleted `firmenname` (case- and space-insensitive).
 */
export function resolveKundeForTimetableRow(
  db: KundenDbState,
  companyName: string,
  profileCustomerNr?: string | null
): KundenStamm | null {
  const active = db.kunden.filter((k) => !k.deleted);
  const nr = profileCustomerNr?.trim();
  if (nr) {
    const byNr = active.find((k) => k.kunden_nr.trim() === nr);
    if (byNr) return byNr;
  }
  const key = normalizeTimetableCompanyKey(companyName);
  if (!key) return null;
  const byName = active.filter((k) => normalizeTimetableCompanyKey(k.firmenname) === key);
  if (byName.length === 0) return null;
  return byName[0];
}

/** Felder für neuen Kunden (ohne `id`; `kunden_nr` optional = automatisch). */
export type NewKundeInput = Pick<KundenStamm, "firmenname"> &
  Partial<Omit<KundenStamm, "id" | "firmenname">>;

/** Identifies the logged-in user performing a write operation (for audit trail). */
export type AuditEditor = { name: string; email: string };

/** KundenStamm boolean fields — values stored as "true"/"false" for history; UI may localize. */
export const BOOLEAN_KUNDEN_HISTORY_FIELDS = new Set<keyof KundenStamm>([
  "fzg_haendler",
  "juristische_person",
  "natuerliche_person",
  "faxen_flag",
  "consent_email",
  "consent_sms",
  "consent_phone",
  "payment_blocked",
  "direct_debit_enabled",
]);

/** All KundenStamm fields we track for diffs, paired with their i18n label key. */
const TRACKED_FIELDS: { key: keyof KundenStamm; labelKey: string }[] = [
  { key: "customer_type", labelKey: "historyFieldCustomerType" },
  { key: "status", labelKey: "historyFieldStatus" },
  { key: "firmenname", labelKey: "customersLabelCompany" },
  { key: "first_name", labelKey: "historyFieldFirstName" },
  { key: "last_name", labelKey: "historyFieldLastName" },
  { key: "profile_notes", labelKey: "historyFieldProfileNotes" },
  { key: "acquisition_source", labelKey: "historyFieldAcquisitionSource" },
  { key: "acquisition_source_entity", labelKey: "historyFieldAcquisitionSourceEntity" },
  { key: "acquisition_date", labelKey: "historyFieldAcquisitionDate" },
  { key: "lifecycle_stage", labelKey: "historyFieldLifecycleStage" },
  { key: "preferred_channel", labelKey: "historyFieldPreferredChannel" },
  { key: "segment", labelKey: "historyFieldSegment" },
  { key: "score", labelKey: "historyFieldScore" },
  { key: "consent_email", labelKey: "historyFieldConsentEmail" },
  { key: "consent_sms", labelKey: "historyFieldConsentSms" },
  { key: "consent_phone", labelKey: "historyFieldConsentPhone" },
  { key: "marketing_notes", labelKey: "historyFieldMarketingNotes" },
  { key: "customer_role", labelKey: "historyFieldCustomerRole" },
  { key: "role_valid_from", labelKey: "historyFieldRoleValidFrom" },
  { key: "role_valid_to", labelKey: "historyFieldRoleValidTo" },
  { key: "branche", labelKey: "customersLabelIndustry" },
  { key: "strasse", labelKey: "customersThStreet" },
  { key: "plz", labelKey: "customersLabelZip" },
  { key: "ort", labelKey: "customersLabelCity" },
  { key: "land_code", labelKey: "customersLabelCountry" },
  { key: "art_land_code", labelKey: "historyFieldArtLand" },
  { key: "ansprechpartner", labelKey: "customersLabelContact" },
  { key: "rolle_kontakt", labelKey: "historyFieldRolleKontakt" },
  { key: "telefonnummer", labelKey: "customersLabelPhone" },
  { key: "email", labelKey: "historyFieldEmail" },
  { key: "faxnummer", labelKey: "historyFieldFax" },
  { key: "internet_adr", labelKey: "historyFieldWebsite" },
  { key: "bemerkungen_kontakt", labelKey: "historyFieldBemerkungenKontakt" },
  { key: "art_kunde", labelKey: "historyFieldArtKunde" },
  { key: "buchungskonto_haupt", labelKey: "historyFieldBuchungskonto" },
  { key: "ust_id_nr", labelKey: "historyFieldUstId" },
  { key: "steuer_nr", labelKey: "historyFieldSteuerNr" },
  { key: "account_number", labelKey: "historyFieldAccountNumber" },
  { key: "credit_limit", labelKey: "historyFieldCreditLimit" },
  { key: "billing_name", labelKey: "historyFieldBillingName" },
  { key: "billing_street", labelKey: "historyFieldBillingStreet" },
  { key: "billing_postal_code", labelKey: "historyFieldBillingPostalCode" },
  { key: "billing_city", labelKey: "historyFieldBillingCity" },
  { key: "payment_blocked", labelKey: "historyFieldPaymentBlocked" },
  { key: "bank_name", labelKey: "historyFieldBankname" },
  { key: "bic", labelKey: "historyFieldBic" },
  { key: "iban", labelKey: "historyFieldIban" },
  { key: "direct_debit_enabled", labelKey: "historyFieldDirectDebitEnabled" },
  { key: "financial_notes", labelKey: "historyFieldFinancialNotes" },
  { key: "gesellschaftsform", labelKey: "historyFieldGesellschaft" },
  { key: "firmenvorsatz", labelKey: "historyFieldFirmenvorsatz" },
  { key: "fzg_haendler", labelKey: "historyFieldFzgHaendler" },
  { key: "juristische_person", labelKey: "historyFieldJuristischePerson" },
  { key: "natuerliche_person", labelKey: "historyFieldNatuerlichePerson" },
  { key: "faxen_flag", labelKey: "historyFieldFaxenFlag" },
  { key: "zustaendige_person_name", labelKey: "historyFieldZustaendig" },
  { key: "bemerkungen", labelKey: "historyFieldBemerkungen" },
  { key: "ansprache", labelKey: "historyFieldAnsprache" },
  { key: "aufnahme", labelKey: "historyFieldAufnahme" },
];

/** Wash profile booleans — same storage as customer booleans ("true"/"false"). */
export const BOOLEAN_WASH_HISTORY_FIELDS = new Set<keyof KundenWashStamm>([
  "kunde_gesperrt",
  "lastschrift",
]);

/** Waschanlage / wash profile fields shown in customer history. */
const TRACKED_WASH_FIELDS: { key: keyof KundenWashStamm; labelKey: string }[] = [
  { key: "bukto", labelKey: "historyWashBukto" },
  { key: "limit_betrag", labelKey: "historyWashLimit" },
  { key: "rechnung_zusatz", labelKey: "historyWashRechnungZusatz" },
  { key: "rechnung_plz", labelKey: "historyWashRechnungPlz" },
  { key: "rechnung_ort", labelKey: "historyWashRechnungOrt" },
  { key: "rechnung_strasse", labelKey: "historyWashRechnungStrasse" },
  { key: "kunde_gesperrt", labelKey: "historyWashKundeGesperrt" },
  { key: "bankname", labelKey: "historyWashBankname" },
  { key: "bic", labelKey: "historyWashBic" },
  { key: "iban", labelKey: "historyWashIban" },
  { key: "wichtige_infos", labelKey: "historyWashWichtigeInfos" },
  { key: "bemerkungen", labelKey: "historyWashBemerkungen" },
  { key: "lastschrift", labelKey: "historyWashLastschrift" },
  { key: "kennzeichen", labelKey: "historyWashKennzeichen" },
  { key: "wasch_fahrzeug_typ", labelKey: "historyWashFahrzeugTyp" },
  { key: "wasch_programm", labelKey: "historyWashProgramm" },
  { key: "netto_preis", labelKey: "historyWashNettoPreis" },
  { key: "brutto_preis", labelKey: "historyWashBruttoPreis" },
  { key: "wasch_intervall", labelKey: "historyWashIntervall" },
];

function fieldValueToHistoryString(
  key: keyof KundenStamm | keyof KundenWashStamm,
  val: unknown,
  booleanKeys: Set<string>
): string {
  if (val === undefined || val === null) return "";
  if (booleanKeys.has(String(key))) {
    return val === true ? "true" : val === false ? "false" : "";
  }
  if (typeof val === "number") {
    if (Number.isNaN(val)) return "";
    return String(val);
  }
  return String(val).trim();
}

function viesSnapshotToHistoryText(s: ViesCustomerSnapshot): string {
  const lines: string[] = [
    `valid: ${s.valid}`,
    `vat: ${s.country_code}${s.vat_number}`,
  ];
  if (s.name) lines.push(`name: ${s.name}`);
  if (s.address) lines.push(`address: ${s.address}`);
  if (s.request_date) lines.push(`requestDate: ${s.request_date}`);
  if (s.request_identifier) lines.push(`requestId: ${s.request_identifier}`);
  if (s.trader_details_available != null) {
    lines.push(`traderDetails: ${s.trader_details_available}`);
  }
  if (s.trader_name_match) lines.push(`nameMatch: ${s.trader_name_match}`);
  if (s.trader_street_match) lines.push(`streetMatch: ${s.trader_street_match}`);
  if (s.trader_postal_code_match) lines.push(`postalMatch: ${s.trader_postal_code_match}`);
  if (s.trader_city_match) lines.push(`cityMatch: ${s.trader_city_match}`);
  if (s.trader_company_type_match) lines.push(`companyTypeMatch: ${s.trader_company_type_match}`);
  lines.push(`savedAt: ${s.saved_at}`);
  return lines.join("\n");
}

function diffViesSnapshots(
  oldS: ViesCustomerSnapshot | null | undefined,
  newS: ViesCustomerSnapshot | null | undefined
): KundenFieldChange[] {
  const from = oldS ? viesSnapshotToHistoryText(oldS) : "";
  const to = newS ? viesSnapshotToHistoryText(newS) : "";
  if (from === to) return [];
  return [{ field: "vies_snapshot", labelKey: "historyFieldViesCheck", from, to }];
}

function computeKundenDiff(oldK: KundenStamm, newK: KundenStamm): KundenFieldChange[] {
  const boolSet = BOOLEAN_KUNDEN_HISTORY_FIELDS as unknown as Set<string>;
  const scalar = TRACKED_FIELDS.flatMap(({ key, labelKey }) => {
    const from = fieldValueToHistoryString(key, oldK[key], boolSet);
    const to = fieldValueToHistoryString(key, newK[key], boolSet);
    if (from === to) return [];
    return [{ field: String(key), labelKey, from, to }];
  });
  return [...scalar, ...diffViesSnapshots(oldK.vies_snapshot, newK.vies_snapshot)];
}

/** First save of a customer — list every non-empty tracked value (and VIES snapshot). */
function computeKundenDiffForCreate(row: KundenStamm): KundenFieldChange[] {
  const boolSet = BOOLEAN_KUNDEN_HISTORY_FIELDS as unknown as Set<string>;
  const scalar = TRACKED_FIELDS.flatMap(({ key, labelKey }) => {
    const to = fieldValueToHistoryString(key, row[key], boolSet);
    if (!to) return [];
    if (BOOLEAN_KUNDEN_HISTORY_FIELDS.has(key) && to !== "true") return [];
    return [{ field: String(key), labelKey, from: "", to }];
  });
  return [...scalar, ...diffViesSnapshots(undefined, row.vies_snapshot)];
}

function appendHistory(
  db: KundenDbState,
  kundenId: number,
  action: KundenHistoryEntry["action"],
  editor?: AuditEditor,
  changes?: KundenFieldChange[]
): KundenDbState {
  const entry: KundenHistoryEntry = {
    id: db.nextHistoryId ?? 1,
    kunden_id: kundenId,
    timestamp: new Date().toISOString(),
    action,
    editor_name: editor?.name,
    editor_email: editor?.email,
    changes: changes && changes.length > 0 ? changes : undefined,
  };
  return {
    ...db,
    history: [...(db.history ?? []), entry],
    nextHistoryId: (db.nextHistoryId ?? 1) + 1,
  };
}

/** Returns all history entries for a customer, newest first. */
export function listHistoryForKunde(db: KundenDbState, kundenId: number): KundenHistoryEntry[] {
  return (db.history ?? [])
    .filter((h) => h.kunden_id === kundenId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

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

export type CreateKundeHistoryOptions = {
  /** Extra lines (e.g. Waschanlage fields) appended to the "created" history entry. */
  washExtraChanges?: KundenFieldChange[];
};

export function createKunde(
  db: KundenDbState,
  input: NewKundeInput,
  editor?: AuditEditor,
  historyOpts?: CreateKundeHistoryOptions
): KundenDbState {
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
    created_by_name: editor?.name,
    created_by_email: editor?.email,
    last_edited_by_name: editor?.name,
    last_edited_by_email: editor?.email,
  };
  let next: KundenDbState = {
    ...db,
    kunden: [...db.kunden, row],
    nextKundeId: id + 1,
  };
  const createdChanges = [
    ...computeKundenDiffForCreate(row),
    ...(historyOpts?.washExtraChanges ?? []),
  ];
  next = appendHistory(
    next,
    id,
    "created",
    editor,
    createdChanges.length > 0 ? createdChanges : undefined
  );
  return next;
}

/** Soft-delete: marks the customer as deleted without removing any data. */
export function deleteKunde(db: KundenDbState, kundenId: number, editor?: AuditEditor): KundenDbState {
  const now = new Date().toISOString();
  const next: KundenDbState = {
    ...db,
    kunden: db.kunden.map((k) =>
      k.id === kundenId
        ? { ...k, deleted: true, deleted_at: now, updated_at: now, last_edited_by_name: editor?.name, last_edited_by_email: editor?.email }
        : k
    ),
  };
  return appendHistory(next, kundenId, "deleted", editor);
}

/** Restore a soft-deleted customer back to the active list. */
export function restoreKunde(db: KundenDbState, kundenId: number, editor?: AuditEditor): KundenDbState {
  const now = new Date().toISOString();
  const next: KundenDbState = {
    ...db,
    kunden: db.kunden.map((k) =>
      k.id === kundenId
        ? { ...k, deleted: false, deleted_at: undefined, updated_at: now, last_edited_by_name: editor?.name, last_edited_by_email: editor?.email }
        : k
    ),
  };
  return appendHistory(next, kundenId, "restored", editor);
}

/** Permanently removes a customer and all linked data — use only from the deleted view. */
export function purgeKunde(db: KundenDbState, kundenId: number): KundenDbState {
  return {
    ...db,
    kunden: db.kunden.filter((k) => k.id !== kundenId),
    kundenWash: db.kundenWash.filter((w) => w.kunden_id !== kundenId),
    unterlagen: db.unterlagen.filter((u) => u.kunden_id !== kundenId),
    rollen: db.rollen.filter((r) => r.kunden_id !== kundenId),
    termine: (db.termine ?? []).filter((t) => t.kunden_id !== kundenId),
    beziehungen: (db.beziehungen ?? []).filter(
      (b) => b.kunden_id !== kundenId && b.verknuepfter_kunden_id !== kundenId
    ),
    risikoanalysen: (db.risikoanalysen ?? []).filter((r) => r.kunden_id !== kundenId),
    history: (db.history ?? []).filter((h) => h.kunden_id !== kundenId),
  };
}

export type UpdateKundeHistoryOptions = {
  /** e.g. Waschanlage field diffs merged into the same "updated" history row. */
  extraChanges?: KundenFieldChange[];
};

export function updateKunde(
  db: KundenDbState,
  kunde: KundenStamm,
  editor?: AuditEditor,
  historyOpts?: UpdateKundeHistoryOptions
): KundenDbState {
  const now = new Date().toISOString();
  const oldKunde = db.kunden.find((k) => k.id === kunde.id);
  const stammChanges = oldKunde ? computeKundenDiff(oldKunde, kunde) : [];
  const changes = [...stammChanges, ...(historyOpts?.extraChanges ?? [])];
  const nextKunden = db.kunden.map((k) =>
    k.id === kunde.id
      ? {
          ...kunde,
          updated_at: now,
          last_edited_by_name: editor?.name ?? kunde.last_edited_by_name,
          last_edited_by_email: editor?.email ?? kunde.last_edited_by_email,
        }
      : k
  );
  if (!nextKunden.some((k) => k.id === kunde.id)) return db;
  const next: KundenDbState = { ...db, kunden: nextKunden };
  return appendHistory(next, kunde.id, "updated", editor, changes.length > 0 ? changes : undefined);
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
    | "netto_preis"
    | "brutto_preis"
    | "wasch_intervall"
  >
>;

/**
 * Merge wash upsert fields into a full row for diffing (mirrors `upsertKundenWash` merge rules).
 */
export function mergeWashStateForDiff(
  prev: KundenWashStamm | null | undefined,
  kundenId: number,
  fields: KundenWashUpsertFields
): KundenWashStamm {
  if (prev) {
    return { ...prev, ...fields, kunden_id: kundenId };
  }
  const now = new Date().toISOString();
  return {
    id: 0,
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
    netto_preis: fields.netto_preis,
    brutto_preis: fields.brutto_preis,
    wasch_intervall: fields.wasch_intervall,
    created_at: now,
    updated_at: now,
  };
}

export function computeKundenWashFieldDiff(
  oldW: KundenWashStamm | null | undefined,
  newW: KundenWashStamm | null | undefined
): KundenFieldChange[] {
  if (!newW) return [];
  const boolSet = BOOLEAN_WASH_HISTORY_FIELDS as unknown as Set<string>;
  return TRACKED_WASH_FIELDS.flatMap(({ key, labelKey }) => {
    const from = fieldValueToHistoryString(key, oldW?.[key], boolSet);
    const to = fieldValueToHistoryString(key, newW[key], boolSet);
    if (from === to) return [];
    return [{ field: `wash_${String(key)}`, labelKey, from, to }];
  });
}

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
    netto_preis: fields.netto_preis,
    brutto_preis: fields.brutto_preis,
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

// ─── Termine ────────────────────────────────────────────────────────────────

export type NewKundenTerminInput = Pick<KundenTermin, "datum" | "zeit" | "zweck">;

export function listTermineForKunde(db: KundenDbState, kundenId: number): KundenTermin[] {
  return (db.termine ?? [])
    .filter((t) => t.kunden_id === kundenId)
    .slice()
    .sort((a, b) => `${a.datum}T${a.zeit}`.localeCompare(`${b.datum}T${b.zeit}`));
}

export function addKundenTermin(
  db: KundenDbState,
  kundenId: number,
  input: NewKundenTerminInput
): KundenDbState {
  const id = db.nextTerminId ?? 1;
  const row: KundenTermin = {
    id,
    kunden_id: kundenId,
    datum: input.datum,
    zeit: input.zeit,
    zweck: input.zweck.trim(),
    erledigt: false,
    created_at: new Date().toISOString(),
  };
  return {
    ...db,
    termine: [...(db.termine ?? []), row],
    nextTerminId: id + 1,
  };
}

export function toggleTerminErledigt(db: KundenDbState, terminId: number): KundenDbState {
  return {
    ...db,
    termine: (db.termine ?? []).map((t) =>
      t.id === terminId ? { ...t, erledigt: !t.erledigt } : t
    ),
  };
}

export function removeKundenTermin(db: KundenDbState, terminId: number): KundenDbState {
  return {
    ...db,
    termine: (db.termine ?? []).filter((t) => t.id !== terminId),
  };
}

// ─── Beziehungen ────────────────────────────────────────────────────────────

export type NewKundenBeziehungInput = Pick<
  KundenBeziehung,
  "verknuepfter_kunden_id" | "art"
>;

export function listBeziehungenForKunde(db: KundenDbState, kundenId: number): KundenBeziehung[] {
  return (db.beziehungen ?? []).filter((b) => b.kunden_id === kundenId);
}

export function addKundenBeziehung(
  db: KundenDbState,
  kundenId: number,
  input: NewKundenBeziehungInput
): KundenDbState {
  const existing = db.beziehungen ?? [];
  // Prevent duplicate in either direction
  const alreadyExists = existing.some(
    (b) =>
      (b.kunden_id === kundenId && b.verknuepfter_kunden_id === input.verknuepfter_kunden_id) ||
      (b.kunden_id === input.verknuepfter_kunden_id && b.verknuepfter_kunden_id === kundenId)
  );
  if (alreadyExists) return db;

  const now = new Date().toISOString();
  let nextId = db.nextBeziehungId ?? 1;

  // Primary row: A → B (visible in A's panel)
  const primaryRow: KundenBeziehung = {
    id: nextId++,
    kunden_id: kundenId,
    verknuepfter_kunden_id: input.verknuepfter_kunden_id,
    art: input.art.trim(),
    created_at: now,
  };

  // Mirror row: B → A (visible in B's panel, same relationship type)
  const mirrorRow: KundenBeziehung = {
    id: nextId++,
    kunden_id: input.verknuepfter_kunden_id,
    verknuepfter_kunden_id: kundenId,
    art: input.art.trim(),
    created_at: now,
  };

  return {
    ...db,
    beziehungen: [...existing, primaryRow, mirrorRow],
    nextBeziehungId: nextId,
  };
}

export function removeKundenBeziehung(db: KundenDbState, beziehungId: number): KundenDbState {
  const existing = db.beziehungen ?? [];
  const target = existing.find((b) => b.id === beziehungId);
  if (!target) return db;

  // Remove both the selected row and its mirror in the opposite direction
  return {
    ...db,
    beziehungen: existing.filter(
      (b) =>
        b.id !== beziehungId &&
        !(b.kunden_id === target.verknuepfter_kunden_id && b.verknuepfter_kunden_id === target.kunden_id)
    ),
  };
}

// ─── Risikoanalyse ──────────────────────────────────────────────────────────

export type RisikoanalyseUpsertFields = Partial<
  Omit<KundenRisikoanalyse, "id" | "kunden_id" | "created_at" | "updated_at">
>;

export function getRisikoanalyseForKunde(
  db: KundenDbState,
  kundenId: number
): KundenRisikoanalyse | null {
  return (db.risikoanalysen ?? []).find((r) => r.kunden_id === kundenId) ?? null;
}

export function upsertRisikoanalyse(
  db: KundenDbState,
  kundenId: number,
  fields: RisikoanalyseUpsertFields
): KundenDbState {
  const now = new Date().toISOString();
  const risikoanalysen = db.risikoanalysen ?? [];
  const idx = risikoanalysen.findIndex((r) => r.kunden_id === kundenId);
  if (idx >= 0) {
    const prev = risikoanalysen[idx]!;
    const updated: KundenRisikoanalyse = { ...prev, ...fields, kunden_id: kundenId, updated_at: now };
    const next = [...risikoanalysen];
    next[idx] = updated;
    return { ...db, risikoanalysen: next };
  }
  const id = db.nextRisikoanalyseId ?? 1;
  const created: KundenRisikoanalyse = {
    id,
    kunden_id: kundenId,
    ...fields,
    created_at: now,
    updated_at: now,
  };
  return {
    ...db,
    risikoanalysen: [...risikoanalysen, created],
    nextRisikoanalyseId: id + 1,
  };
}

/** Days until a date string (ISO YYYY-MM-DD) from today. Negative = already expired. */
export function daysUntilExpiry(isoDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export type ExpiryStatus = "expired" | "critical" | "warning" | "ok" | "missing";

export type RiskDocDateFieldKey =
  | "reg_ausz"
  | "wirt_ber_erm"
  | "ausw_kop_wirt_ber"
  | "ausw_gueltig_bis"
  | "ausw_kop_abholer";

export type RiskDocRowDisplayStatus = ExpiryStatus | "recorded";

export function getExpiryStatus(isoDate: string | undefined): ExpiryStatus {
  if (!isoDate) return "missing";
  const days = daysUntilExpiry(isoDate);
  if (days < 0) return "expired";
  if (days <= 30) return "critical";
  if (days <= 60) return "warning";
  return "ok";
}

/**
 * Status shown in the risk-analysis document table.
 * Only `ausw_gueltig_bis` uses expiry buckets; other rows are "recorded" when any date is set.
 */
export function getRiskDocRowDisplayStatus(
  fieldKey: RiskDocDateFieldKey,
  isoDate: string | undefined
): RiskDocRowDisplayStatus {
  if (fieldKey === "ausw_gueltig_bis") {
    return getExpiryStatus(isoDate);
  }
  const s = (isoDate ?? "").trim();
  return s ? "recorded" : "missing";
}

/** Returns true only for Ausweis gültig bis expiry proximity (≤60 days) or expired. */
export function hasRisikoAlert(risk: KundenRisikoanalyse | null): boolean {
  if (!risk) return false;
  const v = risk.ausw_gueltig_bis;
  if (typeof v !== "string" || !v.trim()) return false;
  const s = getExpiryStatus(v);
  return s === "expired" || s === "critical" || s === "warning";
}
