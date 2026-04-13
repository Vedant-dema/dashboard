import { useEffect, useState, useCallback, useRef, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Droplets,
  BadgeCheck,
  Plus,
  Trash2,
  Car,
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  MapPin,
  Copy,
  Check,
  Clock,
  Building2,
  Landmark,
} from "lucide-react";
import {
  DocExtractBanner,
  KiBadge,
  ExtractedFieldWrapper,
  type ScanState,
} from "./DocExtractBanner";
import {
  type NewKundeInput,
  type KundenWashUpsertFields,
  type NewKundenUnterlageInput,
  type KundenHistoryEntry,
} from "../features/customers/repository/customerRepository";
import { CustomerHistoryTimeline } from "../features/customers/components/CustomerHistoryTimeline";
import type { CustomerFieldSuggestions } from "../store/customerFieldSuggestions";
import { SuggestTextInput } from "./SuggestTextInput";
import { GlobalAddressSearch, type GlobalAddressResult } from "./GlobalAddressSearch";
import type { DepartmentArea } from "../types/departmentArea";
import type {
  KundenAdresse,
  KundenKontakt,
  KundenRisikoanalyse,
  KundenStamm,
  KundenWashStamm,
  ViesCustomerSnapshot,
} from "../types/kunden";
import { safeWebsiteHref } from "../common/utils/websiteHref";
import { customerRepository } from "../features/customers/repository/customerRepository";
import {
  normalizeLatinAddressLine,
  titleCaseLatinAddressLine,
} from "../common/utils/addressLatinNormalize";
import {
  transliterateAddressToAscii,
  transliterateAddressToAsciiMultiline,
} from "../common/utils/addressTransliterate";
import {
  transliterateToAscii,
  transliterateToAsciiMultiline,
} from "../common/utils/transliterateToAscii";
import { commitAsciiNormalized } from "../common/utils/commitAsciiNormalized";
import { isViesProxyHttpErrorGarbage } from "../common/utils/viesProxyErrorText";
import { useLanguage } from "../contexts/LanguageContext";
import { normalizePhoneValue } from "../features/customers/mappers/customerFormMapper";

type TabId =
  | "vat"
  | "kunde"
  | "art"
  | "waschanlage"
  | "history"
  | "beziehungenFzg";

type KontaktEntry = {
  id: string;
  name: string;
  rolle: string;
  telefonCode: string;
  telefon: string;
  handyCode: string;
  handy: string;
  email: string;
  website: string;
  bemerkung: string;
};

const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+43", label: "🇦🇹 +43" },
  { code: "+41", label: "🇨🇭 +41" },
  { code: "+31", label: "🇳🇱 +31" },
  { code: "+48", label: "🇵🇱 +48" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+39", label: "🇮🇹 +39" },
  { code: "+34", label: "🇪🇸 +34" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+1",  label: "🇺🇸 +1"  },
  { code: "+90", label: "🇹🇷 +90" },
  { code: "+7",  label: "🇷🇺 +7"  },
  { code: "+32", label: "🇧🇪 +32" },
  { code: "+45", label: "🇩🇰 +45" },
  { code: "+46", label: "🇸🇪 +46" },
  { code: "+47", label: "🇳🇴 +47" },
  { code: "+358", label: "🇫🇮 +358" },
  { code: "+420", label: "🇨🇿 +420" },
  { code: "+36", label: "🇭🇺 +36" },
  { code: "+40", label: "🇷🇴 +40" },
  { code: "+30", label: "🇬🇷 +30" },
  { code: "+351", label: "🇵🇹 +351" },
  { code: "+380", label: "🇺🇦 +380" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+86",  label: "🇨🇳 +86"  },
  { code: "+81",  label: "🇯🇵 +81"  },
  { code: "+91",  label: "🇮🇳 +91"  },
];

function emptyKontakt(): KontaktEntry {
  return {
    id: Math.random().toString(36).slice(2),
    name: "",
    rolle: "",
    telefonCode: "+49",
    telefon: "",
    handyCode: "+49",
    handy: "",
    email: "",
    website: "",
    bemerkung: "",
  };
}

/**
 * Splits a stored phone string (e.g. "+49 123456") back into
 * { code, number } so the dropdown and text-box show correct values on edit.
 * Tries longest matching code first to avoid "+1" matching "+1x" numbers.
 */
function splitStoredPhone(
  stored: string | undefined
): { code: string; number: string } {
  const s = (stored ?? "").trim();
  if (!s) return { code: "+49", number: "" };
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const { code } of sorted) {
    if (s.startsWith(code + " ")) {
      return { code, number: s.slice(code.length + 1).trim() };
    }
    if (s === code) {
      return { code, number: "" };
    }
  }
  return { code: "+49", number: s };
}

function ensurePhoneIncludesCode(rawValue: string | undefined, code: string | undefined): string {
  const normalized = normalizePhoneValue(rawValue);
  if (!normalized) return "";
  if (normalized.startsWith("+")) return normalized;
  const cleanCode = normalizePhoneValue(code);
  if (!cleanCode) return normalized;
  if (normalized.startsWith(cleanCode)) return normalized;
  return `${cleanCode} ${normalized}`.trim();
}

function composePhoneForPayload(rawValue: string | undefined, _code: string | undefined): string {
  const normalized = normalizePhoneValue(rawValue);
  return normalized;
}

// ── Adresse ────────────────────────────────────────────────────────────────
type AdresseEntry = {
  id: string;
  typ: string;
  strasse: string;
  plz: string;
  ort: string;
  land_code: string;
  art_land_code: string;
  ust_id_nr: string;
  steuer_nr: string;
  branchen_nr: string;
};

const ADRESSE_TYPEN = ["Hauptadresse", "Lieferadresse", "Filiale", "Alte Hauptadresse", "Sonstiges"];

const ADRESSE_TYP_I18N: Record<string, [string, string]> = {
  Hauptadresse:      ["adresseTypHaupt",     "Main address"],
  Lieferadresse:     ["adresseTypLieferung",  "Delivery address"],
  Filiale:           ["adresseTypFiliale",    "Branch"],
  "Alte Hauptadresse": ["adresseTypAltHaupt", "Old main address"],
  Sonstiges:         ["adresseTypSonstiges",  "Other"],
};

const ADRESSE_COLORS: { dot: string; dotActive: string; activePill: string }[] = [
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
];

function emptyAdresse(typ = "Hauptadresse"): AdresseEntry {
  return {
    id: Math.random().toString(36).slice(2),
    typ,
    strasse: "",
    plz: "",
    ort: "",
    land_code: "DE",
    art_land_code: "IL",
    ust_id_nr: "",
    steuer_nr: "",
    branchen_nr: "",
  };
}

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/+$/, "");

const FOCUS_ID_FIRMENNAME = "new-kunde-field-firmenname";
const FOCUS_ID_STRASSE = "new-kunde-field-strasse";
const FOCUS_ID_UST = "new-kunde-field-ust-id";
const FOCUS_ID_KONTAKT_EMAIL = "new-kunde-field-kontakt-email";

function focusModalCustomerField(fieldId: string) {
  window.setTimeout(() => {
    const el = document.getElementById(fieldId);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (el instanceof HTMLElement && typeof el.focus === "function") {
      el.focus({ preventScroll: true });
    }
  }, 60);
}

/** EU / Northern Ireland codes accepted by VIES (VoW). */
const VIES_MS_OPTIONS: { code: string; label: string }[] = [
  { code: "AT", label: "Österreich" },
  { code: "BE", label: "Belgien" },
  { code: "BG", label: "Bulgarien" },
  { code: "CY", label: "Zypern" },
  { code: "CZ", label: "Tschechien" },
  { code: "DE", label: "Deutschland" },
  { code: "DK", label: "Dänemark" },
  { code: "EE", label: "Estland" },
  { code: "EL", label: "Griechenland (EL)" },
  { code: "ES", label: "Spanien" },
  { code: "FI", label: "Finnland" },
  { code: "FR", label: "Frankreich" },
  { code: "HR", label: "Kroatien" },
  { code: "HU", label: "Ungarn" },
  { code: "IE", label: "Irland" },
  { code: "IT", label: "Italien" },
  { code: "LT", label: "Litauen" },
  { code: "LU", label: "Luxemburg" },
  { code: "LV", label: "Lettland" },
  { code: "MT", label: "Malta" },
  { code: "NL", label: "Niederlande" },
  { code: "PL", label: "Polen" },
  { code: "PT", label: "Portugal" },
  { code: "RO", label: "Rumänien" },
  { code: "SE", label: "Schweden" },
  { code: "SI", label: "Slowenien" },
  { code: "SK", label: "Slowakei" },
  { code: "XI", label: "Nordirland (XI)" },
];

/** Official EU pages explaining what VIES returns (validity vs. name/address). */
const VIES_OFFICIAL = {
  yourEuropeDe:
    "https://europa.eu/youreurope/business/taxation/vat/check-vat-number-vies/index_de.htm",
  faq: "https://ec.europa.eu/taxation_customs/vies/faq.html",
} as const;

const WASH_PRICE_LIST_PDF_URL = "https://www.dema-nfz.de/de/Preisliste-Waschstrasse.pdf";

function ExternalDocLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
    >
      {children}
    </a>
  );
}

type ViesCheckResult = {
  valid: boolean;
  country_code: string;
  vat_number: string;
  name: string | null;
  address: string | null;
  request_date?: string | null;
  request_identifier?: string | null;
  /** Backend sets false when VIES only returned placeholders (e.g. ---) or omitted trader data. */
  trader_details_available?: boolean;
  /** Full JSON from VIES (when backend includes it). */
  vies_raw?: Record<string, unknown> | null;
  trader_name_match?: string | null;
  trader_street_match?: string | null;
  trader_postal_code_match?: string | null;
  trader_city_match?: string | null;
  trader_company_type_match?: string | null;
};

/** VIES / Germany often returns '---' with odd Unicode dashes; never treat that as real company data. */
function isMeaningfulViesText(s: string | null | undefined): boolean {
  if (s == null) return false;
  const t = String(s).trim();
  if (!t) return false;
  if (isViesProxyHttpErrorGarbage(t)) return false;
  if (/not\s+provided\s+by\s+vies/i.test(t)) return false;
  const low = t.toLowerCase();
  if (["---", "n/a", "na", "none", "...", "..", "-", "unknown"].includes(low)) return false;
  const core = t.replace(/[\s\-\u00ad\u2010-\u2015\u2212\u00a0·.]+/gu, "");
  return core.length > 0;
}

function firstNonEmptyStr(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

/** Gateways sometimes wrap the body as `{ data: { valid, … } }`. */
function unwrapViesCheckJsonEnvelope(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  for (const key of ["data", "result", "payload"] as const) {
    const inner = o[key];
    if (!inner || typeof inner !== "object" || Array.isArray(inner)) continue;
    const io = inner as Record<string, unknown>;
    if (
      "valid" in io ||
      "Valid" in io ||
      "country_code" in io ||
      "countryCode" in io ||
      "vat_number" in io ||
      "vatNumber" in io
    ) {
      return inner;
    }
  }
  return raw;
}

/**
 * JSON booleans must stay real booleans — `Boolean("false")` is true in JS, which hid the Apply button
 * and blocked merge while the network returned a string.
 */
function coerceViesCheckValid(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (v == null) return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no" || s === "") return false;
  }
  return Boolean(v);
}

function toTitleCaseLatin(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\b([a-z])([a-z]*)/g, (_m, a: string, b: string) => `${a.toUpperCase()}${b}`);
}

function normalizeVatNameForUi(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const latin = transliterateToAscii(raw).replace(/\s+/g, " ").trim();
  return latin ? toTitleCaseLatin(latin) : null;
}

function normalizeVatAddressForUi(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const lines = transliterateAddressToAsciiMultiline(raw)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return lines.length > 0 ? lines.join("\n") : null;
}

function looksAdministrativeAreaText(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  const ascii = transliterateAddressToAscii(raw).toLowerCase();
  return /\b(region|stadt|city|county|district|municipality|municipal|province|provincia|departamento|prefecture|oblast|obl|raion|rayon|okrug|gemeinde|grad|gr)\b/.test(
    ascii
  );
}

/** Allow Apply / payload merge when VAT is valid or trader text is present (some proxies mis-set `valid`). */
function viesResultAllowsFormMerge(r: ViesCheckResult | null | undefined): boolean {
  if (!r) return false;
  if (coerceViesCheckValid(r.valid)) return true;
  return isMeaningfulViesText(r.name) || isMeaningfulViesText(r.address);
}

/** Normalise `/vat/check` JSON whether keys are snake_case (FastAPI) or camelCase (proxies). */
function normalizeViesCheckResponseFromApi(raw: unknown): ViesCheckResult | null {
  const unwrapped = unwrapViesCheckJsonEnvelope(raw);
  if (!unwrapped || typeof unwrapped !== "object" || Array.isArray(unwrapped)) return null;
  const o = unwrapped as Record<string, unknown>;
  const vrTop = o.vies_raw ?? o.viesRaw;
  let vies_raw: Record<string, unknown> | null =
    vrTop && typeof vrTop === "object" && !Array.isArray(vrTop) ? (vrTop as Record<string, unknown>) : null;

  let cc = firstNonEmptyStr(o, "country_code", "countryCode").toUpperCase();
  let nr = firstNonEmptyStr(o, "vat_number", "vatNumber");
  if (vies_raw) {
    if (!cc) cc = firstNonEmptyStr(vies_raw, "countryCode", "country_code").toUpperCase();
    if (!nr) nr = firstNonEmptyStr(vies_raw, "vatNumber", "vat_number");
  }

  const nameS = normalizeVatNameForUi(firstNonEmptyStr(o, "name") || null);
  const addrS = normalizeVatAddressForUi(firstNonEmptyStr(o, "address") || null);
  const rd = firstNonEmptyStr(o, "request_date", "requestDate") || null;
  const rid = firstNonEmptyStr(o, "request_identifier", "requestIdentifier") || null;
  const tda = o.trader_details_available ?? o.traderDetailsAvailable;

  return {
    valid: coerceViesCheckValid(o.valid ?? o["Valid"]),
    country_code: cc,
    vat_number: nr,
    name: nameS,
    address: addrS,
    request_date: rd,
    request_identifier: rid,
    trader_details_available: typeof tda === "boolean" ? tda : Boolean(tda),
    vies_raw,
    trader_name_match: firstNonEmptyStr(o, "trader_name_match", "traderNameMatch") || null,
    trader_street_match: firstNonEmptyStr(o, "trader_street_match", "traderStreetMatch") || null,
    trader_postal_code_match: firstNonEmptyStr(o, "trader_postal_code_match", "traderPostalCodeMatch") || null,
    trader_city_match: firstNonEmptyStr(o, "trader_city_match", "traderCityMatch") || null,
    trader_company_type_match:
      firstNonEmptyStr(o, "trader_company_type_match", "traderCompanyTypeMatch") || null,
  };
}

/** Last line of a VIES address: postal code + city (EU + common variants). */
function tryPostalAndCity(lastLine: string): { plz: string; ort: string } | null {
  const t = lastLine.trim();
  const patterns: RegExp[] = [
    /^(\d{2}-\d{3})\s+(.+)$/i,
    /^(\d{3}\s?\d{2})\s+(.+)$/i,
    /^(\d{4}-\d{3})\s+(.+)$/i,
    /^([A-Z]\d{2}\s*[A-Z0-9]{4})\s*[,;]\s*(.+)$/i,
    /^([A-Z]\d{2}\s*[A-Z0-9]{4})\s*[-–—]\s*(.+)$/i,
    /^([A-Z]\d{2}\s*[A-Z0-9]{4})\s+(.+)$/i,
    /^([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\s+(.+)$/i,
    /^(\d{4}\s*[A-Z]{2})\s+(.+)$/i,
    /^(?:[A-Z]{1,2}-)?(\d{4,6})\s+(.+)$/i,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const plzPart = m[1]!.trim();
      const ortRaw = (m[2] ?? "")
        .trim()
        .replace(/^\s*[-–—]\s*/u, "")
        .trim();
      if (!ortRaw) continue;
      return { plz: plzPart, ort: ortRaw };
    }
  }
  return null;
}

/**
 * Bulgarian registry: `..., Gr.Plovdiv` / `..., гр. …` — Grad (city). No translation; keep `obl.` as Latin.
 */
function tryGradAbbrevTailCity(segment: string): string | null {
  const t = segment.trim();
  const latin = t.match(/^Gr\.?\s*(.+)$/i);
  if (latin) return latin[1]!.trim();
  const cy = t.match(/^гр\.?\s*(.+)$/iu);
  if (cy) return cy[1]!.trim();
  return null;
}

const VIES_RAW_TRADER_NEST_KEYS = ["msLookupRaw", "soapCheckRaw", "soapApproxRaw"] as const;

function digTraderAddressFieldsFromViesRaw(raw: Record<string, unknown>): {
  strasse?: string;
  plz?: string;
  ort?: string;
} {
  const buckets: Record<string, unknown>[] = [raw];
  for (const k of VIES_RAW_TRADER_NEST_KEYS) {
    const nest = raw[k];
    if (nest && typeof nest === "object" && !Array.isArray(nest)) {
      buckets.push(nest as Record<string, unknown>);
    }
  }
  let strasse = "";
  let plz = "";
  let ort = "";
  for (const o of buckets) {
    if (!strasse) strasse = firstNonEmptyStr(o, "traderStreet", "trader_street");
    if (!plz) {
      plz = firstNonEmptyStr(
        o,
        "traderPostalCode",
        "trader_postal_code",
        "postalCode",
        "postal_code",
        "traderPostcode"
      );
    }
    if (!ort) ort = firstNonEmptyStr(o, "traderCity", "trader_city");
  }
  return {
    strasse: strasse || undefined,
    plz: plz || undefined,
    ort: ort || undefined,
  };
}

function stripTrailingViesCountryLines(lines: string[]): string[] {
  const out = [...lines];
  while (out.length > 0) {
    const last = out[out.length - 1]!.trim();
    if (!last) {
      out.pop();
      continue;
    }
    if (tryPostalAndCity(last)) break;
    if (viesCountryNameLineToLandCode(last)) out.pop();
    else break;
  }
  return out;
}

function parseViesMultilineAddressBody(linesIn: string[]): {
  strasse?: string;
  plz?: string;
  ort?: string;
} {
  const lines = stripTrailingViesCountryLines(linesIn.map((l) => l.trim()).filter(Boolean));
  if (lines.length === 0) return {};

  for (let end = lines.length - 1; end >= 1; end--) {
    const combined = `${lines[end - 1]!} ${lines[end]!}`.replace(/\s+/g, " ").trim();
    const pc = tryPostalAndCity(combined);
    if (pc) {
      const streetLines = lines.slice(0, end - 1);
      const streetRaw =
        streetLines.length === 0 ? "" : streetLines.length > 1 ? streetLines.join(", ") : streetLines[0]!;
      return {
        strasse: streetRaw ? normalizeLatinAddressLine(streetRaw, "street") : undefined,
        plz: normalizeLatinAddressLine(pc.plz, "postal"),
        ort: normalizeLatinAddressLine(pc.ort, "city"),
      };
    }
  }

  for (let i = lines.length - 1; i >= 0; i--) {
    const pc = tryPostalAndCity(lines[i]!);
    if (pc) {
      const streetLines = lines.slice(0, i);
      const streetRaw =
        streetLines.length === 0
          ? ""
          : streetLines.length > 1
            ? streetLines.join(", ")
            : streetLines[0]!;
      return {
        strasse: streetRaw ? normalizeLatinAddressLine(streetRaw, "street") : undefined,
        plz: normalizeLatinAddressLine(pc.plz, "postal"),
        ort: normalizeLatinAddressLine(pc.ort, "city"),
      };
    }
  }

  if (lines.length >= 2) {
    const maybePlz = lines[lines.length - 2]!.trim();
    const maybeCity = lines[lines.length - 1]!.trim();
    const soloPlz =
      /^(\d{2}-\d{3}|\d{3}\s?\d{2}|\d{4}-\d{3}|\d{4}\s*[A-Z]{2}|[A-Z]\d{2}\s*[A-Z0-9]{4}|(?:[A-Z]{1,2}-)?\d{4,6})$/i.test(
        maybePlz
      );
    if (soloPlz && maybeCity && !tryPostalAndCity(maybeCity)) {
      const streetLines = lines.slice(0, -2);
      const streetRaw =
        streetLines.length === 0
          ? ""
          : streetLines.length > 1
            ? streetLines.join(", ")
            : streetLines[0]!;
      return {
        strasse: streetRaw ? normalizeLatinAddressLine(streetRaw, "street") : undefined,
        plz: normalizeLatinAddressLine(maybePlz, "postal"),
        ort: normalizeLatinAddressLine(maybeCity, "city"),
      };
    }
  }

  const lastLine = lines[lines.length - 1]!;
  const gradCity = tryGradAbbrevTailCity(lastLine);
  if (gradCity && lines.length >= 2) {
    const streetLines = lines.slice(0, -1);
    const streetRaw =
      streetLines.length === 1 ? streetLines[0]! : streetLines.join(", ");
    return {
      strasse: normalizeLatinAddressLine(streetRaw, "street"),
      ort: normalizeLatinAddressLine(gradCity, "city"),
    };
  }

  return {
    strasse: normalizeLatinAddressLine(lines[0]!, "street"),
    ort: normalizeLatinAddressLine(lines.slice(1).join(", "), "city"),
  };
}

function parseViesSingleLineAddress(one: string): { strasse?: string; plz?: string; ort?: string } {
  for (const sep of [",", ";"] as const) {
    const idx = one.lastIndexOf(sep);
    if (idx <= 0) continue;
    const left = one.slice(0, idx).trim();
    const right = one.slice(idx + 1).trim();
    const pc = tryPostalAndCity(right);
    if (pc && left.length > 0) {
      return {
        strasse: normalizeLatinAddressLine(left, "street"),
        plz: normalizeLatinAddressLine(pc.plz, "postal"),
        ort: normalizeLatinAddressLine(pc.ort, "city"),
      };
    }
    const gradOrt = tryGradAbbrevTailCity(right);
    if (gradOrt && left.length > 0) {
      return {
        strasse: normalizeLatinAddressLine(left, "street"),
        ort: normalizeLatinAddressLine(gradOrt, "city"),
      };
    }
  }
  const tokens = one.trim().split(/\s+/);
  if (tokens.length >= 3) {
    for (let n = 2; n <= Math.min(5, tokens.length - 1); n++) {
      const tryLine = tokens.slice(-n).join(" ");
      const pc = tryPostalAndCity(tryLine);
      if (pc) {
        const streetTokens = tokens.slice(0, -n);
        if (streetTokens.length > 0) {
          return {
            strasse: normalizeLatinAddressLine(streetTokens.join(" "), "street"),
            plz: normalizeLatinAddressLine(pc.plz, "postal"),
            ort: normalizeLatinAddressLine(pc.ort, "city"),
          };
        }
      }
    }
  }
  return { strasse: normalizeLatinAddressLine(one, "street") };
}

function parseViesAddress(block: string | null | undefined): {
  strasse?: string;
  plz?: string;
  ort?: string;
} {
  if (!block?.trim()) return {};
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return {};
  if (lines.length === 1) return parseViesSingleLineAddress(lines[0]!);
  return parseViesMultilineAddressBody(lines);
}

function normalizeStructuredViesAddressParts(parts: {
  strasse?: string;
  plz?: string;
  ort?: string;
}): {
  strasse?: string;
  plz?: string;
  ort?: string;
} {
  let { strasse, plz, ort } = parts;
  const cityLine = ort?.trim();
  if (cityLine && !plz?.trim()) {
    const split = tryPostalAndCity(cityLine);
    if (split) {
      plz = normalizeLatinAddressLine(split.plz, "postal");
      ort = normalizeLatinAddressLine(split.ort, "city");
    }
  }
  return { strasse, plz, ort };
}

function findOriginalAddressInViesRaw(raw: Record<string, unknown> | null): string | null {
  if (!raw) return null;
  const direct = firstNonEmptyStr(raw, "address", "traderAddress");
  if (isMeaningfulViesText(direct)) return direct;
  for (const key of VIES_RAW_TRADER_NEST_KEYS) {
    const nest = raw[key];
    if (!nest || typeof nest !== "object" || Array.isArray(nest)) continue;
    const d = firstNonEmptyStr(nest as Record<string, unknown>, "address", "traderAddress");
    if (isMeaningfulViesText(d)) return d;
  }
  return null;
}

function viesAddressSourceText(r: ViesCheckResult): string | null {
  const fromRaw = r.vies_raw ? findOriginalAddressInViesRaw(r.vies_raw) : null;
  if (fromRaw) return fromRaw;
  return isMeaningfulViesText(r.address) ? r.address!.trim() : null;
}

/** Title-case street/city for VIES split (parsed single-line path may skip normalizeLatinAddressLine). */
function finalizeViesFormAddressParts(parts: {
  strasse?: string;
  plz?: string;
  ort?: string;
}): { strasse?: string; plz?: string; ort?: string } {
  return {
    strasse: parts.strasse?.trim()
      ? titleCaseLatinAddressLine(parts.strasse.trim())
      : parts.strasse,
    plz: parts.plz?.trim() ? parts.plz.trim() : parts.plz,
    ort: parts.ort?.trim() ? titleCaseLatinAddressLine(parts.ort.trim()) : parts.ort,
  };
}

/** Prefer structured VoW fields from `vies_raw`, then parse the combined `address` string. */
function extractViesAddressForForm(r: ViesCheckResult): {
  strasse?: string;
  plz?: string;
  ort?: string;
} {
  let strasse: string | undefined;
  let plz: string | undefined;
  let ort: string | undefined;
  const raw = r.vies_raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    const dug = digTraderAddressFieldsFromViesRaw(o);
    if (dug.strasse) strasse = normalizeLatinAddressLine(dug.strasse, "street");
    if (dug.plz) plz = normalizeLatinAddressLine(dug.plz, "postal");
    if (dug.ort) ort = normalizeLatinAddressLine(dug.ort, "city");
  }
  ({ strasse, plz, ort } = normalizeStructuredViesAddressParts({ strasse, plz, ort }));
  const sourceAddress = viesAddressSourceText(r);
  const parsed = sourceAddress ? parseViesAddress(sourceAddress) : {};
  const structComplete =
    Boolean(strasse?.trim()) && Boolean(plz?.trim()) && Boolean(ort?.trim());
  if (structComplete) {
    return finalizeViesFormAddressParts({ strasse, plz, ort });
  }
  const parsedPlz = parsed.plz?.trim();
  const parsedStr = parsed.strasse?.trim();
  const rawPlzMissing = !plz?.trim();
  const streetLooksLikeFullLine =
    Boolean(strasse?.trim() && parsedPlz && strasse.includes(parsedPlz));
  const cityContainsPostalPrefix =
    Boolean(
      ort?.trim() &&
        parsedPlz &&
        ort.replace(/\s+/g, "").startsWith(parsedPlz.replace(/\s+/g, ""))
    );
  const structuredLooksAdministrative =
    looksAdministrativeAreaText(strasse) || looksAdministrativeAreaText(ort);
  if (
    parsedPlz &&
    parsedStr &&
    (rawPlzMissing || streetLooksLikeFullLine || cityContainsPostalPrefix || structuredLooksAdministrative)
  ) {
    return finalizeViesFormAddressParts({
      strasse: parsed.strasse,
      plz: plz?.trim() ? plz : parsed.plz,
      ort:
        cityContainsPostalPrefix || looksAdministrativeAreaText(ort)
          ? parsed.ort
          : ort?.trim()
            ? ort
            : parsed.ort,
    });
  }
  const merged = {
    strasse: strasse ?? parsed.strasse,
    plz: plz ?? parsed.plz,
    ort: ort ?? parsed.ort,
  };
  const hasAny = Boolean(
    merged.strasse?.trim() || merged.plz?.trim() || merged.ort?.trim()
  );
  if (!hasAny && sourceAddress) {
    const lines = sourceAddress.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const first = lines[0] ?? sourceAddress.trim();
    const s = normalizeLatinAddressLine(first, "street");
    if (s) return finalizeViesFormAddressParts({ strasse: s });
  }
  return finalizeViesFormAddressParts(merged);
}

function normalizeViesRequestDate(raw: string | null | undefined, locale = "en-GB"): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsedMs = Date.parse(trimmed);
  if (!Number.isNaN(parsedMs)) {
    return new Date(parsedMs).toLocaleString(locale, { dateStyle: "short", timeStyle: "medium" });
  }
  return trimmed;
}

const ZUSTAENDIGE_OPTIONS = [
  "nicht zugeordnet",
  "Liciu Ana-Maria",
  "Mitsos Deligiannis",
  "Anna Schmidt",
  "Team Verkauf",
];

const LAND_OPTIONS: { code: string; label: string }[] = [
  // Germany always first
  { code: "DE", label: "Deutschland" },
  // All other countries — alphabetical by German name
  { code: "AF", label: "Afghanistan" },
  { code: "EG", label: "Ägypten" },
  { code: "AL", label: "Albanien" },
  { code: "DZ", label: "Algerien" },
  { code: "AD", label: "Andorra" },
  { code: "AO", label: "Angola" },
  { code: "AG", label: "Antigua und Barbuda" },
  { code: "GQ", label: "Äquatorialguinea" },
  { code: "AR", label: "Argentinien" },
  { code: "AM", label: "Armenien" },
  { code: "AZ", label: "Aserbaidschan" },
  { code: "ET", label: "Äthiopien" },
  { code: "AU", label: "Australien" },
  { code: "BS", label: "Bahamas" },
  { code: "BH", label: "Bahrain" },
  { code: "BD", label: "Bangladesch" },
  { code: "BB", label: "Barbados" },
  { code: "BE", label: "Belgien" },
  { code: "BZ", label: "Belize" },
  { code: "BJ", label: "Benin" },
  { code: "BT", label: "Bhutan" },
  { code: "BO", label: "Bolivien" },
  { code: "BA", label: "Bosnien und Herzegowina" },
  { code: "BW", label: "Botswana" },
  { code: "BR", label: "Brasilien" },
  { code: "BN", label: "Brunei" },
  { code: "BG", label: "Bulgarien" },
  { code: "BF", label: "Burkina Faso" },
  { code: "BI", label: "Burundi" },
  { code: "CL", label: "Chile" },
  { code: "CN", label: "China" },
  { code: "CR", label: "Costa Rica" },
  { code: "DK", label: "Dänemark" },
  { code: "CD", label: "Demokratische Republik Kongo" },
  { code: "DJ", label: "Dschibuti" },
  { code: "DM", label: "Dominica" },
  { code: "DO", label: "Dominikanische Republik" },
  { code: "EC", label: "Ecuador" },
  { code: "SV", label: "El Salvador" },
  { code: "CI", label: "Elfenbeinküste" },
  { code: "ER", label: "Eritrea" },
  { code: "EE", label: "Estland" },
  { code: "SZ", label: "Eswatini" },
  { code: "FJ", label: "Fidschi" },
  { code: "FI", label: "Finnland" },
  { code: "FR", label: "Frankreich" },
  { code: "GA", label: "Gabun" },
  { code: "GM", label: "Gambia" },
  { code: "GE", label: "Georgien" },
  { code: "GH", label: "Ghana" },
  { code: "GD", label: "Grenada" },
  { code: "GR", label: "Griechenland" },
  { code: "GT", label: "Guatemala" },
  { code: "GN", label: "Guinea" },
  { code: "GW", label: "Guinea-Bissau" },
  { code: "GY", label: "Guyana" },
  { code: "HT", label: "Haiti" },
  { code: "HN", label: "Honduras" },
  { code: "IN", label: "Indien" },
  { code: "ID", label: "Indonesien" },
  { code: "IQ", label: "Irak" },
  { code: "IR", label: "Iran" },
  { code: "IE", label: "Irland" },
  { code: "IS", label: "Island" },
  { code: "IL", label: "Israel" },
  { code: "IT", label: "Italien" },
  { code: "JM", label: "Jamaika" },
  { code: "JP", label: "Japan" },
  { code: "YE", label: "Jemen" },
  { code: "JO", label: "Jordanien" },
  { code: "KH", label: "Kambodscha" },
  { code: "CM", label: "Kamerun" },
  { code: "CA", label: "Kanada" },
  { code: "CV", label: "Kap Verde" },
  { code: "KZ", label: "Kasachstan" },
  { code: "QA", label: "Katar" },
  { code: "KE", label: "Kenia" },
  { code: "KG", label: "Kirgisistan" },
  { code: "KI", label: "Kiribati" },
  { code: "CO", label: "Kolumbien" },
  { code: "KM", label: "Komoren" },
  { code: "CG", label: "Republik Kongo" },
  { code: "KP", label: "Nordkorea" },
  { code: "KR", label: "Südkorea" },
  { code: "HR", label: "Kroatien" },
  { code: "CU", label: "Kuba" },
  { code: "KW", label: "Kuwait" },
  { code: "LA", label: "Laos" },
  { code: "LS", label: "Lesotho" },
  { code: "LV", label: "Lettland" },
  { code: "LB", label: "Libanon" },
  { code: "LR", label: "Liberia" },
  { code: "LY", label: "Libyen" },
  { code: "LI", label: "Liechtenstein" },
  { code: "LT", label: "Litauen" },
  { code: "LU", label: "Luxemburg" },
  { code: "MG", label: "Madagaskar" },
  { code: "MW", label: "Malawi" },
  { code: "MY", label: "Malaysia" },
  { code: "MV", label: "Malediven" },
  { code: "ML", label: "Mali" },
  { code: "MT", label: "Malta" },
  { code: "MA", label: "Marokko" },
  { code: "MH", label: "Marshallinseln" },
  { code: "MR", label: "Mauretanien" },
  { code: "MU", label: "Mauritius" },
  { code: "MX", label: "Mexiko" },
  { code: "FM", label: "Mikronesien" },
  { code: "MD", label: "Moldau" },
  { code: "MC", label: "Monaco" },
  { code: "MN", label: "Mongolei" },
  { code: "ME", label: "Montenegro" },
  { code: "MZ", label: "Mosambik" },
  { code: "MM", label: "Myanmar" },
  { code: "NA", label: "Namibia" },
  { code: "NR", label: "Nauru" },
  { code: "NP", label: "Nepal" },
  { code: "NZ", label: "Neuseeland" },
  { code: "NI", label: "Nicaragua" },
  { code: "NL", label: "Niederlande" },
  { code: "NE", label: "Niger" },
  { code: "NG", label: "Nigeria" },
  { code: "XI", label: "Nordirland (XI)" },
  { code: "MK", label: "Nordmazedonien" },
  { code: "NO", label: "Norwegen" },
  { code: "AT", label: "Österreich" },
  { code: "OM", label: "Oman" },
  { code: "PK", label: "Pakistan" },
  { code: "PW", label: "Palau" },
  { code: "PA", label: "Panama" },
  { code: "PG", label: "Papua-Neuguinea" },
  { code: "PY", label: "Paraguay" },
  { code: "PE", label: "Peru" },
  { code: "PH", label: "Philippinen" },
  { code: "PL", label: "Polen" },
  { code: "PT", label: "Portugal" },
  { code: "RW", label: "Ruanda" },
  { code: "RO", label: "Rumänien" },
  { code: "RU", label: "Russland" },
  { code: "SB", label: "Salomonen" },
  { code: "ZM", label: "Sambia" },
  { code: "WS", label: "Samoa" },
  { code: "SM", label: "San Marino" },
  { code: "ST", label: "São Tomé und Príncipe" },
  { code: "SA", label: "Saudi-Arabien" },
  { code: "SE", label: "Schweden" },
  { code: "CH", label: "Schweiz" },
  { code: "SN", label: "Senegal" },
  { code: "RS", label: "Serbien" },
  { code: "SC", label: "Seychellen" },
  { code: "SL", label: "Sierra Leone" },
  { code: "ZW", label: "Simbabwe" },
  { code: "SG", label: "Singapur" },
  { code: "SK", label: "Slowakei" },
  { code: "SI", label: "Slowenien" },
  { code: "SO", label: "Somalia" },
  { code: "ES", label: "Spanien" },
  { code: "LK", label: "Sri Lanka" },
  { code: "KN", label: "St. Kitts und Nevis" },
  { code: "LC", label: "St. Lucia" },
  { code: "VC", label: "St. Vincent und die Grenadinen" },
  { code: "ZA", label: "Südafrika" },
  { code: "SS", label: "Südsudan" },
  { code: "SD", label: "Sudan" },
  { code: "SR", label: "Suriname" },
  { code: "SY", label: "Syrien" },
  { code: "TJ", label: "Tadschikistan" },
  { code: "TW", label: "Taiwan" },
  { code: "TZ", label: "Tansania" },
  { code: "TH", label: "Thailand" },
  { code: "TL", label: "Timor-Leste" },
  { code: "TG", label: "Togo" },
  { code: "TO", label: "Tonga" },
  { code: "TT", label: "Trinidad und Tobago" },
  { code: "TD", label: "Tschad" },
  { code: "CZ", label: "Tschechien" },
  { code: "TN", label: "Tunesien" },
  { code: "TR", label: "Türkei" },
  { code: "TM", label: "Turkmenistan" },
  { code: "TV", label: "Tuvalu" },
  { code: "UG", label: "Uganda" },
  { code: "UA", label: "Ukraine" },
  { code: "HU", label: "Ungarn" },
  { code: "UY", label: "Uruguay" },
  { code: "UZ", label: "Usbekistan" },
  { code: "VU", label: "Vanuatu" },
  { code: "VE", label: "Venezuela" },
  { code: "AE", label: "Vereinigte Arabische Emirate" },
  { code: "US", label: "Vereinigte Staaten" },
  { code: "GB", label: "Vereinigtes Königreich" },
  { code: "VN", label: "Vietnam" },
  { code: "BY", label: "Weißrussland (Belarus)" },
  { code: "CF", label: "Zentralafrikanische Republik" },
  { code: "CY", label: "Zypern" },
];

type ContinentId = "europe" | "asia" | "africa" | "northAmerica" | "southAmerica" | "oceania";

const CONTINENT_ORDER: ContinentId[] = [
  "europe",
  "asia",
  "africa",
  "northAmerica",
  "southAmerica",
  "oceania",
];

const COUNTRY_CONTINENT_BY_CODE: Record<string, ContinentId> = {
  DE: "europe", AL: "europe", AD: "europe", AM: "europe", AT: "europe", AZ: "europe", BE: "europe",
  BA: "europe", BG: "europe", BY: "europe", HR: "europe", CY: "europe", CZ: "europe", DK: "europe",
  EE: "europe", FI: "europe", FR: "europe", GE: "europe", GR: "europe", HU: "europe", IS: "europe",
  IE: "europe", IT: "europe", LV: "europe", LI: "europe", LT: "europe", LU: "europe", MT: "europe",
  MD: "europe", MC: "europe", ME: "europe", MK: "europe", NL: "europe", XI: "europe", NO: "europe",
  PL: "europe", PT: "europe", RO: "europe", RU: "europe", SM: "europe", RS: "europe", SK: "europe",
  SI: "europe", ES: "europe", SE: "europe", CH: "europe", TR: "europe", UA: "europe", GB: "europe",
  AF: "asia", BH: "asia", BD: "asia", BT: "asia", BN: "asia", KH: "asia", CN: "asia", IN: "asia",
  ID: "asia", IR: "asia", IQ: "asia", IL: "asia", JP: "asia", JO: "asia", KZ: "asia", KW: "asia",
  KG: "asia", LA: "asia", LB: "asia", MY: "asia", MV: "asia", MN: "asia", MM: "asia", NP: "asia",
  KP: "asia", KR: "asia", OM: "asia", PK: "asia", PH: "asia", QA: "asia", SA: "asia", SG: "asia",
  LK: "asia", SY: "asia", TW: "asia", TJ: "asia", TH: "asia", TL: "asia", TM: "asia", AE: "asia",
  UZ: "asia", VN: "asia", YE: "asia",
  DZ: "africa", AO: "africa", BJ: "africa", BW: "africa", BF: "africa", BI: "africa", CM: "africa",
  CV: "africa", CF: "africa", TD: "africa", KM: "africa", CG: "africa", CD: "africa", CI: "africa",
  DJ: "africa", EG: "africa", GQ: "africa", ER: "africa", SZ: "africa", ET: "africa", GA: "africa",
  GM: "africa", GH: "africa", GN: "africa", GW: "africa", KE: "africa", LS: "africa", LR: "africa",
  LY: "africa", MG: "africa", MW: "africa", ML: "africa", MR: "africa", MU: "africa", MA: "africa",
  MZ: "africa", NA: "africa", NE: "africa", NG: "africa", RW: "africa", ST: "africa", SN: "africa",
  SC: "africa", SL: "africa", SO: "africa", ZA: "africa", SS: "africa", SD: "africa", TZ: "africa",
  TG: "africa", TN: "africa", UG: "africa", ZM: "africa", ZW: "africa",
  AG: "northAmerica", BS: "northAmerica", BB: "northAmerica", BZ: "northAmerica", CA: "northAmerica",
  CR: "northAmerica", CU: "northAmerica", DM: "northAmerica", DO: "northAmerica", SV: "northAmerica",
  GD: "northAmerica", GT: "northAmerica", HT: "northAmerica", HN: "northAmerica", JM: "northAmerica",
  MX: "northAmerica", NI: "northAmerica", PA: "northAmerica", KN: "northAmerica", LC: "northAmerica",
  VC: "northAmerica", TT: "northAmerica", US: "northAmerica",
  AR: "southAmerica", BO: "southAmerica", BR: "southAmerica", CL: "southAmerica", CO: "southAmerica",
  EC: "southAmerica", GY: "southAmerica", PY: "southAmerica", PE: "southAmerica", SR: "southAmerica",
  UY: "southAmerica", VE: "southAmerica",
  AU: "oceania", FJ: "oceania", KI: "oceania", MH: "oceania", FM: "oceania", NR: "oceania",
  NZ: "oceania", PW: "oceania", PG: "oceania", WS: "oceania", SB: "oceania", TO: "oceania",
  TV: "oceania", VU: "oceania",
};

const LAND_CODE_SET = new Set(LAND_OPTIONS.map((l) => l.code));

/** German (and parenthetical) labels from `LAND_OPTIONS` → ISO code for matching VIES country lines. */
const LAND_LABEL_TO_CODE: Map<string, string> = (() => {
  const m = new Map<string, string>();
  const fold = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\s+/g, " ");
  for (const { code, label } of LAND_OPTIONS) {
    const noParen = label.replace(/\s*\([^)]*\)\s*/g, "").trim();
    m.set(fold(label), code);
    m.set(fold(noParen), code);
  }
  return m;
})();

function foldCountryLabelKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Two-letter member-state / ISO code from a string (empty if not exactly A–Z × 2). */
function normalizeAlpha2Country(s: string | null | undefined): string {
  const t = String(s ?? "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(t) ? t : "";
}

/** Map a VIES address footer (country name or `DE`-style code) to a `land_code` in `LAND_OPTIONS`. */
function viesCountryNameLineToLandCode(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  const iso = normalizeAlpha2Country(trimmed);
  if (iso && LAND_CODE_SET.has(iso)) return iso;
  const fromDe = LAND_LABEL_TO_CODE.get(foldCountryLabelKey(trimmed.replace(/\s*\([^)]*\)\s*/g, "")));
  if (fromDe) return fromDe;
  const lower = trimmed.toLowerCase();
  for (const loc of ["en", "de", "fr"] as const) {
    try {
      const dn = new Intl.DisplayNames([loc], { type: "region" });
      for (const code of LAND_CODE_SET) {
        const lbl = dn.of(code);
        if (!lbl) continue;
        if (lbl.toLowerCase() === lower || foldCountryLabelKey(lbl) === foldCountryLabelKey(trimmed)) {
          return code;
        }
      }
    } catch {
      /* Intl.DisplayNames unsupported */
    }
  }
  return "";
}

/** Read `countryCode` / `country` from VIES raw JSON (root, nested `address`, `data`, trader blocks). */
function digCountryCodeFromViesRaw(raw: Record<string, unknown> | null | undefined): string {
  if (!raw) return "";
  const fromObj = (o: Record<string, unknown>): string => {
    const c = normalizeAlpha2Country(
      firstNonEmptyStr(o, "countryCode", "country_code", "memberStateCode", "member_state_code")
    );
    if (c) return c;
    const cn = firstNonEmptyStr(o, "country");
    return viesCountryNameLineToLandCode(cn);
  };
  const root = fromObj(raw);
  if (root) return root;
  for (const k of ["address", "traderAddress", "trader_address", "data"] as const) {
    const nest = raw[k];
    if (!nest || typeof nest !== "object" || Array.isArray(nest)) continue;
    const got = fromObj(nest as Record<string, unknown>);
    if (got) return got;
  }
  return "";
}

/** If the last line of a multiline VIES address is a country (not PLZ+Ort), resolve it to a land code. */
function tryCountryCodeFromViesAddressFooter(address: string | null | undefined): string {
  if (!address?.trim()) return "";
  const lines = address
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  if (lines.length === 1) {
    const parts = lines[0]!.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const tail = parts[parts.length - 1]!;
      if (!tryPostalAndCity(tail)) {
        const c = viesCountryNameLineToLandCode(tail);
        if (c) return c;
      }
    }
    return "";
  }
  const last = lines[lines.length - 1]!;
  if (tryPostalAndCity(last)) return "";
  return viesCountryNameLineToLandCode(last);
}

/**
 * Land (country) for the form: top-level `country_code`, then `vies_raw`, then address footer, then VAT-tab dropdown.
 * Only returns codes present in `LAND_OPTIONS`.
 */
function extractViesCountryCodeForForm(r: ViesCheckResult, viesMemberStateFallback: string): string {
  const chain = [
    String(r.country_code ?? "").trim().toUpperCase(),
    digCountryCodeFromViesRaw(r.vies_raw ?? null),
    tryCountryCodeFromViesAddressFooter(r.address),
    String(viesMemberStateFallback ?? "").trim().toUpperCase(),
  ];
  for (const c of chain) {
    if (!c) continue;
    const land = viesLandToFormLand(c);
    if (land) return land;
  }
  return "";
}

/** Two-letter prefix for USt-IdNr. (may be valid VoW code even if not in `LAND_OPTIONS`). */
function viesAlpha2ForUst(r: ViesCheckResult, viesMemberStateFallback: string): string {
  // Keep the exact VIES member-state prefix for VAT IDs (e.g. EL for Greece).
  // Address-land mapping (EL -> GR) is only for the country picker, never for USt prefix.
  const chain = [
    String(r.country_code ?? "").trim().toUpperCase(),
    digCountryCodeFromViesRaw(r.vies_raw ?? null),
    String(viesMemberStateFallback ?? "").trim().toUpperCase(),
  ];
  for (const c of chain) {
    const a = normalizeAlpha2Country(c);
    if (a) return a;
  }
  return "";
}

/** Map VIES `country_code` to a `land_code` that exists in `LAND_OPTIONS` (never use a synthetic code). */
function viesLandToFormLand(viesCode: string | null | undefined): string {
  const c = String(viesCode ?? "")
    .trim()
    .toUpperCase();
  if (!c) return "";
  // VIES uses EL for Greece; the address list uses ISO GR.
  const normalized = c === "EL" ? "GR" : c;
  return LAND_CODE_SET.has(normalized) ? normalized : "";
}

/** EU member state codes (excluding DE which maps to IL). GR and EL both included (ISO vs. VIES). */
const EU_LAND_CODES = new Set(["AT", "BE", "BG", "CY", "CZ", "DK", "EE", "EL", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI"]);

function landCodeToArtLand(landCode: string): string {
  if (landCode === "DE") return "IL";
  if (EU_LAND_CODES.has(landCode)) return "EU";
  return "Drittland";
}

const ART_LAND_OPTIONS = ["IL", "EU", "Drittland"];

const KONTAKT_COLORS: { dot: string; dotActive: string; activePill: string }[] = [
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
  { dot: "bg-slate-400", dotActive: "bg-slate-500", activePill: "bg-slate-700" },
];

type WashProgramOption = {
  label: string;
  netto: number;
  brutto: number;
};

const WASCH_PROGRAMME: WashProgramOption[] = [
  { label: "1* Kleinbus/Transporter Kasten (bis 3,5t)", netto: 21.85, brutto: 26.0 },
  { label: "2* LKW mit Aufbau (Koffer/Plane/Kuehlk.) ab 3,5t bis 7t", netto: 28.57, brutto: 34.0 },
  { label: "3* LKW mit Aufbau (Koffer/Plane) ab 7t", netto: 34.45, brutto: 41.0 },
  { label: "3* Anhaenger (Koffer/Plane/Lafette)", netto: 34.45, brutto: 41.0 },
  { label: "3* Omnibus bis 6m", netto: 34.45, brutto: 41.0 },
  { label: "4* Sattelzugmaschine", netto: 41.18, brutto: 49.0 },
  { label: "5* LKW ohne Aufbau (Fahrgestell oder BDF)", netto: 50.42, brutto: 60.0 },
  { label: "5* Auflieger (Koffer/Plane/Kipper)", netto: 50.42, brutto: 60.0 },
  { label: "6* LKW mit Aufbau (Koffer/Plane) und Anhaenger", netto: 68.91, brutto: 82.0 },
  { label: "6* Sattelzug komplett", netto: 68.91, brutto: 82.0 },
  { label: "6* Omnibus ueber 6m", netto: 68.91, brutto: 82.0 },
  { label: "6* Muellwagen", netto: 68.91, brutto: 82.0 },
  { label: "7* LKW ohne Aufbau (Fahrgestell oder BDF) mit Lafette", netto: 84.03, brutto: 100.0 },
  { label: "7* LKW ohne Aufbau (Fahrgestell oder BDF) mit Anhaenger", netto: 84.03, brutto: 100.0 },
  { label: "7* LKW mit Aufbau (Fahrgestell oder BDF) mit Lafette", netto: 84.03, brutto: 100.0 },
  { label: "7* Tank- und Silofahrzeuge", netto: 84.03, brutto: 100.0 },
  { label: "7* SZM mit Auflieger ohne Aufbau", netto: 84.03, brutto: 100.0 },
  { label: "8* Tank- und Silozuege", netto: 103.36, brutto: 123.0 },
  { label: "S1* Innenreinigung", netto: 40.0, brutto: 47.6 },
  { label: "S2* Innen + Aussen Polizei", netto: 61.85, brutto: 73.6 },
];

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  if (!t || t === "—") return undefined;
  return t;
}

function moneyToUndef(v: string): number | undefined {
  const normalized = v.trim().replace(",", ".");
  if (!normalized) return undefined;
  const n = Number(normalized);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function priceToInput(v: number): string {
  return v.toFixed(2).replace(".", ",");
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function formatFileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

type AcquisitionSourceForm = "" | "referral" | "website" | "email" | "call";
type CustomerTypeForm = "" | "legal_entity" | "natural_person";
type CustomerStatusForm = "" | "active" | "inactive" | "blocked";
type LifecycleStageForm = "" | "lead" | "qualified" | "active" | "inactive" | "vip" | "lost";
type ChannelTypeForm = "" | "email" | "phone" | "sms" | "whatsapp" | "mixed" | "none";
type CustomerRoleForm = "" | "supplier" | "buyer" | "workshop" | "wash";

function initialForm() {
  return {
    aufnahme: "",
    customer_type: "" as CustomerTypeForm,
    customer_status: "active" as CustomerStatusForm,
    branche: "",
    acquisition_source: "" as AcquisitionSourceForm,
    acquisition_source_entity: "",
    fzgHandel: "" as "" | "ja" | "nein",
    juristische_person: false,
    natuerliche_person: false,
    gesellschaftsform: "",
    firmenvorsatz: "",
    firmenname: "",
    first_name: "",
    last_name: "",
    profile_notes: "",
    bemerkungen: "",
    acquisition_date: "",
    lifecycle_stage: "" as LifecycleStageForm,
    preferred_channel: "" as ChannelTypeForm,
    segment: "",
    score: "",
    consent_email: false,
    consent_sms: false,
    consent_phone: false,
    marketing_notes: "",
    customer_role: "" as CustomerRoleForm,
    role_valid_from: "",
    role_valid_to: "",
    zustaendige_person_name: "nicht zugeordnet",
    adressen: [emptyAdresse()] as AdresseEntry[],
    internet_adr: "",
    kontakte: [emptyKontakt()] as KontaktEntry[],
    art_kunde: "",
    buchungskonto_haupt: "",
    tax_country_type_code: "",
    account_number: "",
    credit_limit: "",
    billing_name: "",
    billing_street: "",
    billing_postal_code: "",
    billing_city: "",
    payment_blocked: false,
    bank_name: "",
    bic: "",
    iban: "",
    direct_debit_enabled: false,
    financial_notes: "",
    includeWashProfile: false,
    wash_bukto: "",
    wash_limit: "0",
    wash_rechnung_zusatz: "",
    wash_rechnung_plz: "",
    wash_rechnung_ort: "",
    wash_rechnung_strasse: "",
    wash_kunde_gesperrt: false,
    wash_kennzeichen_list: [] as string[],
    wash_kennzeichen_new: "",
    wasch_programm: "",
    wash_netto_preis: "",
    wash_brutto_preis: "",
    wasch_intervall: "",
    wash_bankname: "",
    wash_bic: "",
    wash_iban: "",
    wash_wichtige_infos: "",
    wash_bemerkungen: "",
    wash_lastschrift: false,
    wash_vehicle_type: "",
  };
}

type FormState = ReturnType<typeof initialForm>;

/** Stable string compare for unsaved-edit detection (edit mode). */
function serializeFormStateForDirtyBaseline(state: FormState): string {
  return JSON.stringify(state);
}

/** Heuristic profile completeness for Customer 360 summary (0–100). */
function computeCustomerProfileCompletionPct(state: FormState): number {
  const a0 = state.adressen[0];
  const k0 = state.kontakte[0];
  const checks = [
    () => Boolean(state.firmenname.trim()),
    () => Boolean(state.customer_type),
    () => Boolean(a0?.strasse?.trim()),
    () => Boolean(a0?.plz?.trim()),
    () => Boolean(a0?.ort?.trim()),
    () => Boolean(a0?.land_code?.trim()),
    () => Boolean(a0?.ust_id_nr?.trim() || a0?.steuer_nr?.trim()),
    () => Boolean(k0?.email?.trim() || k0?.telefon?.trim() || state.internet_adr?.trim()),
  ];
  const n = checks.filter((fn) => fn()).length;
  return Math.round((n / checks.length) * 100);
}

function formFromExistingCustomer(
  kunde: KundenStamm,
  wash: KundenWashStamm | null | undefined,
  department?: DepartmentArea
): FormState {
  const firstAdresse = emptyAdresse("Hauptadresse");
  const kontakt = emptyKontakt();
  const washKennzeichen =
    wash?.kennzeichen
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const storedAdressen = Array.isArray(kunde.adressen) ? kunde.adressen : [];
  const mappedAdressen: AdresseEntry[] =
    storedAdressen.length > 0
      ? storedAdressen.map((a, idx) => ({
          id: a.id || `${kunde.id}-addr-${idx}`,
          typ: a.typ || ADRESSE_TYPEN[idx] || "Hauptadresse",
          strasse: a.strasse ?? "",
          plz: a.plz ?? "",
          ort: a.ort ?? "",
          land_code: a.land_code || "DE",
          art_land_code: a.art_land_code || landCodeToArtLand(a.land_code || "DE"),
          ust_id_nr: a.ust_id_nr ?? "",
          steuer_nr: a.steuer_nr ?? "",
          branchen_nr: "",
        }))
      : [
          {
            ...firstAdresse,
            strasse: kunde.strasse ?? "",
            plz: kunde.plz ?? "",
            ort: kunde.ort ?? "",
            land_code: kunde.land_code ?? "DE",
            art_land_code: kunde.art_land_code ?? landCodeToArtLand(kunde.land_code ?? "DE"),
            ust_id_nr: kunde.ust_id_nr ?? "",
            steuer_nr: kunde.steuer_nr ?? "",
            branchen_nr: "",
          },
        ];
  const storedKontakte = Array.isArray(kunde.kontakte) ? kunde.kontakte : [];
  const mappedKontakte: KontaktEntry[] =
    storedKontakte.length > 0
      ? storedKontakte.map((c, idx) => {
          const parsedTelefon = splitStoredPhone(c.telefon);
          const parsedHandy = splitStoredPhone(c.handy);
          const telefonCode = (c.telefonCode || parsedTelefon.code || "+49").trim();
          const handyCode = (c.handyCode || parsedHandy.code || "+49").trim();
          return {
            id: c.id || `${kunde.id}-kontakt-${idx}`,
            name: c.name ?? "",
            rolle: c.rolle ?? "",
            telefonCode,
            telefon: ensurePhoneIncludesCode(c.telefon, telefonCode),
            handyCode,
            handy: ensurePhoneIncludesCode(c.handy, handyCode),
            email: c.email ?? "",
            website: c.website ?? "",
            bemerkung: c.bemerkung ?? "",
          };
        })
      : [
          {
            ...kontakt,
            name: kunde.ansprechpartner ?? "",
            rolle: kunde.rolle_kontakt ?? "",
            ...(() => {
              const tel = splitStoredPhone(kunde.telefonnummer);
              const fax = splitStoredPhone(kunde.faxnummer);
              return {
                telefonCode: tel.code,
                telefon: ensurePhoneIncludesCode(kunde.telefonnummer, tel.code),
                handyCode: fax.code,
                handy: ensurePhoneIncludesCode(kunde.faxnummer, fax.code),
              };
            })(),
            email: kunde.email ?? "",
            website: "",
            bemerkung: kunde.bemerkungen_kontakt ?? "",
          },
        ];

  const rawAcq = (kunde.acquisition_source ?? "").trim().toLowerCase();
  const acquisition_source: AcquisitionSourceForm =
    rawAcq === "referral" || rawAcq === "website" || rawAcq === "email" || rawAcq === "call"
      ? rawAcq
      : "";
  const customer_type: CustomerTypeForm =
    kunde.customer_type === "legal_entity" || kunde.customer_type === "natural_person"
      ? kunde.customer_type
      : kunde.juristische_person
        ? "legal_entity"
        : kunde.natuerliche_person
          ? "natural_person"
          : "";
  const customer_status: CustomerStatusForm =
    kunde.status === "active" || kunde.status === "inactive" || kunde.status === "blocked"
      ? kunde.status
      : "active";
  const lifecycle_stage: LifecycleStageForm =
    kunde.lifecycle_stage === "lead" ||
    kunde.lifecycle_stage === "qualified" ||
    kunde.lifecycle_stage === "active" ||
    kunde.lifecycle_stage === "inactive" ||
    kunde.lifecycle_stage === "vip" ||
    kunde.lifecycle_stage === "lost"
      ? kunde.lifecycle_stage
      : "";
  const preferred_channel: ChannelTypeForm =
    kunde.preferred_channel === "email" ||
    kunde.preferred_channel === "phone" ||
    kunde.preferred_channel === "sms" ||
    kunde.preferred_channel === "whatsapp" ||
    kunde.preferred_channel === "mixed" ||
    kunde.preferred_channel === "none"
      ? kunde.preferred_channel
      : "";
  const customer_role: CustomerRoleForm =
    kunde.customer_role === "supplier" ||
    kunde.customer_role === "buyer" ||
    kunde.customer_role === "workshop" ||
    kunde.customer_role === "wash"
      ? kunde.customer_role
      : "";

  return {
    ...initialForm(),
    aufnahme: kunde.aufnahme ?? "",
    customer_type,
    customer_status,
    branche: kunde.branche ?? "",
    acquisition_source,
    acquisition_source_entity: kunde.acquisition_source_entity ?? "",
    fzgHandel: kunde.fzg_haendler == null ? "" : kunde.fzg_haendler ? "ja" : "nein",
    juristische_person: kunde.juristische_person ?? false,
    natuerliche_person: kunde.natuerliche_person ?? false,
    gesellschaftsform: kunde.gesellschaftsform ?? "",
    firmenvorsatz: kunde.firmenvorsatz ?? "",
    firmenname: kunde.firmenname ?? "",
    first_name: kunde.first_name ?? "",
    last_name: kunde.last_name ?? "",
    profile_notes: kunde.profile_notes ?? "",
    bemerkungen: kunde.bemerkungen ?? "",
    acquisition_date: kunde.acquisition_date ?? "",
    lifecycle_stage,
    preferred_channel,
    segment: kunde.segment ?? "",
    score: kunde.score != null ? String(kunde.score) : "",
    consent_email: kunde.consent_email ?? false,
    consent_sms: kunde.consent_sms ?? false,
    consent_phone: kunde.consent_phone ?? false,
    marketing_notes: kunde.marketing_notes ?? "",
    customer_role,
    role_valid_from: kunde.role_valid_from ?? "",
    role_valid_to: kunde.role_valid_to ?? "",
    zustaendige_person_name: kunde.zustaendige_person_name ?? "nicht zugeordnet",
    adressen: mappedAdressen,
    internet_adr: kunde.internet_adr ?? "",
    kontakte: mappedKontakte,
    art_kunde: kunde.art_kunde ?? "",
    buchungskonto_haupt: kunde.buchungskonto_haupt ?? "",
    tax_country_type_code: "",
    account_number: kunde.account_number ?? "",
    credit_limit: kunde.credit_limit != null ? String(kunde.credit_limit) : "",
    billing_name: kunde.billing_name ?? "",
    billing_street: kunde.billing_street ?? "",
    billing_postal_code: kunde.billing_postal_code ?? "",
    billing_city: kunde.billing_city ?? "",
    payment_blocked: kunde.payment_blocked ?? false,
    bank_name: kunde.bank_name ?? "",
    bic: kunde.bic ?? "",
    iban: kunde.iban ?? "",
    direct_debit_enabled: kunde.direct_debit_enabled ?? false,
    financial_notes: kunde.financial_notes ?? "",
    includeWashProfile: Boolean(wash) || department === "waschanlage",
    wash_bukto: wash?.bukto ?? "",
    wash_limit: String(wash?.limit_betrag ?? 0),
    wash_rechnung_zusatz: wash?.rechnung_zusatz ?? "",
    wash_rechnung_plz: wash?.rechnung_plz ?? "",
    wash_rechnung_ort: wash?.rechnung_ort ?? "",
    wash_rechnung_strasse: wash?.rechnung_strasse ?? "",
    wash_kunde_gesperrt: wash?.kunde_gesperrt ?? false,
    wash_kennzeichen_list: washKennzeichen,
    wash_kennzeichen_new: "",
    wasch_programm: wash?.wasch_programm ?? "",
    wash_netto_preis: wash?.netto_preis != null ? priceToInput(wash.netto_preis) : "",
    wash_brutto_preis: wash?.brutto_preis != null ? priceToInput(wash.brutto_preis) : "",
    wasch_intervall: wash?.wasch_intervall ?? "",
    wash_bankname: wash?.bankname ?? "",
    wash_bic: wash?.bic ?? "",
    wash_iban: wash?.iban ?? "",
    wash_wichtige_infos: wash?.wichtige_infos ?? "",
    wash_bemerkungen: wash?.bemerkungen ?? "",
    wash_lastschrift: wash?.lastschrift ?? false,
    wash_vehicle_type: wash?.wasch_fahrzeug_typ ?? "",
  };
}

function normalizeAdresseEntriesForPayload(entries: AdresseEntry[]): KundenAdresse[] {
  return entries.map((a, idx) => ({
    id: a.id || `addr-${idx}`,
    typ: (a.typ || ADRESSE_TYPEN[idx] || "Hauptadresse").trim(),
    strasse: a.strasse.trim(),
    plz: a.plz.trim(),
    ort: a.ort.trim(),
    land_code: (a.land_code || "DE").trim().toUpperCase(),
    art_land_code: (a.art_land_code || landCodeToArtLand(a.land_code || "DE")).trim(),
    ust_id_nr: a.ust_id_nr.trim(),
    steuer_nr: a.steuer_nr.trim(),
    branchen_nr: a.branchen_nr.trim(),
  }));
}

function normalizeKontaktEntriesForPayload(entries: KontaktEntry[]): KundenKontakt[] {
  return entries.map((k, idx) => ({
    id: k.id || `kontakt-${idx}`,
    name: k.name.trim(),
    rolle: k.rolle.trim(),
    telefonCode: (k.telefonCode || "+49").trim(),
    telefon: k.telefon.trim(),
    handyCode: (k.handyCode || "+49").trim(),
    handy: k.handy.trim(),
    email: k.email.trim(),
    website: emptyToUndef(k.website),
    bemerkung: k.bemerkung.trim(),
  }));
}

function formToPayload(form: FormState): NewKundeInput {
  const fzg_haendler =
    form.fzgHandel === "ja" ? true : form.fzgHandel === "nein" ? false : undefined;
  const customer_type =
    form.customer_type ||
    (form.juristische_person ? "legal_entity" : form.natuerliche_person ? "natural_person" : undefined);
  const trimmedCompanyName = form.firmenname.trim();
  const profile_notes = emptyToUndef(form.profile_notes);
  const score = moneyToUndef(form.score);
  const z = form.zustaendige_person_name.trim();
  const zustaendige_person_name =
    z && z !== "nicht zugeordnet" ? z : undefined;
  const adressen = normalizeAdresseEntriesForPayload(form.adressen);
  const kontakte = normalizeKontaktEntriesForPayload(form.kontakte);
  const primaryAdresse = adressen[0];
  const primaryKontakt = kontakte[0];

  return {
    aufnahme: emptyToUndef(form.aufnahme),
    customer_type,
    status: form.customer_status || undefined,
    firmenname: trimmedCompanyName,
    branche: emptyToUndef(form.branche),
    fzg_haendler,
    juristische_person: form.juristische_person,
    natuerliche_person: form.natuerliche_person,
    gesellschaftsform: emptyToUndef(form.gesellschaftsform),
    firmenvorsatz: emptyToUndef(form.firmenvorsatz),
    profile_notes,
    acquisition_source: form.acquisition_source ? form.acquisition_source : undefined,
    acquisition_source_entity: emptyToUndef(form.acquisition_source_entity),
    acquisition_date: emptyToUndef(form.acquisition_date),
    lifecycle_stage: form.lifecycle_stage || undefined,
    preferred_channel: form.preferred_channel || undefined,
    segment: emptyToUndef(form.segment),
    score,
    consent_email: form.consent_email,
    consent_sms: form.consent_sms,
    consent_phone: form.consent_phone,
    marketing_notes: emptyToUndef(form.marketing_notes),
    customer_role: form.customer_role || undefined,
    role_valid_from: emptyToUndef(form.role_valid_from),
    role_valid_to: emptyToUndef(form.role_valid_to),
    bemerkungen: emptyToUndef(form.bemerkungen),
    zustaendige_person_name,
    strasse: emptyToUndef(primaryAdresse?.strasse ?? ""),
    plz: emptyToUndef(primaryAdresse?.plz ?? ""),
    ort: emptyToUndef(primaryAdresse?.ort ?? ""),
    land_code: primaryAdresse?.land_code ?? "DE",
    art_land_code: emptyToUndef(primaryAdresse?.art_land_code ?? ""),
    ust_id_nr: emptyToUndef(primaryAdresse?.ust_id_nr ?? ""),
    steuer_nr: emptyToUndef(primaryAdresse?.steuer_nr ?? ""),
    branchen_nr: undefined,
    tax_country_type_code: undefined,
    account_number: emptyToUndef(form.account_number),
    credit_limit: moneyToUndef(form.credit_limit),
    billing_name: emptyToUndef(form.billing_name),
    billing_street: emptyToUndef(form.billing_street),
    billing_postal_code: emptyToUndef(form.billing_postal_code),
    billing_city: emptyToUndef(form.billing_city),
    payment_blocked: form.payment_blocked,
    ansprechpartner: emptyToUndef(primaryKontakt?.name ?? ""),
    rolle_kontakt: emptyToUndef(primaryKontakt?.rolle ?? ""),
    telefonnummer: emptyToUndef(
      composePhoneForPayload(primaryKontakt?.telefon, primaryKontakt?.telefonCode)
    ),
    faxnummer: emptyToUndef(
      composePhoneForPayload(primaryKontakt?.handy, primaryKontakt?.handyCode)
    ),
    email: emptyToUndef(primaryKontakt?.email ?? ""),
    internet_adr: emptyToUndef(form.internet_adr),
    bemerkungen_kontakt: emptyToUndef(primaryKontakt?.bemerkung ?? ""),
    faxen_flag: false,
    bank_name: emptyToUndef(form.bank_name),
    bic: emptyToUndef(form.bic),
    iban: emptyToUndef(form.iban),
    direct_debit_enabled: form.direct_debit_enabled,
    financial_notes: emptyToUndef(form.financial_notes),
    art_kunde: emptyToUndef(form.art_kunde),
    buchungskonto_haupt: emptyToUndef(form.buchungskonto_haupt),
    adressen,
    kontakte,
  };
}

function viesResultToSnapshot(r: ViesCheckResult): ViesCustomerSnapshot {
  return {
    valid: r.valid,
    country_code: r.country_code,
    vat_number: r.vat_number,
    name: r.name ?? null,
    address: r.address ?? null,
    request_date: r.request_date ?? null,
    request_identifier: r.request_identifier ?? null,
    trader_details_available: r.trader_details_available,
    trader_name_match: r.trader_name_match ?? null,
    trader_street_match: r.trader_street_match ?? null,
    trader_postal_code_match: r.trader_postal_code_match ?? null,
    trader_city_match: r.trader_city_match ?? null,
    trader_company_type_match: r.trader_company_type_match ?? null,
    saved_at: new Date().toISOString(),
  };
}

function snapshotToViesCheckResult(s: ViesCustomerSnapshot): ViesCheckResult {
  return {
    valid: coerceViesCheckValid(s.valid),
    country_code: s.country_code,
    vat_number: s.vat_number,
    name: s.name,
    address: s.address,
    request_date: s.request_date,
    request_identifier: s.request_identifier,
    trader_details_available: s.trader_details_available,
    trader_name_match: s.trader_name_match,
    trader_street_match: s.trader_street_match,
    trader_postal_code_match: s.trader_postal_code_match,
    trader_city_match: s.trader_city_match,
    trader_company_type_match: s.trader_company_type_match,
  };
}

/** Persists VIES snapshot and applies the same field fills as "Apply to form" when the user saves without clicking it. */
function mergeVatCheckIntoPayload(
  base: NewKundeInput,
  vatCheckResult: ViesCheckResult | null,
  localeTag: string,
  /** Member state chosen in the VAT tab — used if the API omits `country_code` (same as Apply to form). */
  viesMemberStateFallback: string,
  /** VAT digits typed in the modal when the API omits `vat_number`. */
  viesVatInputFallback: string
): NewKundeInput {
  if (!vatCheckResult) return base;
  const out: NewKundeInput = { ...base, vies_snapshot: viesResultToSnapshot(vatCheckResult) };
  if (!viesResultAllowsFormMerge(vatCheckResult)) return out;

  const ccUst = viesAlpha2ForUst(vatCheckResult, viesMemberStateFallback);
  let nr = String(vatCheckResult.vat_number ?? "").trim();
  if (!nr) {
    let raw = String(viesVatInputFallback ?? "").replace(/\s+/g, "");
    const pfx = (ccUst || viesMemberStateFallback).toUpperCase();
    if (pfx && raw.toUpperCase().startsWith(pfx)) raw = raw.slice(pfx.length);
    nr = raw;
  }
  const ustFromVies = `${ccUst}${nr}`.replace(/\s+/g, "");
  const addr = extractViesAddressForForm(vatCheckResult);
  const nm = isMeaningfulViesText(vatCheckResult.name) ? vatCheckResult.name!.trim() : "";
  const derivedLandCode =
    extractViesCountryCodeForForm(vatCheckResult, viesMemberStateFallback) ||
    viesLandToFormLand(viesMemberStateFallback);
  const viesRequestDate = normalizeViesRequestDate(vatCheckResult.request_date, localeTag);
  const hadUst = Boolean((base.ust_id_nr ?? "").trim());

  const applyLandFromVies = Boolean(derivedLandCode);

  if (!hadUst) {
    out.ust_id_nr = ustFromVies;
    if (applyLandFromVies) {
      out.land_code = derivedLandCode;
      out.art_land_code = landCodeToArtLand(derivedLandCode);
    }
    if (nm && !(base.firmenname ?? "").trim()) out.firmenname = transliterateToAscii(nm);
    if (addr.strasse && !(base.strasse ?? "").trim()) out.strasse = addr.strasse;
    if (addr.plz && !(base.plz ?? "").trim()) out.plz = addr.plz;
    if (addr.ort && !(base.ort ?? "").trim()) out.ort = addr.ort;
    if (viesRequestDate && !(base.aufnahme ?? "").trim()) out.aufnahme = viesRequestDate;
  } else {
    if (applyLandFromVies) {
      out.land_code = derivedLandCode;
      out.art_land_code = landCodeToArtLand(derivedLandCode);
    }
    if (!(base.firmenname ?? "").trim() && nm) out.firmenname = transliterateToAscii(nm);
    if (!(base.strasse ?? "").trim() && addr.strasse) out.strasse = addr.strasse;
    if (!(base.plz ?? "").trim() && addr.plz) out.plz = addr.plz;
    if (!(base.ort ?? "").trim() && addr.ort) out.ort = addr.ort;
    if (viesRequestDate && !(base.aufnahme ?? "").trim()) out.aufnahme = viesRequestDate;
  }

  return out;
}

function washFormToPayload(form: FormState): KundenWashUpsertFields {
  const limit = Math.max(0, Number(form.wash_limit) || 0);
  return {
    bukto: emptyToUndef(form.wash_bukto),
    limit_betrag: limit,
    rechnung_zusatz: emptyToUndef(form.wash_rechnung_zusatz),
    rechnung_plz: emptyToUndef(form.wash_rechnung_plz ?? ""),
    rechnung_ort: emptyToUndef(form.wash_rechnung_ort ?? ""),
    rechnung_strasse: emptyToUndef(form.wash_rechnung_strasse ?? ""),
    kunde_gesperrt: form.wash_kunde_gesperrt,
    bankname: emptyToUndef(form.wash_bankname),
    bic: emptyToUndef(form.wash_bic),
    iban: emptyToUndef(form.wash_iban),
    wichtige_infos: emptyToUndef(form.wash_wichtige_infos),
    bemerkungen: emptyToUndef(form.wash_bemerkungen),
    lastschrift: form.wash_lastschrift,
    kennzeichen: form.wash_kennzeichen_list.length > 0
      ? form.wash_kennzeichen_list.join(", ")
      : undefined,
    wasch_programm: emptyToUndef(form.wasch_programm),
    netto_preis: moneyToUndef(form.wash_netto_preis),
    brutto_preis: moneyToUndef(form.wash_brutto_preis),
    wasch_intervall: emptyToUndef(form.wasch_intervall),
    wasch_fahrzeug_typ: emptyToUndef(form.wash_vehicle_type),
  };
}

const BASE_TAB_ORDER: TabId[] = ["vat", "kunde", "art", "waschanlage", "beziehungenFzg"];

const inputClass =
  "min-h-[44px] w-full rounded border border-neutral-300 bg-white px-3 text-sm leading-normal text-slate-800 outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 sm:h-9 sm:min-h-0";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600";

type Props = {
  open: boolean;
  onClose: () => void;
  department?: DepartmentArea;
  mode?: "create" | "edit";
  editInitial?: { kunde: KundenStamm; wash?: KundenWashStamm | null };
  /** Edit mode: risk profile for Customer 360 document-expiry chip (omit in create mode). */
  editRisikoProfile?: KundenRisikoanalyse | null;
  /** Edit mode: scroll the modal content to the document expiry / risk analysis block (e.g. sidebar). */
  onScrollToDocumentExpiry?: () => void;
  /** Edit mode: documents control shown to the right of the tab row (e.g. open Unterlagen). */
  editHeaderDocumentsAction?: ReactNode;
  /** Edit mode: appointments UI rendered under the contact column on the Customer & Address tab. */
  editKundeAppointmentsContent?: ReactNode;
  /** Edit mode: e.g. Rechnungen actions, rendered below “Operative Notizen” in column 1 (Customer classification). */
  editAfterOperationalNotesContent?: ReactNode;
  editKundeSideContent?: ReactNode;
  /** Full-width content rendered below the main Firmendaten/Adresse/Kontakt grid (edit mode only). */
  editKundeBottomContent?: ReactNode;
  /** Vorschau der nächsten automatischen KundenNr. (wird beim Speichern vergeben). */
  nextKundenNrPreview: string;
  /** Vorschläge aus bestehenden Kunden/Wash (<datalist>, kein Browser-Autofill). */
  fieldSuggestions: CustomerFieldSuggestions;
  /** `wash` gesetzt → nach createKunde wird upsertKundenWash aufgerufen (wie beim Bearbeiten). */
  onSubmit: (
    data: NewKundeInput,
    wash: KundenWashUpsertFields | null,
    scannedAttachment?: NewKundenUnterlageInput | null
  ) => void;
  /** Optional: checks whether a possible duplicate exists. Create mode only. */
  duplicateCheck?: (
    firmenname: string,
    strasse: string,
    plz: string,
    ort: string
  ) => { kuNr: string; firmenname: string; strasse?: string; plz?: string; ort?: string }[];
  /** Edit mode only — called when the user confirms customer deletion. */
  onDelete?: () => void;
  /** Edit mode only — full change history for the current customer, newest first. */
  historyEntries?: KundenHistoryEntry[];
};

export function NewCustomerModal({
  open,
  onClose,
  department,
  mode = "create",
  editInitial,
  editRisikoProfile,
  onScrollToDocumentExpiry,
  editHeaderDocumentsAction,
  editKundeAppointmentsContent,
  editAfterOperationalNotesContent,
  editKundeSideContent,
  editKundeBottomContent,
  nextKundenNrPreview,
  fieldSuggestions,
  onSubmit,
  duplicateCheck,
  onDelete,
  historyEntries = [],
}: Props) {
  const { t, language } = useLanguage();
  const localeTag = language === "de" ? "de-DE"
    : language === "fr" ? "fr-FR"
    : language === "es" ? "es-ES"
    : language === "it" ? "it-IT"
    : language === "pt" ? "pt-PT"
    : language === "tr" ? "tr-TR"
    : language === "ru" ? "ru-RU"
    : language === "ar" ? "ar-SA"
    : language === "zh" ? "zh-CN"
    : language === "ja" ? "ja-JP"
    : language === "hi" ? "hi-IN"
    : "en-GB";

  const tabLabels = useMemo((): Record<TabId, string> => ({
    vat: t("newCustomerTabVat", "Check VAT ID"),
    kunde: t("newCustomerTabKunde", "Customer & Address"),
    art: t("newCustomerTabArt", "Type / Account"),
    waschanlage: t("newCustomerTabWaschanlage", "Car wash"),
    history: t("historyTabLabel", "History"),
    beziehungenFzg: t("newCustomerTabBeziehungenFzg", "Vehicle relationships"),
  }), [t]);
  const acquisitionSourceOptions = useMemo(
    () =>
      [
        { value: "" as const, label: t("newCustomerAcquisitionSourceNone", "Select source") },
        { value: "referral" as const, label: t("newCustomerAcquisitionReferral", "Referral") },
        { value: "website" as const, label: t("newCustomerAcquisitionWebsite", "Website") },
        { value: "email" as const, label: t("newCustomerAcquisitionEmail", "Email") },
        { value: "call" as const, label: t("newCustomerAcquisitionCall", "Call") },
      ] as const,
    [t]
  );
  const continentLabels = useMemo(
    (): Record<ContinentId, string> => ({
      europe: t("newCustomerContinentEurope", "Europe"),
      asia: t("newCustomerContinentAsia", "Asia"),
      africa: t("newCustomerContinentAfrica", "Africa"),
      northAmerica: t("newCustomerContinentNorthAmerica", "North America"),
      southAmerica: t("newCustomerContinentSouthAmerica", "South America"),
      oceania: t("newCustomerContinentOceania", "Oceania"),
    }),
    [t]
  );
  const groupedLandOptions = useMemo(() => {
    const buckets = new Map<ContinentId, { code: string; label: string }[]>();
    for (const id of CONTINENT_ORDER) buckets.set(id, []);
    for (const option of LAND_OPTIONS) {
      const continent = COUNTRY_CONTINENT_BY_CODE[option.code] ?? "europe";
      buckets.get(continent)?.push(option);
    }
    return CONTINENT_ORDER
      .map((id) => ({ id, label: continentLabels[id], options: buckets.get(id) ?? [] }))
      .filter((group) => group.options.length > 0);
  }, [continentLabels]);

  const [tab, setTab] = useState<TabId>("vat");
  const [form, setForm] = useState<FormState>(initialForm);
  const [activeKontaktIdx, setActiveKontaktIdx] = useState(0);
  const [activeAdresseIdx, setActiveAdresseIdx] = useState(0);
  const [aufnahmePreview, setAufnahmePreview] = useState("");
  const [viesCountry, setViesCountry] = useState("DE");
  const [viesVatInput, setViesVatInput] = useState("");
  const [vatCheckLoading, setVatCheckLoading] = useState(false);
  const [vatCheckResult, setVatCheckResult] = useState<ViesCheckResult | null>(null);
  const [vatCheckError, setVatCheckError] = useState<string | null>(null);
  /** Parsed Straße/PLZ/Ort preview — same logic as Apply to form (only when PLZ or Ort was derived). */
  const viesFormAddressSplitPreview = useMemo(() => {
    if (!vatCheckResult || !isMeaningfulViesText(vatCheckResult.address)) return null;
    const a = extractViesAddressForForm(vatCheckResult);
    if (!a.plz?.trim() && !a.ort?.trim()) return null;
    return a;
  }, [vatCheckResult]);
  const isEditMode = mode === "edit";
  const hasEditKundeSideContent = isEditMode && Boolean(editKundeSideContent);
  /** Edit + relationships column: avoid 4 skinny columns at xl — use 2×2 until 2xl */
  const editKundeGridClass = hasEditKundeSideContent
    ? "grid-cols-1 lg:grid-cols-2 min-[1420px]:grid-cols-12"
    : "grid-cols-1 md:grid-cols-3 lg:grid-cols-12";
  const editKundeCol1 = hasEditKundeSideContent ? "lg:col-span-1 min-[1420px]:col-span-3" : "lg:col-span-4";
  const editKundeCol2 = hasEditKundeSideContent ? "lg:col-span-1 min-[1420px]:col-span-3" : "lg:col-span-5";
  const editKundeCol3 = hasEditKundeSideContent ? "lg:col-span-1 min-[1420px]:col-span-3" : "lg:col-span-3";
  const editKundeCol4 = hasEditKundeSideContent ? "lg:col-span-1 min-[1420px]:col-span-3" : "";
  const kundePanelSurface = hasEditKundeSideContent
    ? "overflow-hidden rounded-2xl"
    : "rounded-2xl";
  const kundeSectionTitleClass = hasEditKundeSideContent
    ? "text-sm font-bold uppercase tracking-[0.08em] text-slate-700"
    : "text-sm font-bold uppercase tracking-[0.08em] text-slate-600";
  const tabOrder: TabId[] = useMemo(() => {
    if (!isEditMode) return BASE_TAB_ORDER;
    const core = BASE_TAB_ORDER.filter((id) => id !== "beziehungenFzg");
    return [...core, "history", "beziehungenFzg"];
  }, [isEditMode]);
  const kundenNrDisplay = isEditMode ? editInitial?.kunde.kunden_nr ?? nextKundenNrPreview : nextKundenNrPreview;

  // Track whether the modal was open on the previous render so we only
  // re-initialise the form when the modal *transitions* from closed → open.
  // Without this guard, every parent re-render (search-bar keystroke, adding a
  // Termin/Beziehung, etc.) creates a new `editInitial` object reference and
  // causes this effect to reset the form, losing any unsaved edits.
  const wasOpenRef = useRef(false);
  const dirtyBaselineRef = useRef("");
  const [footerMessage, setFooterMessage] = useState<{
    type: "error";
    text: string;
    moreCount?: number;
  } | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [copyFlash, setCopyFlash] = useState<"ok" | "err" | null>(null);
  const copyFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyFlashTimerRef.current) clearTimeout(copyFlashTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      dirtyBaselineRef.current = "";
      wasOpenRef.current = false;
      setFooterMessage(null);
      setShowDiscardConfirm(false);
      return;
    }
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = true;
    if (!justOpened) return;

    const nowAufnahme = new Date().toLocaleString(localeTag, { dateStyle: "short", timeStyle: "medium" });
    const prepared =
      isEditMode && editInitial
        ? formFromExistingCustomer(editInitial.kunde, editInitial.wash, department)
        : {
            ...initialForm(),
            aufnahme: nowAufnahme,
            includeWashProfile: department === "waschanlage",
          };
    dirtyBaselineRef.current = serializeFormStateForDirtyBaseline(prepared);
    setFooterMessage(null);
    setForm(prepared);
    setTab(isEditMode ? "kunde" : "vat");
    setActiveKontaktIdx(0);
    setActiveAdresseIdx(0);
    setViesCountry("DE");
    setViesVatInput("");
    setVatCheckLoading(false);
    setVatCheckResult(null);
    setVatCheckError(null);
    if (isEditMode && editInitial?.kunde.vies_snapshot) {
      const vs = editInitial.kunde.vies_snapshot;
      setViesCountry((vs.country_code || "DE").trim() || "DE");
      setViesVatInput((vs.vat_number || "").trim());
      setVatCheckResult(snapshotToViesCheckResult(vs));
    }
    setAufnahmePreview(prepared.aufnahme || nowAufnahme);
    setScannedAttachment(null);
    setShowAttachPrompt(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, department, isEditMode, editInitial]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // ── Document extraction state ──
  const [docScanState, setDocScanState] = useState<ScanState>("idle");
  const [docFileName, setDocFileName] = useState("");
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());
  const [scannedAttachment, setScannedAttachment] = useState<NewKundenUnterlageInput | null>(null);
  const [showAttachPrompt, setShowAttachPrompt] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<
    { kuNr: string; firmenname: string; strasse?: string; plz?: string; ort?: string }[]
  >([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const handleSaveRef = useRef<() => void>(() => {});

  /** Fields this mock extractor can fill — maps form keys to realistic demo values */
  const MOCK_EXTRACTED_FIRMA: Partial<Record<keyof FormState, FormState[keyof FormState]>> = {
    firmenname:        "Muster Automobil GmbH",
    gesellschaftsform: "GmbH",
    branche:           "Automobilhandel",
    firmenvorsatz:     "Muster",
    internet_adr:      "www.muster-auto.de",
  };
  const MOCK_EXTRACTED_ADRESSE = {
    strasse:    "Hauptstraße 42",
    plz:        "44137",
    ort:        "Dortmund",
    land_code:  "DE",
  };

  const handleDocUpload = (file: File) => {
    setDocFileName(file.name);
    setDocScanState("scanning");
    setExtractedFields(new Set());
    setShowAttachPrompt(false);
    void readFileAsDataURL(file).then(
      (dataUrl) => {
        setScannedAttachment({
          name: file.name,
          size: file.size,
          mime_type: file.type || "application/octet-stream",
          data_url: dataUrl,
        });
      },
      () => {
        setScannedAttachment(null);
      }
    );

    // Simulate OCR processing delay (2.5 s)
    setTimeout(() => {
      const filled = new Set<string>();

      // Fill top-level firma fields
      for (const [key, value] of Object.entries(MOCK_EXTRACTED_FIRMA) as [keyof FormState, FormState[keyof FormState]][]) {
        if (!form[key]) {
          set(key, value);
          filled.add(key as string);
        }
      }

      // Fill address fields into adressen[0]
      setForm((f) => ({
        ...f,
        adressen: f.adressen.map((a, i) => {
          if (i !== 0) return a;
          const patch: Partial<AdresseEntry> = {};
          if (!a.strasse && MOCK_EXTRACTED_ADRESSE.strasse) { patch.strasse = MOCK_EXTRACTED_ADRESSE.strasse; filled.add("strasse"); }
          if (!a.plz    && MOCK_EXTRACTED_ADRESSE.plz)     { patch.plz    = MOCK_EXTRACTED_ADRESSE.plz;     filled.add("plz");    }
          if (!a.ort    && MOCK_EXTRACTED_ADRESSE.ort)     { patch.ort    = MOCK_EXTRACTED_ADRESSE.ort;     filled.add("ort");    }
          if (!a.land_code && MOCK_EXTRACTED_ADRESSE.land_code) {
            patch.land_code    = MOCK_EXTRACTED_ADRESSE.land_code;
            patch.art_land_code = landCodeToArtLand(MOCK_EXTRACTED_ADRESSE.land_code);
            filled.add("land_code");
          }
          return { ...a, ...patch };
        }),
      }));

      setExtractedFields(filled);
      setDocScanState("done");
    }, 2500);
  };

  const clearDocExtraction = () => {
    for (const key of extractedFields) {
      if (["strasse", "plz", "ort", "land_code"].includes(key)) {
        setForm((f) => ({
          ...f,
          adressen: f.adressen.map((a, i) =>
            i === 0
              ? { ...a, [key]: key === "land_code" ? "DE" : "", ...(key === "land_code" ? { art_land_code: "IL" } : {}) }
              : a
          ),
        }));
      } else {
        set(key as keyof FormState, "" as FormState[keyof FormState]);
      }
    }
    setExtractedFields(new Set());
    setDocScanState("idle");
    setDocFileName("");
    setScannedAttachment(null);
    setShowAttachPrompt(false);
  };

  const isExtracted = (key: string) => extractedFields.has(key);

  /** Maps known VIES infrastructure error codes to friendly German messages. */
  const VIES_FRIENDLY: Record<string, string> = {
    MS_UNAVAILABLE:
      "Der VIES-Server des Mitgliedstaats ist vorübergehend nicht erreichbar (MS_UNAVAILABLE). " +
      "Das ist ein bekanntes EU-Infrastrukturproblem und kein Fehler dieser Anwendung. " +
      "Bitte in einigen Minuten erneut versuchen.",
    MS_MAX_CONCURRENT_REQ:
      "Zu viele gleichzeitige Anfragen an den VIES-Server des Mitgliedstaats (MS_MAX_CONCURRENT_REQ). " +
      "Bitte kurz warten und erneut versuchen.",
    GLOBAL_MAX_CONCURRENT_REQ:
      "Der VIES-Dienst ist aktuell überlastet (GLOBAL_MAX_CONCURRENT_REQ). " +
      "Bitte kurz warten und erneut versuchen.",
    "VOW-SERVICE-UNAVAILABLE":
      "Der VIES-Validierungsdienst ist vorübergehend nicht verfügbar (VOW-SERVICE-UNAVAILABLE). " +
      "Bitte gleich nochmal versuchen.",
    SERVICE_UNAVAILABLE:
      "VIES ist vorübergehend nicht verfügbar (SERVICE_UNAVAILABLE). " +
      "Bitte in einigen Minuten erneut versuchen.",
    TIMEOUT:
      "Der VIES-Server hat nicht rechtzeitig geantwortet (TIMEOUT). " +
      "Bitte in einigen Minuten erneut versuchen.",
    INVALID_INPUT:
      "Das Format der USt-IdNr. ist für das gewählte Land ungültig (INVALID_INPUT).",
    VAT_BLOCKED:
      "Diese USt-IdNr. ist im VIES-System gesperrt (VAT_BLOCKED).",
    VAT_REVOKED:
      "Diese USt-IdNr. wurde widerrufen (VAT_REVOKED).",
  }

  /**
   * Extracts a display string from a backend error body.
   * Detects known VIES error codes and replaces them with friendly German text.
   */
  const formatVatCheckDetail = (raw: unknown): string => {
    const extractText = (v: unknown): string => {
      if (typeof v === "string") return v.trim();
      if (typeof v === "number") return String(v);
      return "";
    }

    const applyFriendly = (text: string): string => {
      const upper = text.toUpperCase()
      for (const [code, friendly] of Object.entries(VIES_FRIENDLY)) {
        if (upper.includes(code)) return friendly
      }
      return text
    }

    if (typeof raw === "string" && raw.trim()) return applyFriendly(raw.trim())

    if (Array.isArray(raw)) {
      return raw
        .map((e) => {
          if (e && typeof e === "object" && "msg" in e) return applyFriendly(String((e as { msg: string }).msg))
          if (e && typeof e === "object" && "message" in e)
            return applyFriendly(String((e as { message: string }).message))
          return JSON.stringify(e)
        })
        .join("; ")
    }

    // FastAPI often returns detail as a string, array (validation), or { code, message } object.
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>
      let candidate = obj["detail"] ?? obj["error"] ?? obj["message"] ?? obj["error_description"]
      if (Array.isArray(candidate)) {
        const nestedText = formatVatCheckDetail(candidate)
        if (nestedText) return applyFriendly(nestedText)
      }
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
        const nested = candidate as Record<string, unknown>
        const msg = nested["message"] ?? nested["msg"]
        const code = nested["code"]
        const parts: string[] = []
        if (typeof msg === "string" && msg.trim()) parts.push(msg.trim())
        else if (typeof msg === "number") parts.push(String(msg))
        if (typeof code === "string" && code.trim()) {
          const c = code.trim()
          if (!parts.length || !parts.some((p) => p.includes(c))) {
            parts.unshift(`[${c}]`)
          }
        }
        if (parts.length) return applyFriendly(parts.join(" "))
        candidate = JSON.stringify(candidate)
      }
      const text = extractText(candidate)
      if (text) return applyFriendly(text)
    }

    return t(
      "vatCheckErrorNoServerDetail",
      "Check failed — no detailed message from the server (proxy timeout or gateway error)."
    )
  }

  const vatErrorBodyHasDetail = (b: Record<string, unknown> | null): boolean => {
    if (!b || typeof b !== "object") return false;
    const d = b.detail ?? b.message ?? b.error;
    if (d === undefined || d === null) return false;
    if (typeof d === "string") return Boolean(d.trim());
    if (Array.isArray(d)) return d.length > 0;
    if (typeof d === "object") {
      const o = d as Record<string, unknown>;
      const msg = o.message ?? o.msg;
      if (typeof msg === "string" && msg.trim()) return true;
      if (typeof o.code === "string" && o.code.trim()) return true;
      return false;
    }
    return false;
  };

  const isLikelyMissingApiBaseInCloud = (res: Response): boolean => {
    if (API_BASE) return false;
    try {
      const targetOrigin = new URL(res.url).origin;
      const pageOrigin = window.location.origin;
      const isLocal =
        pageOrigin.includes("localhost") ||
        pageOrigin.includes("127.0.0.1");
      return !isLocal && targetOrigin === pageOrigin;
    } catch {
      return false;
    }
  };

  const runVatCheck = async () => {
    const trimmed = viesVatInput.trim();
    if (!trimmed) {
      setVatCheckError(t("newCustomerVatEmptyInput", "Please enter a VAT ID."));
      setVatCheckResult(null);
      return;
    }
    setVatCheckLoading(true);
    setVatCheckError(null);
    setVatCheckResult(null);
    try {
      // Keep the request website-style: only mandatory fields.
      const res = await fetch(`${API_BASE}/api/v1/vat/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_code: viesCountry,
          vat_number: trimmed,
        }),
      });
      // status 0 means the browser blocked the request (CORS / network).
      if (res.status === 0) {
        setVatCheckError(
          t(
            "vatCheckErrorCorsOrNetwork",
            "CORS or network error (HTTP 0): the browser blocked or failed the request. Add your frontend origin to CORS_ORIGINS (or CORS_ORIGIN_REGEX for Vercel previews) on the API host."
          )
        );
        return;
      }
      const textBody = await res.text();
      let parsedBody: unknown = null;
      let parseError: string | null = null;
      try {
        parsedBody = textBody.trim() ? JSON.parse(textBody) : null;
      } catch {
        parseError = t(
          "vatCheckErrorNonJsonHint",
          "Response was not valid JSON (often a proxy/gateway HTML page or timeout)."
        );
      }

      if (!res.ok) {
        const body = parsedBody as Record<string, unknown> | null;
        if (parseError) {
          setVatCheckError(
            t(
              "vatCheckErrorHttpNonJson",
              "HTTP {status} — {hint} Lower VIES_CHECK_ENDPOINT_MAX_TOTAL_SEC (or proxy limit) so the VAT check finishes before the gateway times out."
            )
              .replace("{status}", String(res.status))
              .replace("{hint}", parseError)
          );
          return;
        }
        if (!vatErrorBodyHasDetail(body)) {
          const hint405 = t(
            "vatCheckErrorHttp405",
            "HTTP 405 — POST is not allowed on this URL. In cloud builds, VITE_API_BASE_URL is often missing, so requests hit the static host instead of the Python API. Set VITE_API_BASE_URL to your API origin at build time and redeploy."
          );
          const hintLikelyApiBase = t(
            "vatCheckErrorLikelyMissingApiBase",
            "HTTP {status} — request appears to be hitting the frontend host instead of the backend API. Set VITE_API_BASE_URL to your Render API origin at build time and redeploy."
          ).replace("{status}", String(res.status));
          const hintGeneric = t(
            "vatCheckErrorHttpEmptyBody",
            "HTTP {status} — no error details. Often a gateway timeout, cold start, or API error. Check API logs and keep VIES_CHECK_ENDPOINT_MAX_TOTAL_SEC below your proxy limit."
          ).replace("{status}", String(res.status));
          if (res.status === 405) {
            setVatCheckError(hint405);
          } else if (isLikelyMissingApiBaseInCloud(res)) {
            setVatCheckError(hintLikelyApiBase);
          } else {
            setVatCheckError(hintGeneric);
          }
          return;
        }
        setVatCheckError(formatVatCheckDetail(body));
        return;
      }
      const body =
        normalizeViesCheckResponseFromApi(parsedBody) ?? (parsedBody as ViesCheckResult);
      setVatCheckResult(body);
      const apiCc = String(body.country_code ?? "")
        .trim()
        .toUpperCase();
      if (apiCc && VIES_MS_OPTIONS.some((o) => o.code === apiCc)) {
        setViesCountry(apiCc);
      }
    } catch (err) {
      const jsMsg = err instanceof Error ? err.message : String(err)
      const targetUrl = `${API_BASE || "(Vite-Proxy)"}/api/v1/vat/check`
      const hint = API_BASE
        ? t(
            "vatCheckErrorNetworkHintApiBase",
            "Check that the API is running at {base} and CORS_ORIGINS (or CORS_ORIGIN_REGEX) includes your frontend origin."
          ).replace("{base}", API_BASE)
        : t(
            "vatCheckErrorNetworkHintLocal",
            "Local: start the API (e.g. uvicorn main:app --reload --port 8000). Cloud: set VITE_API_BASE_URL at build time."
          )
      setVatCheckError(
        t(
          "vatCheckErrorNetwork",
          "Network error — {msg}. Target: {url}. {hint}"
        )
          .replace("{msg}", jsMsg)
          .replace("{url}", targetUrl)
          .replace("{hint}", hint)
      );
    } finally {
      setVatCheckLoading(false);
    }
  };

  const applyViesResultToForm = () => {
    if (!vatCheckResult || !viesResultAllowsFormMerge(vatCheckResult)) return;
    const ccUst = viesAlpha2ForUst(vatCheckResult, viesCountry);
    let nr = String(vatCheckResult.vat_number ?? "").trim();
    if (!nr) {
      let raw = String(viesVatInput ?? "").replace(/\s+/g, "");
      const pfx = (ccUst || viesCountry).toUpperCase();
      if (pfx && raw.toUpperCase().startsWith(pfx)) raw = raw.slice(pfx.length);
      nr = raw;
    }
    const ust = `${ccUst}${nr}`.replace(/\s+/g, "");
    const addr = extractViesAddressForForm(vatCheckResult);
    const nm = isMeaningfulViesText(vatCheckResult.name) ? vatCheckResult.name!.trim() : "";
    const viesRequestDate = normalizeViesRequestDate(vatCheckResult.request_date, localeTag);
    const derivedLandCode =
      extractViesCountryCodeForForm(vatCheckResult, viesCountry) ||
      viesLandToFormLand(viesCountry);
    /** Customer master record and `formToPayload` use `adressen[0]` only — always fill the main address. */
    const mainIdx = 0;
    setForm((f) => {
      const list = f.adressen.length > 0 ? f.adressen : [emptyAdresse()];
      const idx = Math.min(mainIdx, Math.max(0, list.length - 1));
      return {
        ...f,
        ...(viesRequestDate ? { aufnahme: viesRequestDate } : {}),
        ...(nm ? { firmenname: transliterateToAscii(nm) } : {}),
        adressen: list.map((a, i) =>
          i === idx
            ? {
                ...a,
                ust_id_nr: ust,
                ...(derivedLandCode
                  ? {
                      land_code: derivedLandCode,
                      art_land_code: landCodeToArtLand(derivedLandCode),
                    }
                  : {}),
                ...(addr.strasse ? { strasse: addr.strasse } : {}),
                ...(addr.plz ? { plz: addr.plz } : {}),
                ...(addr.ort ? { ort: addr.ort } : {}),
              }
            : a
        ),
      };
    });
    setActiveAdresseIdx(0);
    if (viesRequestDate) {
      setAufnahmePreview(viesRequestDate);
    }
    setTab("kunde");
  };

  const submitCustomer = (attachScanned: boolean) => {
    const wash = form.includeWashProfile ? washFormToPayload(form) : null;
    const payload = mergeVatCheckIntoPayload(
      formToPayload(form),
      vatCheckResult,
      localeTag,
      viesCountry,
      viesVatInput
    );
    const finalPayload =
      isEditMode && editInitial
        ? { ...payload, kunden_nr: editInitial.kunde.kunden_nr }
        : payload;
    onSubmit(finalPayload, wash, attachScanned ? scannedAttachment : null);
    setShowAttachPrompt(false);
  };

  const handleSave = () => {
    setFooterMessage(null);
    type Issue = { message: string; tab: TabId; fieldId: string; preFocus?: () => void };
    const issues: Issue[] = [];
    if (!form.firmenname.trim()) {
      issues.push({
        message: t("newCustomerRequiredFirmenname", "Please enter a company name."),
        tab: "kunde",
        fieldId: FOCUS_ID_FIRMENNAME,
      });
    }
    const em = form.kontakte[0]?.email?.trim() ?? "";
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      issues.push({
        message: t(
          "newCustomerInvalidEmail",
          "Please enter a valid email address for the primary contact."
        ),
        tab: "kunde",
        fieldId: FOCUS_ID_KONTAKT_EMAIL,
        preFocus: () => setActiveKontaktIdx(0),
      });
    }
    if (issues.length > 0) {
      const [first, ...rest] = issues;
      setFooterMessage({
        type: "error",
        text: first.message,
        moreCount: rest.length > 0 ? rest.length : undefined,
      });
      setTab(first.tab);
      first.preFocus?.();
      focusModalCustomerField(first.fieldId);
      return;
    }
    if (!isEditMode && duplicateCheck) {
      const matches = duplicateCheck(
        form.firmenname.trim(),
        form.adressen[0]?.strasse?.trim() ?? "",
        form.adressen[0]?.plz?.trim() ?? "",
        form.adressen[0]?.ort?.trim() ?? ""
      );
      if (matches.length > 0) {
        setDuplicateMatches(matches);
        setShowDuplicateWarning(true);
        return;
      }
    }
    if (!isEditMode && scannedAttachment) {
      setShowAttachPrompt(true);
      return;
    }
    submitCustomer(false);
  };
  handleSaveRef.current = handleSave;

  const handleDuplicateSaveAnyway = () => {
    setShowDuplicateWarning(false);
    setDuplicateMatches([]);
    if (!isEditMode && scannedAttachment) {
      setShowAttachPrompt(true);
      return;
    }
    submitCustomer(false);
  };

  const draftDiffersFromOpen =
    dirtyBaselineRef.current.length > 0 &&
    serializeFormStateForDirtyBaseline(form) !== dirtyBaselineRef.current;
  const isFormDirty = draftDiffersFromOpen;

  const requestClose = useCallback(() => {
    if (showDiscardConfirm) {
      setShowDiscardConfirm(false);
      return;
    }
    if (draftDiffersFromOpen) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  }, [draftDiffersFromOpen, onClose, showDiscardConfirm]);

  const performCloseDiscard = useCallback(() => {
    setShowDiscardConfirm(false);
    onClose();
  }, [onClose]);

  const flashCopyResult = useCallback((ok: boolean) => {
    if (copyFlashTimerRef.current) clearTimeout(copyFlashTimerRef.current);
    setCopyFlash(ok ? "ok" : "err");
    copyFlashTimerRef.current = setTimeout(() => {
      setCopyFlash(null);
      copyFlashTimerRef.current = null;
    }, 1600);
  }, []);

  const copyPlainText = useCallback(
    async (text: string) => {
      const v = text.trim();
      if (!v) {
        flashCopyResult(false);
        return;
      }
      try {
        await navigator.clipboard.writeText(v);
        flashCopyResult(true);
      } catch {
        flashCopyResult(false);
      }
    },
    [flashCopyResult]
  );

  const goToCompanyFromSummary = useCallback(() => {
    setTab("kunde");
    setActiveAdresseIdx(0);
    focusModalCustomerField(FOCUS_ID_FIRMENNAME);
  }, []);

  const goToAddressFromSummary = useCallback(() => {
    setTab("kunde");
    setActiveAdresseIdx(0);
    focusModalCustomerField(FOCUS_ID_STRASSE);
  }, []);

  const goToVatFieldFromSummary = useCallback(() => {
    setTab("kunde");
    setActiveAdresseIdx(0);
    focusModalCustomerField(FOCUS_ID_UST);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (showDiscardConfirm) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowDiscardConfirm(false);
        }
        return;
      }
      if (showDuplicateWarning || showAttachPrompt) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveRef.current();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
        return;
      }
      if (e.altKey && !e.repeat) {
        const d = Number(e.key);
        if (d >= 1 && d <= tabOrder.length) {
          e.preventDefault();
          setTab(tabOrder[d - 1]!);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    open,
    showDiscardConfirm,
    showDuplicateWarning,
    showAttachPrompt,
    tabOrder,
    requestClose,
  ]);

  const headerChipsData = useMemo(() => {
    const pct = computeCustomerProfileCompletionPct(form);
    let vatKind: "valid" | "invalid" | "unknown" = "unknown";
    if (vatCheckResult != null) {
      vatKind = coerceViesCheckValid(vatCheckResult.valid) ? "valid" : "invalid";
    } else if (isEditMode && editInitial?.kunde.vies_snapshot != null) {
      vatKind = editInitial.kunde.vies_snapshot.valid ? "valid" : "invalid";
    }
    let riskKind: "blocked" | "payment" | "billing" | "low" = "low";
    if (form.customer_status === "blocked") riskKind = "blocked";
    else if (form.payment_blocked) riskKind = "payment";
    else if (!form.iban.trim() && !form.bic.trim()) riskKind = "billing";

    const k = editInitial?.kunde;
    const lastEditedLine =
      isEditMode && k && k.updated_at != null && String(k.updated_at).trim() !== ""
        ? `${k.last_edited_by_name ?? t("auditUnknownEditor", "Unknown")} · ${new Date(k.updated_at).toLocaleString(localeTag, {
            dateStyle: "short",
            timeStyle: "short",
          })}`
        : null;
    const vatRequestRaw =
      (vatCheckResult?.request_date && String(vatCheckResult.request_date).trim()) ||
      (isEditMode && k?.vies_snapshot?.request_date && String(k.vies_snapshot.request_date).trim()) ||
      "";
    const vatRequestDateDisplay = vatRequestRaw
      ? normalizeViesRequestDate(vatRequestRaw, localeTag) ?? vatRequestRaw
      : null;
    const vatRequestMs = vatRequestRaw ? Date.parse(vatRequestRaw) : NaN;
    const vatRequestDateIso =
      vatRequestRaw && !Number.isNaN(vatRequestMs) ? new Date(vatRequestMs).toISOString() : null;
    const a0 = form.adressen[0];
    const addrParts = [
      a0?.strasse?.trim(),
      [a0?.plz?.trim(), a0?.ort?.trim()].filter(Boolean).join(" ").trim() || null,
      a0?.land_code?.trim(),
    ].filter(Boolean) as string[];
    const addressLine = addrParts.length > 0 ? addrParts.join(", ") : "";
    const companyLine = (form.firmenname ?? "").trim();
    const kuNr = isEditMode && k?.kunden_nr ? k.kunden_nr : nextKundenNrPreview;
    return {
      pct,
      vatKind,
      riskKind,
      lastEditedLine,
      kuNr,
      vatRequestDateDisplay,
      vatRequestDateIso,
      companyLine,
      addressLine,
    };
  }, [isEditMode, editInitial, form, vatCheckResult, localeTag, t, nextKundenNrPreview]);

  const customer360DocExpiryAlertCount = useMemo(() => {
    if (!isEditMode || editRisikoProfile === undefined) return null;
    if (!editRisikoProfile) return 0;
    const s = customerRepository.getExpiryStatus(editRisikoProfile.ausw_gueltig_bis);
    return s === "expired" || s === "critical" || s === "warning" ? 1 : 0;
  }, [isEditMode, editRisikoProfile]);

  if (!open) return null;

  /** Portal to `body` so the overlay stacks above `Header` (z-30); otherwise `dema-canvas-root { isolation: isolate }` traps z-50 inside the page. */
  const modalUi = (
    <div
      className="customers-modal-genz-backdrop dema-modal-backdrop-vibe fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-5"
      onClick={requestClose}
      role="presentation"
    >
      <div
        className={`customers-modal-genz-panel relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl ${
          hasEditKundeSideContent
            ? "max-h-[92vh] max-w-[min(118rem,99vw)]"
            : "max-h-[88vh] max-w-[min(112rem,99vw)]"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-kunde-title"
        aria-describedby="new-kunde-shortcuts-hint"
      >
        <div
          className={`customers-modal-genz-topline pointer-events-none absolute inset-x-0 top-0 z-10 ${
            hasEditKundeSideContent ? "h-[2px]" : "h-px"
          }`}
          aria-hidden
        />
        {/* Compact summary header (manager layout — replaces separate Customer 360 card) */}
        <div className="customers-modal-genz-header relative shrink-0 border-b border-transparent px-4 py-2.5 pr-14 sm:pl-5 sm:pr-16 md:pr-20">
          <button
            type="button"
            onClick={requestClose}
            className="customers-modal-genz-icon-btn absolute right-2 top-2 rounded p-2"
            aria-label={t("newCustomerModalClose", "Close")}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="customers-modal-genz-header-summary space-y-2">
              <p className="customers-modal-genz-header-eyeline">
                {t("newCustomerHeaderEyeline", "Customer record")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="new-kunde-title"
                  className="min-w-0 max-w-full text-lg font-bold tracking-tight sm:text-xl"
                >
                  <button
                    type="button"
                    onClick={goToCompanyFromSummary}
                    title={t("newCustomerGoToFieldCompany", "Open Customer & Address — company name")}
                    className="customers-modal-genz-header-link truncate text-left focus:outline-none rounded-sm"
                  >
                    {headerChipsData.companyLine || t("newCustomerModalTitle", "Customer data")}
                  </button>
                </h2>
                <button
                  type="button"
                  onClick={() => void copyPlainText(headerChipsData.companyLine)}
                  disabled={!headerChipsData.companyLine.trim()}
                  className="customers-modal-genz-icon-btn shrink-0 rounded-md p-1 transition disabled:pointer-events-none disabled:opacity-30"
                  aria-label={t("newCustomerCopyCompanyNameAria", "Copy company name")}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                </button>
                <span className="customers-modal-genz-mode-badge shrink-0 rounded-md px-2 py-0.5 text-xs">
                  {isEditMode ? t("newCustomerModalEdit", "(Edit)") : t("newCustomerModalNew", "(New)")}
                </span>
              </div>
              <div className="customers-modal-genz-header-address-row flex items-start gap-2.5 text-lg font-bold tracking-tight leading-snug sm:gap-3 sm:text-xl">
                <MapPin className="mt-1 h-5 w-5 shrink-0 sm:mt-1.5 sm:h-6 sm:w-6" aria-hidden />
                <span className="block min-w-0 flex-1">
                  <span className="inline-block max-w-full align-top leading-snug">
                    <button
                      type="button"
                      onClick={goToAddressFromSummary}
                      title={t("newCustomerGoToFieldAddress", "Open Customer & Address — street / ZIP / city")}
                      className="customers-modal-genz-header-link inline border-0 bg-transparent p-0 text-left align-top break-words text-inherit focus:outline-none rounded-sm"
                    >
                      {headerChipsData.addressLine || t("commonPlaceholderDash", "—")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyPlainText(headerChipsData.addressLine)}
                      disabled={!headerChipsData.addressLine.trim()}
                      className="customers-modal-genz-icon-btn ml-1 inline-flex shrink-0 align-top rounded-md p-1 transition disabled:pointer-events-none disabled:opacity-30 sm:ml-1.5"
                      aria-label={t("newCustomerCopyAddressAria", "Copy address")}
                    >
                      <Copy className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                    </button>
                  </span>
                </span>
              </div>
              {isEditMode && editInitial?.kunde ? (() => {
                const k = editInitial.kunde;
                const fmt = (iso?: string) =>
                  iso
                    ? new Date(iso).toLocaleString(localeTag, { dateStyle: "short", timeStyle: "short" })
                    : "—";
                return (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {k.created_by_name ? (
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="text-slate-400">{t("auditCreatedBy", "Created by")}</span>
                        <span className="font-medium text-slate-600">{k.created_by_name}</span>
                        <span className="tabular-nums text-slate-400">{fmt(k.created_at)}</span>
                      </span>
                    ) : null}
                    {k.last_edited_by_name && k.updated_at !== k.created_at ? (
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="text-slate-400">{t("auditLastEditedBy", "Last edited by")}</span>
                        <span className="font-medium text-slate-600">{k.last_edited_by_name}</span>
                        <span className="tabular-nums text-slate-400">{fmt(k.updated_at)}</span>
                      </span>
                    ) : null}
                    {!k.created_by_name && !k.last_edited_by_name ? (
                      <span className="italic text-slate-400">{t("auditNoTrail", "No edit history available")}</span>
                    ) : null}
                  </div>
                );
              })(              ) : !isEditMode ? (
                <p className="text-xs text-slate-400">{t("newCustomerModalBrandSubtitle", "DEMA Management")}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                {copyFlash === "ok" ? (
                  <span
                    className="customers-modal-genz-header-copy-flash--ok flex items-center gap-1 text-[10px] font-semibold"
                    role="status"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {t("newCustomerCopiedToClipboard", "Copied")}
                  </span>
                ) : copyFlash === "err" ? (
                  <span className="customers-modal-genz-header-copy-flash--err text-[10px] font-semibold" role="status">
                    {t("newCustomerCopyFailed", "Copy failed")}
                  </span>
                ) : null}
              </div>
              </div>
              <div className="customers-modal-genz-header-chips-scroll -mx-1 max-w-full overflow-x-auto overflow-y-hidden pb-1">
                <div className="customer360-strip-chips flex min-w-min flex-nowrap items-center gap-2 pr-2">
                <span
                  data-dema-chip={`status-${form.customer_status}`}
                  className={`customers-modal-genz-h-chip cursor-default customers-modal-genz-h-chip--status-${form.customer_status}`}
                >
                  {t("customer360ChipStatus", "Status")}:{" "}
                  {form.customer_status === "active"
                    ? t("newCustomerStatusActive", "Active")
                    : form.customer_status === "inactive"
                      ? t("newCustomerStatusInactive", "Inactive")
                      : t("newCustomerStatusBlocked", "Blocked")}
                </span>
                <button
                  type="button"
                  data-dema-chip={`vat-${headerChipsData.vatKind}`}
                  onClick={goToVatFieldFromSummary}
                  title={t("newCustomerGoToFieldVat", "Open Customer & Address — VAT ID")}
                  className={`customers-modal-genz-h-chip customers-modal-genz-h-chip--interactive max-w-[min(100%,14rem)] sm:max-w-none customers-modal-genz-h-chip--vat-${headerChipsData.vatKind}`}
                >
                  {headerChipsData.vatKind === "valid" ? (
                    <CheckCircle2 className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                  ) : headerChipsData.vatKind === "invalid" ? (
                    <AlertCircle className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
                  ) : null}
                  <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
                    <span>
                      {t("customer360ChipVat", "VAT")}:{" "}
                      {headerChipsData.vatKind === "valid"
                        ? t("customer360VatValid", "VAT valid")
                        : headerChipsData.vatKind === "invalid"
                          ? t("customer360VatInvalid", "VAT invalid")
                          : t("customer360VatUnknown", "Not verified")}
                    </span>
                    {headerChipsData.vatRequestDateDisplay ? (
                      <>
                        <span className="opacity-70" aria-hidden>
                          {" · "}
                        </span>
                        {headerChipsData.vatRequestDateIso ? (
                          <time
                            dateTime={headerChipsData.vatRequestDateIso}
                            className="tabular-nums font-normal opacity-90"
                            title={t("customer360VatRequestDateTitle", "VIES check date")}
                          >
                            {headerChipsData.vatRequestDateDisplay}
                          </time>
                        ) : (
                          <span
                            className="tabular-nums font-normal opacity-90"
                            title={t("customer360VatRequestDateTitle", "VIES check date")}
                          >
                            {headerChipsData.vatRequestDateDisplay}
                          </span>
                        )}
                      </>
                    ) : null}
                  </span>
                </button>
                <span
                  data-dema-chip="profile"
                  className="customers-modal-genz-h-chip customers-modal-genz-h-chip--metric cursor-default"
                >
                  {t("customer360ChipCompletion", "Profile")}
                  <span className="customers-modal-genz-h-chip-accent tabular-nums">{headerChipsData.pct}%</span>
                </span>
                <span
                  data-dema-chip={`risk-${headerChipsData.riskKind}`}
                  className={`customers-modal-genz-h-chip cursor-default customers-modal-genz-h-chip--risk-${headerChipsData.riskKind}`}
                >
                  {t("customer360ChipRisk", "Risk")}
                  {": "}
                  {headerChipsData.riskKind === "blocked"
                    ? t("customer360RiskBlocked", "Blocked account")
                    : headerChipsData.riskKind === "payment"
                      ? t("customer360RiskPayment", "Payment blocked")
                      : headerChipsData.riskKind === "billing"
                        ? t("customer360RiskBilling", "Billing incomplete")
                        : t("customer360RiskLow", "No flags")}
                </span>
                {onScrollToDocumentExpiry ? (
                  <button
                    type="button"
                    data-dema-chip={
                      customer360DocExpiryAlertCount !== null && customer360DocExpiryAlertCount > 0
                        ? "doc-alert"
                        : "doc-calm"
                    }
                    onClick={onScrollToDocumentExpiry}
                    className={`customers-modal-genz-h-chip customers-modal-genz-h-chip--interactive max-w-full ${
                      customer360DocExpiryAlertCount !== null && customer360DocExpiryAlertCount > 0
                        ? "customers-modal-genz-h-chip--doc-alert"
                        : "customers-modal-genz-h-chip--doc-calm"
                    }`}
                    title={t("customer360DocExpiryLinkTitle", "Jump to document dates in Risk analysis")}
                  >
                    {customer360DocExpiryAlertCount !== null && customer360DocExpiryAlertCount > 0 ? (
                      <ShieldAlert className="h-3 w-3 shrink-0 text-current sm:h-3.5 sm:w-3.5" aria-hidden />
                    ) : (
                      <Clock className="h-3 w-3 shrink-0 text-current opacity-90 sm:h-3.5 sm:w-3.5" aria-hidden />
                    )}
                    {customer360DocExpiryAlertCount !== null && customer360DocExpiryAlertCount > 0 ? (
                      <>
                        {customer360DocExpiryAlertCount}{" "}
                        {t("riskAlertBannerTitle", "Document Expiry Warning")}
                      </>
                    ) : (
                      t("customerCompactDocDeadlines", "Document deadlines")
                    )}
                  </button>
                ) : null}
                {headerChipsData.lastEditedLine ? (
                  <span
                    data-dema-chip="audit"
                    className="customers-modal-genz-h-chip customers-modal-genz-h-chip--meta min-w-0 max-w-full cursor-default sm:max-w-[min(100%,26rem)]"
                  >
                    <span className="customers-modal-genz-h-chip-strong">
                      {t("customer360ChipLastEdited", "Last saved")}
                    </span>
                    <span className="truncate tabular-nums">{headerChipsData.lastEditedLine}</span>
                  </span>
                ) : null}
                </div>
              </div>
            </div>
            <div className="customers-modal-genz-header-meta flex shrink-0 flex-col items-start gap-3 border-t border-white/10 pt-2 sm:flex-row sm:gap-6 lg:border-t-0 lg:pt-0 lg:pl-2 lg:text-right xl:items-end">
              <div className="lg:text-right">
                <p className="customers-modal-genz-header-meta-label text-[10px] font-medium uppercase tracking-wider">
                  {t("newCustomerModalAufnahme", "Entry date")}
                </p>
                <p className="customers-modal-genz-header-meta-value text-sm font-semibold tabular-nums">{aufnahmePreview}</p>
              </div>
              <div className="lg:text-right">
                <p className="customers-modal-genz-header-meta-label text-[10px] font-medium uppercase tracking-wider">
                  {t("newCustomerModalKdNrLabel", "Cust. no.")}
                </p>
                <div className="mt-0.5 flex items-center gap-1 lg:justify-end">
                  <p className="customers-modal-genz-header-meta-value text-base font-bold tabular-nums">{headerChipsData.kuNr}</p>
                  <button
                    type="button"
                    onClick={() => void copyPlainText(headerChipsData.kuNr)}
                    className="customers-modal-genz-icon-btn shrink-0 rounded-md p-1 transition"
                    aria-label={t("newCustomerCopyKuNrAria", "Copy customer number")}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + optional documents action (edit) */}
        <div
          className={`customers-modal-genz-tabs flex shrink-0 flex-col gap-1 border-b sm:flex-row sm:items-end sm:justify-between sm:gap-2 sm:px-3 sm:pt-1 md:px-4 ${
            hasEditKundeSideContent
              ? "has-edit-side border-slate-200/80"
              : "border-slate-200"
          }`}
        >
          <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] px-2 sm:px-0">
            <div className="flex w-max min-w-0 flex-nowrap gap-0.5 sm:gap-1">
              {tabOrder.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`relative -mb-px flex min-h-[44px] shrink-0 items-center gap-2 border-b-2 px-2.5 py-2 text-base font-semibold leading-snug transition sm:min-h-0 sm:px-3.5 sm:py-2.5 ${
                    tab === id
                      ? "border-neutral-800 text-slate-900"
                      : "border-transparent text-slate-500 hover:border-neutral-200 hover:text-slate-800"
                  }`}
                >
                  {id === "vat" ? (
                    <BadgeCheck className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                  ) : id === "kunde" ? (
                    <Building2 className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                  ) : id === "art" ? (
                    <Landmark className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                  ) : id === "waschanlage" ? (
                    <Droplets className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                  ) : id === "history" ? (
                    <Clock className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                  ) : id === "beziehungenFzg" ? (
                    <Car className="h-3.5 w-3.5 shrink-0 opacity-80 sm:h-4 sm:w-4" aria-hidden />
                  ) : null}
                  <span className="max-w-[11rem] truncate sm:max-w-none">{tabLabels[id]}</span>
                </button>
              ))}
            </div>
          </div>
          {isEditMode && editHeaderDocumentsAction ? (
            <div className="shrink-0 px-2 pb-1.5 sm:px-0 sm:pb-1">{editHeaderDocumentsAction}</div>
          ) : null}
        </div>

        <div
          className={`customers-modal-genz-body min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 ${
            hasEditKundeSideContent ? "has-edit-side overflow-x-hidden" : ""
          }`}
        >
          {tab === "vat" && (
            <div className="space-y-5">
              <div className="customers-modal-genz-frost-card rounded-2xl border border-white/60 p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>{t("newCustomerVatMemberState", "Member state / scheme")}</label>
                    <select
                      value={viesCountry}
                      onChange={(e) => {
                        const code = e.target.value;
                        setViesCountry(code);
                        const land = viesLandToFormLand(code);
                        if (!land) return;
                        setForm((f) => {
                          const list = f.adressen.length > 0 ? f.adressen : [emptyAdresse()];
                          return {
                            ...f,
                            adressen: list.map((a, i) =>
                              i === 0
                                ? { ...a, land_code: land, art_land_code: landCodeToArtLand(land) }
                                : a
                            ),
                          };
                        });
                      }}
                      className={inputClass}
                    >
                      {VIES_MS_OPTIONS.map((o) => (
                        <option key={o.code} value={o.code}>
                          {o.code} — {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t("newCustomerVatNrLabel", "VAT ID")}</label>
                    <input
                      type="text"
                      value={viesVatInput}
                      onChange={(e) => setViesVatInput(e.target.value)}
                      placeholder={t("newCustomerVatNrPh", "e.g. 814584193 or DE814584193")}
                      className={inputClass}
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={vatCheckLoading}
                    onClick={() => void runVatCheck()}
                    className="customers-modal-genz-vat-check rounded border border-neutral-800 bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {vatCheckLoading ? t("newCustomerVatChecking", "Checking…") : t("newCustomerVatCheck", "Check with VIES")}
                  </button>
                  {vatCheckResult && viesResultAllowsFormMerge(vatCheckResult) ? (
                    <button
                      type="button"
                      onClick={applyViesResultToForm}
                      className="rounded border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-neutral-50"
                    >
                      {t("newCustomerVatApply", "Apply to form")}
                    </button>
                  ) : null}
                </div>
                {vatCheckError ? (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {vatCheckError}
                  </p>
                ) : null}
                {vatCheckResult ? (
                  <div
                    className={`mt-4 rounded-lg border px-3 py-3 text-sm ${
                      coerceViesCheckValid(vatCheckResult.valid)
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                  >
                    <p className="font-semibold">
                      {coerceViesCheckValid(vatCheckResult.valid)
                        ? t("newCustomerVatValid", "VAT ID valid according to VIES")
                        : t("newCustomerVatInvalid", "VAT ID invalid or not confirmed")}
                    </p>
                    <p className="mt-1 font-mono text-xs">
                      {vatCheckResult.country_code}
                      {vatCheckResult.vat_number}
                    </p>
                    {coerceViesCheckValid(vatCheckResult.valid) &&
                    !isMeaningfulViesText(vatCheckResult.name) &&
                    !isMeaningfulViesText(vatCheckResult.address) ? (
                      <p className="mt-2 rounded-md border border-emerald-300/60 bg-white/80 px-2 py-2 text-xs leading-relaxed text-slate-700">
                        Das ist <strong>kein Fehler dieser Anwendung</strong>. Die EU erklärt, dass VIES
                        eine Suchmaschine über <strong>nationale</strong> USt-Register ist und der
                        Mitgliedstaat entscheidet, welche Felder er ausgibt; viele liefern aus{" "}
                        <strong>Datenschutz</strong> keinen Firmennamen und keine Adresse in der
                        Webschnittstelle (oft „---“), während die <strong>Nummer trotzdem gültig</strong>{" "}
                        sein kann. Nachlesen:{" "}
                        <ExternalDocLink href={VIES_OFFICIAL.yourEuropeDe}>
                          Your Europe — USt-IdNr. prüfen (VIES)
                        </ExternalDocLink>
                        , <ExternalDocLink href={VIES_OFFICIAL.faq}>FAQ</ExternalDocLink> (u. a.{" "}
                        <strong>Q17</strong>, <strong>Q22</strong>). Für Zuordnung Name/Adresse wenden Sie
                        sich an die <strong>Finanzbehörden</strong> des Unternehmens.                         Hier: Name/Adresse
                        unter <strong>Kunde &amp; Adresse</strong> eintragen.
                      </p>
                    ) : null}
                    {isMeaningfulViesText(vatCheckResult.name) ? (
                      <p className="notranslate mt-2 text-slate-800" translate="no">
                        <span className="font-medium text-slate-600">{t("newCustomerVatNameLabel", "Name:")} </span>
                        {vatCheckResult.name}
                      </p>
                    ) : null}
                    {isMeaningfulViesText(vatCheckResult.address) ? (
                      <div className="notranslate mt-1 text-slate-800" translate="no">
                        <p className="whitespace-pre-line">
                          <span className="font-medium text-slate-600">
                            {t("newCustomerVatAddressLabel", "Address:")}{" "}
                          </span>
                          {vatCheckResult.address}
                        </p>
                        {viesFormAddressSplitPreview ? (
                          <div className="mt-2 rounded-md border border-emerald-200/80 bg-white/90 px-2.5 py-2 text-xs text-slate-800">
                            <p className="font-semibold text-emerald-900">
                              {t(
                                "newCustomerVatAddressFormSplitHint",
                                "Split for the form (same as Apply to form)"
                              )}
                            </p>
                            {viesFormAddressSplitPreview.strasse?.trim() ? (
                              <p className="mt-1">
                                <span className="font-medium text-slate-600">
                                  {t("newCustomerLabelStrasse", "Street")}:
                                </span>{" "}
                                {viesFormAddressSplitPreview.strasse}
                              </p>
                            ) : null}
                            {viesFormAddressSplitPreview.plz?.trim() ? (
                              <p className="mt-0.5">
                                <span className="font-medium text-slate-600">
                                  {t("newCustomerLabelPLZ", "ZIP")}:
                                </span>{" "}
                                {viesFormAddressSplitPreview.plz}
                              </p>
                            ) : null}
                            {viesFormAddressSplitPreview.ort?.trim() ? (
                              <p className="mt-0.5">
                                <span className="font-medium text-slate-600">
                                  {t("newCustomerLabelOrt", "City")}:
                                </span>{" "}
                                {viesFormAddressSplitPreview.ort}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {vatCheckResult.request_identifier ? (
                      <p className="mt-2 break-all font-mono text-[11px] text-slate-700">
                        <span className="font-sans font-medium text-slate-600">requestIdentifier: </span>
                        {vatCheckResult.request_identifier}
                      </p>
                    ) : null}
                    {vatCheckResult.request_date ? (
                      <p className="mt-1 break-all font-mono text-[11px] text-slate-700">
                        <span className="font-sans font-medium text-slate-600">requestDate: </span>
                        {normalizeViesRequestDate(vatCheckResult.request_date, localeTag) ?? vatCheckResult.request_date}
                      </p>
                    ) : null}
                    {[
                      ["Name", vatCheckResult.trader_name_match],
                      ["Straße", vatCheckResult.trader_street_match],
                      ["PLZ", vatCheckResult.trader_postal_code_match],
                      ["Ort", vatCheckResult.trader_city_match],
                      ["Rechtsform", vatCheckResult.trader_company_type_match],
                    ].some(([, v]) => v) ? (
                      <div className="mt-2 rounded-md border border-slate-200 bg-white/90 px-2 py-2 text-xs text-slate-700">
                        <p className="font-semibold text-slate-800">{t("newCustomerVatMatchTitle", "Approximate match (VIES Match)")}</p>
                        <ul className="mt-1 list-inside list-disc">
                          {[
                            ["Name", vatCheckResult.trader_name_match],
                            ["Straße", vatCheckResult.trader_street_match],
                            ["PLZ", vatCheckResult.trader_postal_code_match],
                            ["Ort", vatCheckResult.trader_city_match],
                            ["Rechtsform", vatCheckResult.trader_company_type_match],
                          ].map(
                            ([label, val]) =>
                              val ? (
                                <li key={label}>
                                  <span className="font-medium">{label}:</span> {val}
                                </li>
                              ) : null
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {tab === "kunde" && (
            <div className="flex flex-col gap-4">

              {!isEditMode ? (
                <DocExtractBanner
                  scanState={docScanState}
                  fileName={docFileName}
                  extractedCount={extractedFields.size}
                  onFileSelect={handleDocUpload}
                  onClear={clearDocExtraction}
                />
              ) : null}

              {/* ── Main grid: Firmendaten | Adresse & Steuer | Kontakt | (optional edit-side, xl: 3+3+3+3) ── */}
              <div className={`grid gap-5 md:gap-6 ${editKundeGridClass}`}>

                {/* ── Col 1: Kundenart ── */}
                <div
                  className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--1 min-w-0 space-y-4 p-5 sm:p-6 ${kundePanelSurface} ${editKundeCol1}`}
                >
                  <div>
                    <p className={`${kundeSectionTitleClass} customers-modal-genz-kunde-col-title--1`}>
                      {t("customerModalColKundenart", "Customer classification")}
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>{t("newCustomerLabelKundenNr", "Customer no.")}</label>
                    <div
                      className="flex h-9 min-h-[44px] items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-semibold text-slate-800 sm:h-9"
                      title={isEditMode ? t("newCustomerKundenNrTooltipEdit", "Existing customer number") : t("newCustomerKundenNrTooltipNew", "Assigned when saving")}
                    >
                      {kundenNrDisplay}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelCustomerType", "Customer type")}</label>
                      <select
                        value={form.customer_type}
                        onChange={(e) => {
                          const next = e.target.value as FormState["customer_type"];
                          setForm((f) => ({
                            ...f,
                            customer_type: next,
                            juristische_person: next === "legal_entity",
                            natuerliche_person: next === "natural_person",
                          }));
                        }}
                        className={`${inputClass} min-h-[44px]`}
                      >
                        <option value="">{t("newCustomerCustomerTypeNone", "Select type")}</option>
                        <option value="legal_entity">{t("newCustomerCustomerTypeLegal", "Legal entity")}</option>
                        <option value="natural_person">{t("newCustomerCustomerTypeNatural", "Natural person")}</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelStatus", "Status")}</label>
                      <select
                        value={form.customer_status}
                        onChange={(e) => set("customer_status", e.target.value as FormState["customer_status"])}
                        className={`${inputClass} min-h-[44px]`}
                      >
                        <option value="active">{t("newCustomerStatusActive", "Active")}</option>
                        <option value="inactive">{t("newCustomerStatusInactive", "Inactive")}</option>
                        <option value="blocked">{t("newCustomerStatusBlocked", "Blocked")}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t("newCustomerLabelBranche", "Industry")}{isExtracted("branche") && <KiBadge />}</label>
                    <ExtractedFieldWrapper extracted={isExtracted("branche")}>
                      <SuggestTextInput
                        type="text"
                        value={form.branche}
                        onChange={(e) => set("branche", e.target.value)}
                        onBlur={(e) =>
                          commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                            set("branche", v)
                          )
                        }
                        onCompositionEnd={(e) =>
                          commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                            set("branche", v)
                          )
                        }
                        className={`${inputClass} min-h-[44px]`}
                        suggestions={fieldSuggestions.branche}
                        title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                      />
                    </ExtractedFieldWrapper>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end">
                    <div>
                      <span className={labelClass}>{t("newCustomerLabelFzgHandel", "Vehicle trader")}</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {(["ja", "nein"] as const).map((v) => (
                          <label
                            key={v}
                            className={`flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded border px-3 py-2 text-xs font-medium transition ${
                              form.fzgHandel === v
                                ? "border-neutral-500 bg-neutral-100 text-slate-900"
                                : "border-neutral-200 bg-white text-slate-600 hover:border-neutral-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="fzg"
                              checked={form.fzgHandel === v}
                              onChange={() => set("fzgHandel", v)}
                              className="border-neutral-300 text-neutral-700"
                            />
                            {v.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>
                        {t("newCustomerLabelGesellschaftsform", "Legal form")}
                        {isExtracted("gesellschaftsform") && <KiBadge />}
                      </label>
                      <ExtractedFieldWrapper extracted={isExtracted("gesellschaftsform")}>
                        <SuggestTextInput
                          type="text"
                          value={form.gesellschaftsform}
                          onChange={(e) => set("gesellschaftsform", e.target.value)}
                          onBlur={(e) =>
                            commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                              set("gesellschaftsform", v)
                            )
                          }
                          onCompositionEnd={(e) =>
                            commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                              set("gesellschaftsform", v)
                            )
                          }
                          placeholder={t("newCustomerGesellschaftsformPh", "e.g. GmbH, AG")}
                          className={`${inputClass} min-h-[44px]`}
                          suggestions={fieldSuggestions.gesellschaftsform}
                          title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                        />
                      </ExtractedFieldWrapper>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>
                        {t("newCustomerLabelAcquisitionSource", "Acquisition source")}
                      </label>
                      <select
                        value={form.acquisition_source}
                        onChange={(e) =>
                          set(
                            "acquisition_source",
                            e.target.value as FormState["acquisition_source"]
                          )
                        }
                        className={`${inputClass} min-h-[44px]`}
                      >
                        {acquisitionSourceOptions.map((opt) => (
                          <option key={opt.value || "none"} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>
                        {t("newCustomerLabelAcquisitionSourceEntity", "Source detail")}
                      </label>
                      <input
                        type="text"
                        value={form.acquisition_source_entity}
                        onChange={(e) => set("acquisition_source_entity", e.target.value)}
                        onBlur={(e) =>
                          commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                            set("acquisition_source_entity", v)
                          )
                        }
                        onCompositionEnd={(e) =>
                          commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                            set("acquisition_source_entity", v)
                          )
                        }
                        className={`${inputClass} min-h-[44px]`}
                        placeholder={t(
                          "newCustomerAcquisitionSourceEntityPh",
                          "Optional. Later: specific name for the selected source (e.g. referrer or site)."
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>{t("newCustomerLabelProfileNotes", "Profile notes")}</label>
                    <textarea
                      value={form.profile_notes}
                      onChange={(e) => set("profile_notes", e.target.value)}
                      onBlur={(e) =>
                        commitAsciiNormalized(e.target, transliterateToAsciiMultiline, (v) =>
                          set("profile_notes", v)
                        )
                      }
                      onCompositionEnd={(e) =>
                        commitAsciiNormalized(e.currentTarget, transliterateToAsciiMultiline, (v) =>
                          set("profile_notes", v)
                        )
                      }
                      rows={3}
                      className={`${inputClass} min-h-[88px] resize-y py-2`}
                      placeholder={t(
                        "newCustomerProfileNotesPh",
                        "Identity or legal context (separate from day-to-day operational notes)."
                      )}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>{t("newCustomerLabelOperationalNotes", "Operational notes")}</label>
                    <textarea
                      value={form.bemerkungen}
                      onChange={(e) => set("bemerkungen", e.target.value)}
                      onBlur={(e) =>
                        commitAsciiNormalized(e.target, transliterateToAsciiMultiline, (v) =>
                          set("bemerkungen", v)
                        )
                      }
                      onCompositionEnd={(e) =>
                        commitAsciiNormalized(e.currentTarget, transliterateToAsciiMultiline, (v) =>
                          set("bemerkungen", v)
                        )
                      }
                      rows={5}
                      className={`${inputClass} min-h-[120px] resize-y py-2`}
                    />
                  </div>

                  {isEditMode && editAfterOperationalNotesContent ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">{editAfterOperationalNotesContent}</div>
                  ) : null}
                </div>

                {/* ── Col 2: Stammdaten (company + address & tax) ── */}
                {(() => {
                  const safeAdresseIdx = Math.min(activeAdresseIdx, form.adressen.length - 1);
                  const a = form.adressen[safeAdresseIdx] ?? form.adressen[0]!;
                  const adCol = ADRESSE_COLORS[safeAdresseIdx % ADRESSE_COLORS.length]!;
                  const adInitials = a.ort ? a.ort.slice(0, 2).toUpperCase() : String(safeAdresseIdx + 1);

                  const patchAdresse = (patch: Partial<AdresseEntry>) =>
                    setForm((f) => ({
                      ...f,
                      adressen: f.adressen.map((ad, i) =>
                        i === safeAdresseIdx ? { ...ad, ...patch } : ad
                      ),
                    }));

                  return (
                    <div
                      className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--2 flex min-w-0 flex-col gap-3 p-5 sm:p-6 ${kundePanelSurface} ${editKundeCol2}`}
                    >
                      <div>
                        <p className={`${kundeSectionTitleClass} customers-modal-genz-kunde-col-title--2`}>
                          {t("customerModalColStammdaten", "Master data")}
                        </p>
                      </div>

                      <div>
                        <label className={labelClass}>{t("newCustomerLabelFirmenvorsatz", "Company prefix")}{isExtracted("firmenvorsatz") && <KiBadge />}</label>
                        <ExtractedFieldWrapper extracted={isExtracted("firmenvorsatz")}>
                          <SuggestTextInput
                            type="text"
                            value={form.firmenvorsatz}
                            onChange={(e) => set("firmenvorsatz", e.target.value)}
                            onBlur={(e) =>
                              commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                                set("firmenvorsatz", v)
                              )
                            }
                            onCompositionEnd={(e) =>
                              commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                                set("firmenvorsatz", v)
                              )
                            }
                            className={`${inputClass} min-h-[44px]`}
                            suggestions={fieldSuggestions.firmenvorsatz}
                            title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                          />
                        </ExtractedFieldWrapper>
                      </div>

                      <div>
                        <label className={labelClass}>
                          {t("newCustomerLabelFirmenname", "Company name")} <span className="text-red-500">*</span>
                          {isExtracted("firmenname") && <KiBadge />}
                        </label>
                        <ExtractedFieldWrapper extracted={isExtracted("firmenname")}>
                          <SuggestTextInput
                            id={FOCUS_ID_FIRMENNAME}
                            type="text"
                            value={form.firmenname}
                            onChange={(e) => set("firmenname", e.target.value)}
                            onBlur={(e) =>
                              commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                                set("firmenname", v)
                              )
                            }
                            onCompositionEnd={(e) =>
                              commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                                set("firmenname", v)
                              )
                            }
                            className={`${inputClass} min-h-[44px]`}
                            suggestions={fieldSuggestions.firmenname}
                            title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                          />
                        </ExtractedFieldWrapper>
                      </div>

                      {/* Address type pills + compact + Neu on one wrap row (pill-sized control) */}
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                        {form.adressen.map((ad, i) => {
                          const dc = ADRESSE_COLORS[i % ADRESSE_COLORS.length]!;
                          const isActive = i === safeAdresseIdx;
                          return (
                            <button
                              key={ad.id}
                              type="button"
                              onClick={() => setActiveAdresseIdx(i)}
                              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                                isActive
                                  ? `${dc.activePill} text-white shadow-sm`
                                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white/60" : dc.dotActive}`} />
                              {t(...(ADRESSE_TYP_I18N[ad.typ] ?? [ad.typ, ad.typ]))}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            const nextTyp = ADRESSE_TYPEN[form.adressen.length] ?? "Sonstiges";
                            setForm((f) => ({ ...f, adressen: [...f.adressen, emptyAdresse(nextTyp)] }));
                            setActiveAdresseIdx(form.adressen.length);
                          }}
                          className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <Plus className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                          {t("newCustomerAdresseNewBtn", "New")}
                        </button>
                      </div>

                      {/* Active address card */}
                      <div className="customers-modal-genz-frost-card overflow-hidden rounded-2xl border border-white/60">
                        {/* Card header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${adCol.activePill}`}>
                              {adInitials}
                            </div>
                            <select
                              value={a.typ}
                              onChange={(e) => patchAdresse({ typ: e.target.value })}
                              className="border-0 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
                            >
                              {ADRESSE_TYPEN.map((typ) => (
                                <option key={typ} value={typ}>{t(...(ADRESSE_TYP_I18N[typ] ?? [typ, typ]))}</option>
                              ))}
                            </select>
                          </div>
                          {form.adressen.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setForm((f) => ({ ...f, adressen: f.adressen.filter((_, i) => i !== safeAdresseIdx) }));
                                setActiveAdresseIdx(Math.max(0, safeAdresseIdx - 1));
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title={t("newCustomerAdresseRemove", "Remove address")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="space-y-2 p-3">
                          <div>
                            <label className={labelClass}>{t("globalAddrSearchLabel", "Address search (worldwide)")}</label>
                            <GlobalAddressSearch
                              onSelect={(r: GlobalAddressResult) => {
                                const road = r.strasse?.trim();
                                const line1 =
                                  road && road.length > 0
                                    ? road
                                    : (r.label.split(",")[0]?.trim() ?? "");
                                const code = (r.land_code ?? "").toUpperCase();
                                const landOk =
                                  code !== "" && LAND_OPTIONS.some((l) => l.code === code);
                                patchAdresse({
                                  strasse: line1,
                                  plz: r.plz ?? "",
                                  ort: r.ort ?? "",
                                  ...(landOk
                                    ? { land_code: code, art_land_code: landCodeToArtLand(code) }
                                    : {}),
                                });
                              }}
                            />
                          </div>
                          <div>
                            <label className={labelClass}>{t("newCustomerLabelStrasse", "Street")}{isExtracted("strasse") && <KiBadge />}</label>
                            <ExtractedFieldWrapper extracted={isExtracted("strasse")}>
                              <SuggestTextInput
                                id={FOCUS_ID_STRASSE}
                                type="text"
                                value={a.strasse}
                                onChange={(e) => patchAdresse({ strasse: e.target.value })}
                                onBlur={(e) =>
                                  commitAsciiNormalized(
                                    e.target,
                                    (s) => normalizeLatinAddressLine(s, "street"),
                                    (v) => patchAdresse({ strasse: v })
                                  )
                                }
                                onCompositionEnd={(e) =>
                                  commitAsciiNormalized(
                                    e.currentTarget,
                                    (s) => normalizeLatinAddressLine(s, "street"),
                                    (v) => patchAdresse({ strasse: v })
                                  )
                                }
                                placeholder={t("newCustomerStrassePh", "unknown")}
                                className={inputClass}
                                suggestions={fieldSuggestions.strasse}
                                title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                              />
                            </ExtractedFieldWrapper>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <label className={labelClass}>{t("newCustomerLabelPLZ", "ZIP")}{isExtracted("plz") && <KiBadge />}</label>
                              <ExtractedFieldWrapper extracted={isExtracted("plz")}>
                                <SuggestTextInput
                                  type="text"
                                  value={a.plz}
                                  onChange={(e) => patchAdresse({ plz: e.target.value })}
                                  onBlur={(e) =>
                                    commitAsciiNormalized(
                                      e.target,
                                      (s) => normalizeLatinAddressLine(s, "postal"),
                                      (v) => patchAdresse({ plz: v })
                                    )
                                  }
                                  onCompositionEnd={(e) =>
                                    commitAsciiNormalized(
                                      e.currentTarget,
                                      (s) => normalizeLatinAddressLine(s, "postal"),
                                      (v) => patchAdresse({ plz: v })
                                    )
                                  }
                                  className={inputClass}
                                  suggestions={fieldSuggestions.plz}
                                  title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                                />
                              </ExtractedFieldWrapper>
                            </div>
                            <div>
                              <label className={labelClass}>{t("newCustomerLabelOrt", "City")}{isExtracted("ort") && <KiBadge />}</label>
                              <ExtractedFieldWrapper extracted={isExtracted("ort")}>
                                <SuggestTextInput
                                  type="text"
                                  value={a.ort}
                                  onChange={(e) => patchAdresse({ ort: e.target.value })}
                                  onBlur={(e) =>
                                    commitAsciiNormalized(
                                      e.target,
                                      (s) => normalizeLatinAddressLine(s, "city"),
                                      (v) => patchAdresse({ ort: v })
                                    )
                                  }
                                  onCompositionEnd={(e) =>
                                    commitAsciiNormalized(
                                      e.currentTarget,
                                      (s) => normalizeLatinAddressLine(s, "city"),
                                      (v) => patchAdresse({ ort: v })
                                    )
                                  }
                                  className={inputClass}
                                  suggestions={fieldSuggestions.ort}
                                  title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                                />
                              </ExtractedFieldWrapper>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <label className={labelClass}>{t("newCustomerLabelLand", "Country")}{isExtracted("land_code") && <KiBadge />}</label>
                              <select
                                value={a.land_code}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  patchAdresse({ land_code: code, art_land_code: landCodeToArtLand(code) });
                                }}
                                className={inputClass}
                              >
                                {groupedLandOptions.map((group) => (
                                  <optgroup key={group.id} label={group.label}>
                                    {group.options.map((l) => (
                                      <option key={l.code} value={l.code}>
                                        {l.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>{t("newCustomerLabelArtLand", "Country type")}</label>
                              <select
                                value={a.art_land_code}
                                onChange={(e) => patchAdresse({ art_land_code: e.target.value })}
                                className={inputClass}
                              >
                                {ART_LAND_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <label className={labelClass}>{t("newCustomerLabelUstIdNr", "VAT ID no.")}{isExtracted("ust_id_nr") && <KiBadge />}</label>
                              <ExtractedFieldWrapper extracted={isExtracted("ust_id_nr")}>
                                <SuggestTextInput
                                  id={FOCUS_ID_UST}
                                  type="text"
                                  value={a.ust_id_nr}
                                  onChange={(e) => patchAdresse({ ust_id_nr: e.target.value })}
                                  className={inputClass}
                                  suggestions={fieldSuggestions.ust_id_nr}
                                  title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                                />
                              </ExtractedFieldWrapper>
                            </div>
                            <div>
                              <label className={labelClass}>{t("newCustomerLabelSteuerNr", "Tax no.")}{isExtracted("steuer_nr") && <KiBadge />}</label>
                              <ExtractedFieldWrapper extracted={isExtracted("steuer_nr")}>
                                <SuggestTextInput
                                  type="text"
                                  value={a.steuer_nr}
                                  onChange={(e) => patchAdresse({ steuer_nr: e.target.value })}
                                  className={inputClass}
                                  suggestions={fieldSuggestions.steuer_nr}
                                  title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                                />
                              </ExtractedFieldWrapper>
                            </div>
                          </div>

                          <div>
                            <label className={labelClass}>{t("customersLabelWebsite", "Website")}</label>
                            <input
                              type="text"
                              value={form.internet_adr}
                              onChange={(e) => setForm((f) => ({ ...f, internet_adr: e.target.value }))}
                              onBlur={(e) =>
                                commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                                  setForm((f) => ({ ...f, internet_adr: v }))
                                )
                              }
                              onCompositionEnd={(e) =>
                                commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                                  setForm((f) => ({ ...f, internet_adr: v }))
                                )
                              }
                              className={inputClass}
                              placeholder={t("newCustomerPhWebsite", "www.example.com")}
                              inputMode="url"
                              autoComplete="url"
                            />
                            {(() => {
                              const href = safeWebsiteHref(form.internet_adr);
                              if (!href) return null;
                              return (
                                <p className="mt-1.5 min-w-0 text-xs">
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex max-w-full items-center gap-1 font-medium text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    <span className="truncate">{t("customersWebsiteOpenLink", "Open website")}</span>
                                  </a>
                                </p>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Col 3: Kontaktperson ── */}
                {(() => {
                  const k = form.kontakte[activeKontaktIdx] ?? form.kontakte[0]!;
                  const safeIdx = Math.min(activeKontaktIdx, form.kontakte.length - 1);
                  const col = KONTAKT_COLORS[safeIdx % KONTAKT_COLORS.length]!;
                  const initials = k.name ? k.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : String(safeIdx + 1);

                  return (
                    <div
                      className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--3 flex min-w-0 flex-col gap-3 p-5 sm:p-6 ${kundePanelSurface} ${editKundeCol3}`}
                    >

                      {/* ── Header ── */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <p className={`${kundeSectionTitleClass} customers-modal-genz-kunde-col-title--3`}>
                            {t("customerModalColKontakt", "Contact person")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, kontakte: [...f.kontakte, emptyKontakt()] }));
                            setActiveKontaktIdx(form.kontakte.length);
                          }}
                          className="flex w-full shrink-0 items-center justify-center gap-1 rounded border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-neutral-50 sm:w-auto"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          {t("newCustomerKontaktNewBtn", "New")}
                        </button>
                      </div>

                      {/* ── Pill tabs (one per contact) ── */}
                      <div className="flex flex-wrap gap-1.5">
                        {form.kontakte.map((c, i) => {
                          const dc = KONTAKT_COLORS[i % KONTAKT_COLORS.length]!;
                          const isActive = i === safeIdx;
                          const label = c.name || t("newCustomerKontaktDefaultLabel", "Contact {n}").replace("{n}", String(i + 1));
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setActiveKontaktIdx(i)}
                              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                                isActive
                                  ? `${dc.activePill} text-white shadow-sm`
                                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white/60" : dc.dotActive}`} />
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* ── Active card ── */}
                      <div className="customers-modal-genz-kontakt-nested-card overflow-hidden rounded-2xl border border-white/60">
                        {/* Clean card header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${col.activePill}`}
                            >
                              {initials}
                            </div>
                            <span className="truncate text-sm font-semibold text-slate-700">
                              {k.name || t("newCustomerKontaktDefaultLabel", "Contact {n}").replace("{n}", String(safeIdx + 1))}
                            </span>
                          </div>
                          {form.kontakte.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setForm((f) => ({ ...f, kontakte: f.kontakte.filter((_, i) => i !== safeIdx) }));
                                setActiveKontaktIdx(Math.max(0, safeIdx - 1));
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              title={t("newCustomerKontaktRemove", "Remove contact")}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="space-y-2 p-3">
                          <div>
                            <label className={labelClass}>
                              {t("newCustomerLabelName", "Name")}
                              {safeIdx === 0 ? <span className="text-red-500"> *</span> : null}
                            </label>
                            <input
                              type="text"
                              value={k.name}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx ? { ...c, name: e.target.value } : c
                                  ),
                                }))
                              }
                              onBlur={(e) =>
                                commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                                  setForm((f) => ({
                                    ...f,
                                    kontakte: f.kontakte.map((c, i) =>
                                      i === safeIdx ? { ...c, name: v } : c
                                    ),
                                  }))
                                )
                              }
                              onCompositionEnd={(e) =>
                                commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                                  setForm((f) => ({
                                    ...f,
                                    kontakte: f.kontakte.map((c, i) =>
                                      i === safeIdx ? { ...c, name: v } : c
                                    ),
                                  }))
                                )
                              }
                              className={inputClass}
                              placeholder={t("newCustomerNamePh", "First and last name")}
                            />
                          </div>

                          {/* Role / job title */}
                          <div>
                            <label className={labelClass}>{t("newCustomerLabelRolle", "Function / Role")}</label>
                            <select
                              value={k.rolle}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx ? { ...c, rolle: e.target.value } : c
                                  ),
                                }))
                              }
                              className="h-9 w-full rounded border border-neutral-300 bg-white px-2.5 text-sm text-slate-700 focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600"
                            >
                              <option value="">{t("newCustomerRolleDefault", "— Select role —")}</option>
                              <option value="Geschäftsführer">Geschäftsführer / Geschäftsführerin</option>
                              <option value="Prokurist">Prokurist / Prokuristin</option>
                              <option value="Fuhrparkleiter">Fuhrparkleiter / -leiterin</option>
                              <option value="Disponent">Disponent / Disponentin</option>
                              <option value="Verkaufsleiter">Verkaufsleiter / -leiterin</option>
                              <option value="Einkäufer">Einkäufer / Einkäuferin</option>
                              <option value="Buchhalter">Buchhalter / Buchhalterin</option>
                              <option value="Werkstattleiter">Werkstattleiter / -leiterin</option>
                              <option value="Fahrer">Fahrer / Fahrerin</option>
                              <option value="Sekretariat">Sekretariat / Empfang</option>
                              <option value="Sonstiges">Sonstiges</option>
                            </select>
                          </div>

                          {/* Telefon */}
                          <div>
                            <label className={labelClass}>{t("newCustomerLabelTelefon", "Phone")}</label>
                            <input
                              type="tel"
                              value={k.telefon}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx ? { ...c, telefon: e.target.value } : c
                                  ),
                                }))
                              }
                              onBlur={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx
                                      ? {
                                          ...c,
                                          telefon: normalizePhoneValue(e.target.value),
                                        }
                                      : c
                                  ),
                                }))
                              }
                              className={inputClass}
                              placeholder={t("newCustomerPhPhone", "+49 30 1234567")}
                            />
                          </div>

                          {/* Handy */}
                          <div>
                            <label className={labelClass}>{t("newCustomerLabelHandy", "Mobile")}</label>
                            <input
                              type="tel"
                              value={k.handy}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx ? { ...c, handy: e.target.value } : c
                                  ),
                                }))
                              }
                              onBlur={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx
                                      ? {
                                          ...c,
                                          handy: normalizePhoneValue(e.target.value),
                                        }
                                      : c
                                  ),
                                }))
                              }
                              className={inputClass}
                              placeholder={t("newCustomerPhMobile", "+49 170 1234567")}
                            />
                          </div>

                          <div>
                            <label className={labelClass}>{t("newCustomerLabelEmail", "E-mail")}</label>
                            <input
                              id={safeIdx === 0 ? FOCUS_ID_KONTAKT_EMAIL : undefined}
                              type="email"
                              value={k.email}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx ? { ...c, email: e.target.value } : c
                                  ),
                                }))
                              }
                              className={inputClass}
                              placeholder={t("newCustomerPhEmail", "name@company.com")}
                            />
                          </div>

                          <div>
                            <label className={labelClass}>{t("newCustomerLabelKontaktBemerkung", "Note")}</label>
                            <textarea
                              value={k.bemerkung}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx ? { ...c, bemerkung: e.target.value } : c
                                  ),
                                }))
                              }
                              onBlur={(e) =>
                                commitAsciiNormalized(e.target, transliterateToAsciiMultiline, (v) =>
                                  setForm((f) => ({
                                    ...f,
                                    kontakte: f.kontakte.map((c, i) =>
                                      i === safeIdx ? { ...c, bemerkung: v } : c
                                    ),
                                  }))
                                )
                              }
                              onCompositionEnd={(e) =>
                                commitAsciiNormalized(e.currentTarget, transliterateToAsciiMultiline, (v) =>
                                  setForm((f) => ({
                                    ...f,
                                    kontakte: f.kontakte.map((c, i) =>
                                      i === safeIdx ? { ...c, bemerkung: v } : c
                                    ),
                                  }))
                                )
                              }
                              rows={2}
                              className={`${inputClass} min-h-[60px] resize-y py-2`}
                            />
                          </div>
                        </div>
                      </div>

                      {isEditMode && editKundeAppointmentsContent ? (
                        <div className="mt-2 min-w-0 space-y-2">{editKundeAppointmentsContent}</div>
                      ) : null}
                    </div>
                  );
                })()}

                {hasEditKundeSideContent ? (
                  <div
                    className={`customers-modal-genz-kunde-col customers-modal-genz-kunde-col--4 min-w-0 space-y-4 p-5 sm:p-6 ${kundePanelSurface} ${editKundeCol4}`}
                  >
                    <div>
                      <p className={`${kundeSectionTitleClass} customers-modal-genz-kunde-col-title--4`}>
                        {t("customerModalColBeziehungenRisiko", "Relationships & risk")}
                      </p>
                    </div>
                    <div className="min-w-0 space-y-4">{editKundeSideContent}</div>
                  </div>
                ) : null}
              </div>

              {isEditMode && editKundeBottomContent ? (
                <div className="mt-1">{editKundeBottomContent}</div>
              ) : null}
            </div>
          )}

          {tab === "art" && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="customers-modal-genz-frost-card space-y-4 rounded-2xl border border-white/60 p-4">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {t("newCustomerArtTitle", "Type / account")}
                  </p>
                  <p className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                    {t(
                      "newCustomerArtTypeStatusHint",
                      "Customer type and lifecycle status are edited under Customer & Address."
                    )}
                  </p>
                  <div>
                    <label className={labelClass}>{t("newCustomerLabelArtKunde", "Type (customer)")}</label>
                    <SuggestTextInput
                      type="text"
                      value={form.art_kunde}
                      onChange={(e) => set("art_kunde", e.target.value)}
                      onBlur={(e) =>
                        commitAsciiNormalized(e.target, transliterateToAscii, (v) => set("art_kunde", v))
                      }
                      onCompositionEnd={(e) =>
                        commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                          set("art_kunde", v)
                        )
                      }
                      className={inputClass}
                      suggestions={fieldSuggestions.art_kunde}
                      title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("newCustomerLabelBuchungskonto", "Main booking account")}</label>
                    <SuggestTextInput
                      type="text"
                      value={form.buchungskonto_haupt}
                      onChange={(e) => set("buchungskonto_haupt", e.target.value)}
                      onBlur={(e) =>
                        commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                          set("buchungskonto_haupt", v)
                        )
                      }
                      onCompositionEnd={(e) =>
                        commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                          set("buchungskonto_haupt", v)
                        )
                      }
                      className={inputClass}
                      suggestions={fieldSuggestions.buchungskonto_haupt}
                      title={t("newCustomerSuggestionsHint", "Suggestions from saved customers")}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("newCustomerLabelRole", "Role")}</label>
                    <select
                      value={form.customer_role}
                      onChange={(e) => set("customer_role", e.target.value as FormState["customer_role"])}
                      className={inputClass}
                    >
                      <option value="">{t("newCustomerRoleNone", "Select role")}</option>
                      <option value="supplier">{t("newCustomerRoleSupplier", "Supplier")}</option>
                      <option value="buyer">{t("newCustomerRoleBuyer", "Buyer")}</option>
                      <option value="workshop">{t("newCustomerRoleWorkshop", "Workshop")}</option>
                      <option value="wash">{t("newCustomerRoleWash", "Wash")}</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelRoleValidFrom", "Valid from")}</label>
                      <input
                        type="date"
                        value={form.role_valid_from}
                        onChange={(e) => set("role_valid_from", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelRoleValidTo", "Valid to")}</label>
                      <input
                        type="date"
                        value={form.role_valid_to}
                        onChange={(e) => set("role_valid_to", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="customers-modal-genz-frost-card space-y-4 rounded-2xl border border-white/60 p-4">
                  <p className="pt-0 text-sm font-bold uppercase tracking-wide text-slate-500">
                    {t("newCustomerFinanceBillingTitle", "Billing profile")}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelAccountNumber", "Account number")}</label>
                      <input
                        type="text"
                        value={form.account_number}
                        onChange={(e) => set("account_number", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelCreditLimit", "Credit limit")}</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.credit_limit}
                        onChange={(e) => set("credit_limit", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelBillingName", "Billing name")}</label>
                      <input
                        type="text"
                        value={form.billing_name}
                        onChange={(e) => set("billing_name", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelBillingStreet", "Billing street")}</label>
                      <input
                        type="text"
                        value={form.billing_street}
                        onChange={(e) => set("billing_street", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelBillingPostalCode", "Billing ZIP")}</label>
                      <input
                        type="text"
                        value={form.billing_postal_code}
                        onChange={(e) => set("billing_postal_code", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelBillingCity", "Billing city")}</label>
                      <input
                        type="text"
                        value={form.billing_city}
                        onChange={(e) => set("billing_city", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelBankname", "Bank name")}</label>
                      <input type="text" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelBic", "BIC")}</label>
                      <input type="text" value={form.bic} onChange={(e) => set("bic", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelIban", "IBAN")}</label>
                      <input type="text" value={form.iban} onChange={(e) => set("iban", e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-2">
                      <label className={labelClass}>{t("newCustomerLabelDirectDebit", "Direct debit")}</label>
                      <label className="flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.direct_debit_enabled}
                          onChange={(e) => set("direct_debit_enabled", e.target.checked)}
                          className="rounded border-neutral-300 text-neutral-700"
                        />
                        {t("newCustomerLabelEnabled", "Enabled")}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t("newCustomerLabelPaymentBlocked", "Payment blocked")}</label>
                    <label className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.payment_blocked}
                        onChange={(e) => set("payment_blocked", e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-700"
                      />
                      {t("commonYes", "Yes")}
                    </label>
                  </div>

                  <p className="pt-1 text-sm font-bold uppercase tracking-wide text-slate-400">
                    {t("newCustomerMarketingTitle", "Marketing profile")}
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelLifecycleStage", "Lifecycle stage")}</label>
                      <select
                        value={form.lifecycle_stage}
                        onChange={(e) => set("lifecycle_stage", e.target.value as FormState["lifecycle_stage"])}
                        className={inputClass}
                      >
                        <option value="">{t("newCustomerLifecycleNone", "Select stage")}</option>
                        <option value="lead">Lead</option>
                        <option value="qualified">Qualified</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="vip">VIP</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelAcquisitionDate", "Acquisition date")}</label>
                      <input
                        type="date"
                        value={form.acquisition_date}
                        onChange={(e) => set("acquisition_date", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelPreferredChannel", "Preferred channel")}</label>
                      <select
                        value={form.preferred_channel}
                        onChange={(e) => set("preferred_channel", e.target.value as FormState["preferred_channel"])}
                        className={inputClass}
                      >
                        <option value="">{t("newCustomerChannelNone", "Select channel")}</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="mixed">Mixed</option>
                        <option value="none">None</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelSegment", "Segment")}</label>
                      <input
                        type="text"
                        value={form.segment}
                        onChange={(e) => set("segment", e.target.value)}
                        className={inputClass}
                        placeholder={t("newCustomerSegmentPh", "e.g. Fleet Gold")}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t("newCustomerLabelScore", "Score")}</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={form.score}
                      onChange={(e) => set("score", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.consent_email}
                        onChange={(e) => set("consent_email", e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-700"
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.consent_sms}
                        onChange={(e) => set("consent_sms", e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-700"
                      />
                      SMS
                    </label>
                    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.consent_phone}
                        onChange={(e) => set("consent_phone", e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-700"
                      />
                      Phone
                    </label>
                  </div>
                  <div>
                    <label className={labelClass}>{t("newCustomerLabelFinancialNotes", "Financial notes")}</label>
                    <textarea
                      value={form.financial_notes}
                      onChange={(e) => set("financial_notes", e.target.value)}
                      rows={4}
                      className={`${inputClass} min-h-[96px] resize-y py-2`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("newCustomerLabelMarketingNotes", "Notes")}</label>
                    <textarea
                      value={form.marketing_notes}
                      onChange={(e) => set("marketing_notes", e.target.value)}
                      rows={5}
                      className={`${inputClass} min-h-[120px] resize-y py-2`}
                    />
                  </div>
                </div>
              </div>
          )}

          {tab === "waschanlage" && (
            <div className="space-y-5">
              <label className="customers-modal-genz-frost-card flex cursor-pointer items-start gap-3 rounded-2xl border border-white/60 p-4 text-sm text-slate-800">
                <input
                  type="checkbox"
                  checked={form.includeWashProfile}
                  onChange={(e) => set("includeWashProfile", e.target.checked)}
                  className="mt-0.5 rounded border-neutral-300 text-neutral-700"
                />
                <span>
                  <span className="font-semibold text-slate-900">{t("newCustomerWashProfileCreate", "Create wash profile")}</span>
                  <span className="mt-1 block text-xs font-normal text-slate-600">
                    {t("newCustomerWashProfileDesc", "Saves additional car wash data for this customer. Active by default in the Car wash area.")}
                  </span>
                </span>
              </label>

              {!form.includeWashProfile ? (
                <p className="customers-modal-genz-frost-card rounded-2xl border border-dashed border-white/50 px-4 py-8 text-center text-sm text-slate-500">
                  {t("newCustomerWashDisabledHint", 'Enable "Create wash profile" to save BUKto, limit, bank and wash info.')}
                </p>
              ) : (
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,1.15fr)_minmax(0,1fr)]">
                  <div className="space-y-6 xl:col-span-1">
                    {/* ── Bank & Zahlung ────────────────────────────── */}
                    <div className="customers-modal-genz-frost-card space-y-4 rounded-2xl border border-white/60 p-4">
                      <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
                        {t("newCustomerWashBankTitle", "Bank & Payment")}
                      </p>
                      <div>
                        <label className={labelClass}>{t("newCustomerLabelBankname", "Bank name")}</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_bankname}
                          onChange={(e) => set("wash_bankname", e.target.value)}
                          onBlur={(e) =>
                            commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                              set("wash_bankname", v)
                            )
                          }
                          onCompositionEnd={(e) =>
                            commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                              set("wash_bankname", v)
                            )
                          }
                          className={inputClass}
                          suggestions={fieldSuggestions.wash_bankname}
                          title={t("newCustomerWashSuggestionsHint", "Suggestions from wash profiles")}
                        />
                      </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelClass}>{t("newCustomerLabelBic", "BIC")}</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_bic}
                            onChange={(e) => set("wash_bic", e.target.value)}
                            className={inputClass}
                            suggestions={fieldSuggestions.wash_bic}
                            title={t("newCustomerWashSuggestionsHint", "Suggestions from wash profiles")}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>{t("newCustomerLabelIban", "IBAN")}</label>
                          <SuggestTextInput
                            type="text"
                            value={form.wash_iban}
                            onChange={(e) => set("wash_iban", e.target.value)}
                            className={inputClass}
                            suggestions={fieldSuggestions.wash_iban}
                            title={t("newCustomerWashSuggestionsHint", "Suggestions from wash profiles")}
                          />
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.wash_lastschrift}
                          onChange={(e) => set("wash_lastschrift", e.target.checked)}
                          className="rounded border-neutral-300 text-neutral-700"
                        />
                        {t("newCustomerLabelLastschrift", "Direct debit")}
                      </label>
                    </div>

                    <div className="customers-modal-genz-frost-card space-y-4 rounded-2xl border border-white/60 p-4">
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      {t("newCustomerWashKontoTitle", "Account")}
                    </p>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelBUKto", "BUKto")}</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_bukto}
                        onChange={(e) => set("wash_bukto", e.target.value)}
                        onBlur={(e) =>
                          commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                            set("wash_bukto", v)
                          )
                        }
                        onCompositionEnd={(e) =>
                          commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                            set("wash_bukto", v)
                          )
                        }
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_bukto}
                        title={t("newCustomerWashSuggestionsHint", "Suggestions from wash profiles")}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelLimit", "Limit (€)")}</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.wash_limit}
                        onChange={(e) => set("wash_limit", e.target.value)}
                        className={inputClass}
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        {t("newCustomerLimitHint", "Limit is only active when amount > 0.")}
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.wash_kunde_gesperrt}
                        onChange={(e) => set("wash_kunde_gesperrt", e.target.checked)}
                        className="rounded border-neutral-300 text-neutral-700"
                      />
                      {t("newCustomerLabelGesperrt", "Customer blocked")}
                    </label>
                    </div>
                  </div>

                  <div className="space-y-6 xl:col-span-1">
                    <div className="customers-modal-genz-frost-card rounded-2xl border border-white/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
                            {t("newCustomerWashPreislisteTitle", "Price list reference")}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {t("newCustomerWashPreislisteDesc", "Official DEMA car wash price list (PDF) for quick reference.")}
                          </p>
                        </div>
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />
                      </div>
                      <a
                        href={WASH_PRICE_LIST_PDF_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-neutral-50"
                      >
                        {t("newCustomerWashPreislisteOpen", "Open price list as PDF")}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    {/* ── Fuhrpark / Kennzeichen ────────────────────── */}
                    <div className="customers-modal-genz-frost-card space-y-3 self-start rounded-2xl border border-white/60 p-4">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-slate-600" />
                      <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
                        {t("newCustomerWashFuhrparkTitle", "Fleet / License plates")}
                      </p>
                    </div>
                    {/* Add new plate */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.wash_kennzeichen_new}
                        onChange={(e) => set("wash_kennzeichen_new", e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const v = form.wash_kennzeichen_new.trim();
                            if (v && !form.wash_kennzeichen_list.includes(v)) {
                              set("wash_kennzeichen_list", [...form.wash_kennzeichen_list, v]);
                              set("wash_kennzeichen_new", "");
                            }
                          }
                        }}
                        placeholder={t("newCustomerWashKennzeichenPh", "NEW: e.g. LU-XX-123")}
                        className={`${inputClass} flex-1`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = form.wash_kennzeichen_new.trim();
                          if (v && !form.wash_kennzeichen_list.includes(v)) {
                            set("wash_kennzeichen_list", [...form.wash_kennzeichen_list, v]);
                            set("wash_kennzeichen_new", "");
                          }
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white shadow-sm hover:bg-slate-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Plate list */}
                    {form.wash_kennzeichen_list.length > 0 && (
                      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                        {form.wash_kennzeichen_list.map((plate, idx) => (
                          <li key={plate} className="flex items-center justify-between px-3 py-2.5 text-sm text-slate-800">
                            <span className="font-medium tracking-wide">{plate}</span>
                            <button
                              type="button"
                              onClick={() =>
                                set(
                                  "wash_kennzeichen_list",
                                  form.wash_kennzeichen_list.filter((_, i) => i !== idx)
                                )
                              }
                              className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                              title={t("newCustomerWashKennzeichenRemove", "Remove")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {form.wash_kennzeichen_list.length === 0 && (
                      <p className="py-2 text-center text-xs text-slate-400">
                        {t("newCustomerWashNoKennzeichen", "No license plates added yet.")}
                      </p>
                    )}
                    </div>

                  </div>

                  <div className="space-y-6 xl:col-span-1">
                    {/* ── Wasch-Infos ───────────────────────────────── */}
                    <div className="customers-modal-genz-frost-card space-y-4 rounded-2xl border border-white/60 p-4">
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-700">
                      {t("newCustomerWashInfosTitle", "Wash info")}
                    </p>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelVehicleType", "Vehicle type")}</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_vehicle_type}
                        onChange={(e) => set("wash_vehicle_type", e.target.value)}
                        onBlur={(e) =>
                          commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                            set("wash_vehicle_type", v)
                          )
                        }
                        onCompositionEnd={(e) =>
                          commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                            set("wash_vehicle_type", v)
                          )
                        }
                        className={inputClass}
                        suggestions={fieldSuggestions.wasch_fahrzeug_typ}
                        placeholder={t("newCustomerVehicleTypePh", "e.g. car, van, truck")}
                        title={t("newCustomerWashSuggestionsHint", "Suggestions from wash profiles")}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelWaschprogramm", "Wash program")}</label>
                      <select
                        value={form.wasch_programm}
                        onChange={(e) => {
                          const selected = e.target.value;
                          set("wasch_programm", selected);
                          const cfg = WASCH_PROGRAMME.find((opt) => opt.label === selected);
                          if (!cfg) {
                            set("wash_netto_preis", "");
                            set("wash_brutto_preis", "");
                            return;
                          }
                          set("wash_netto_preis", priceToInput(cfg.netto));
                          set("wash_brutto_preis", priceToInput(cfg.brutto));
                        }}
                        className={inputClass}
                      >
                        <option value=""></option>
                        {WASCH_PROGRAMME.map((opt) => (
                          <option key={opt.label} value={opt.label}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>{t("newCustomerLabelNettoPreis", "Net price")}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.wash_netto_preis}
                          onChange={(e) => set("wash_netto_preis", e.target.value)}
                          placeholder={t("newCustomerNettoPreisPh", "e.g. 29.90")}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>{t("newCustomerLabelBruttoPreis", "Gross price")}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.wash_brutto_preis}
                          onChange={(e) => set("wash_brutto_preis", e.target.value)}
                          placeholder={t("newCustomerBruttoPreisPh", "e.g. 35.58")}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelIntervall", "Interval / frequency")}</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wasch_intervall}
                        onChange={(e) => set("wasch_intervall", e.target.value)}
                        onBlur={(e) =>
                          commitAsciiNormalized(e.target, transliterateToAscii, (v) =>
                            set("wasch_intervall", v)
                          )
                        }
                        onCompositionEnd={(e) =>
                          commitAsciiNormalized(e.currentTarget, transliterateToAscii, (v) =>
                            set("wasch_intervall", v)
                          )
                        }
                        placeholder={t("newCustomerIntervallPh", "e.g. weekly")}
                        className={inputClass}
                        suggestions={fieldSuggestions.wasch_intervall}
                        title={t("newCustomerWashSuggestionsHint", "Suggestions from wash profiles")}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelWichtigeInfos", "Important info")}</label>
                      <textarea
                        value={form.wash_wichtige_infos}
                        onChange={(e) => set("wash_wichtige_infos", e.target.value)}
                        onBlur={(e) =>
                          commitAsciiNormalized(e.target, transliterateToAsciiMultiline, (v) =>
                            set("wash_wichtige_infos", v)
                          )
                        }
                        onCompositionEnd={(e) =>
                          commitAsciiNormalized(e.currentTarget, transliterateToAsciiMultiline, (v) =>
                            set("wash_wichtige_infos", v)
                          )
                        }
                        rows={2}
                        className={`${inputClass} min-h-[64px] resize-y py-2`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t("newCustomerLabelWashBemerkungen", "Remarks (car wash)")}</label>
                      <textarea
                        value={form.wash_bemerkungen}
                        onChange={(e) => set("wash_bemerkungen", e.target.value)}
                        onBlur={(e) =>
                          commitAsciiNormalized(e.target, transliterateToAsciiMultiline, (v) =>
                            set("wash_bemerkungen", v)
                          )
                        }
                        onCompositionEnd={(e) =>
                          commitAsciiNormalized(e.currentTarget, transliterateToAsciiMultiline, (v) =>
                            set("wash_bemerkungen", v)
                          )
                        }
                        rows={3}
                        className={`${inputClass} min-h-[80px] resize-y py-2`}
                      />
                    </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "history" && isEditMode && (
            <CustomerHistoryTimeline
              historyEntries={historyEntries}
              localeTag={localeTag}
              t={t}
            />
          )}

          {tab === "beziehungenFzg" && (
            <div className="customers-modal-genz-frost-card rounded-2xl border border-white/60 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/80 text-slate-700 shadow-sm">
                  <Car className="h-6 w-6" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-900">
                    {t("newCustomerTabBeziehungenFzgPlaceholderTitle", "Vehicle relationships")}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {t(
                      "newCustomerTabBeziehungenFzgPlaceholderBody",
                      "This tab will connect the customer to vehicles and fleets (FZG). Business logic is not implemented yet; saving, VAT, documents, and existing data are unchanged."
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div
          className={`customers-modal-genz-footer shrink-0 border-t px-4 py-3 sm:px-6 ${
            isEditMode ? "is-edit-footer border-slate-200/80" : "border-slate-200"
          }`}
        >
          {isFormDirty ? (
            <div
              className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
              role="status"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              {t("customer360UnsavedChanges", "You have unsaved changes.")}
            </div>
          ) : null}
          {footerMessage?.type === "error" ? (
            <div
              className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
              role="alert"
            >
              <span>{footerMessage.text}</span>
              {footerMessage.moreCount != null && footerMessage.moreCount > 0 ? (
                <span className="ml-1 text-xs font-medium opacity-90">
                  {t("newCustomerValidationMore", "+ {n} more").replace(
                    "{n}",
                    String(footerMessage.moreCount)
                  )}
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <label className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
                {t("newCustomerZustaendige", "Responsible person")}
              </label>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-4">
                <select
                  value={form.zustaendige_person_name}
                  onChange={(e) => set("zustaendige_person_name", e.target.value)}
                  className="h-11 min-h-[44px] w-full rounded border border-neutral-300 bg-white px-3 text-sm leading-normal text-slate-800 transition-[border-color,box-shadow] focus:border-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-600 sm:h-9 sm:min-h-0 sm:w-auto sm:max-w-xs"
                >
                  {ZUSTAENDIGE_OPTIONS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
                <p
                  id="new-kunde-shortcuts-hint"
                  className="text-[10px] leading-relaxed text-slate-500 sm:max-w-[min(100%,24rem)] sm:pb-px"
                >
                  {t(
                    "newCustomerKeyboardShortcutsHint",
                    "Alt+1–9: switch tab · Ctrl+S: save · Esc: close (confirm if unsaved)"
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={requestClose}
                className="customers-modal-genz-btn-cancel rounded px-4 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50 focus-visible:ring-offset-2"
              >
                {t("commonCancel", "Cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={`customers-modal-genz-save rounded px-5 py-2.5 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/40 focus-visible:ring-offset-2 ${
                  isEditMode ? "is-edit-save" : ""
                }`}
              >
                {isEditMode ? t("newCustomerSaveEdit", "Save changes") : t("commonSave", "Save")}
              </button>
            </div>
          </div>
        </div>

        {showDiscardConfirm && (
          <div
            className="customers-modal-genz-inner-overlay customers-modal-genz-subbackdrop absolute inset-0 z-[30] flex items-center justify-center bg-slate-900/50 p-4"
            onClick={() => setShowDiscardConfirm(false)}
            role="presentation"
          >
            <div
              className="customers-modal-genz-subcard w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="discard-confirm-title"
              aria-describedby="discard-confirm-desc"
            >
              <div className="border-b border-slate-100 px-5 py-4">
                <h3
                  id="discard-confirm-title"
                  className="text-base font-semibold text-slate-900"
                >
                  {t("newCustomerDiscardTitle", "Discard changes?")}
                </h3>
              </div>
              <p id="discard-confirm-desc" className="px-5 py-4 text-sm text-slate-600">
                {t(
                  "newCustomerDiscardMsg",
                  "You have unsaved changes. Close without saving? Your edits will be lost."
                )}
              </p>
              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t("newCustomerDiscardStay", "Keep editing")}
                </button>
                <button
                  type="button"
                  onClick={performCloseDiscard}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                >
                  {t("newCustomerDiscardConfirm", "Discard")}
                </button>
              </div>
            </div>
          </div>
        )}

        {showDuplicateWarning && (
          <div className="customers-modal-genz-inner-overlay customers-modal-genz-subbackdrop absolute inset-0 z-20 flex items-center justify-center bg-slate-900/45 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white shadow-2xl shadow-amber-900/10">
              <div className="border-b border-amber-100 bg-amber-50 px-5 py-4">
                <h3 className="flex items-center gap-2 text-base font-semibold text-amber-800">
                  <svg className="h-5 w-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  {t("customersDuplicateTitle", "Possible duplicate detected")}
                </h3>
              </div>
              <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
                <p>
                  {t(
                    "customersDuplicateMsg",
                    "A customer with the same company name, street, or same company + ZIP + city already exists:"
                  )}
                </p>
                <ul className="space-y-1.5">
                  {duplicateMatches.map((m) => (
                    <li key={m.kuNr} className="rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-2">
                      <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-semibold text-slate-500">{m.kuNr}</span>
                      <span className="font-medium text-slate-800">{m.firmenname}</span>
                      </div>
                      {m.strasse?.trim() ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {t("newCustomerLabelStrasse", "Street")}: {m.strasse}
                        </p>
                      ) : null}
                      {(m.plz?.trim() || m.ort?.trim()) ? (
                        <p className="mt-1 text-xs text-slate-600">
                          {m.plz ?? ""}{m.plz?.trim() && m.ort?.trim() ? " " : ""}{m.ort ?? ""}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => { setShowDuplicateWarning(false); setDuplicateMatches([]); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t("customersDuplicateCancel", "Cancel")}
                </button>
                <button
                  type="button"
                  onClick={handleDuplicateSaveAnyway}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  {t("customersDuplicateSaveAnyway", "Save anyway")}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAttachPrompt && scannedAttachment ? (
          <div className="customers-modal-genz-inner-overlay customers-modal-genz-subbackdrop absolute inset-0 z-20 flex items-center justify-center bg-slate-900/45 p-4">
            <div className="customers-modal-genz-subcard w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-base font-semibold text-slate-900">Attach scanned file</h3>
              </div>
              <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
                <p>You scanned a document for prefill.</p>
                <p>Do you also want to attach that file to Customer Documents?</p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <p className="font-medium text-slate-700">{scannedAttachment.name}</p>
                  <p>{formatFileSize(scannedAttachment.size)}</p>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={() => submitCustomer(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => submitCustomer(true)}
                  className="rounded border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  Attach file
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalUi, document.body) : null;
}

