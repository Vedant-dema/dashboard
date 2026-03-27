import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { X, Droplets, BadgeCheck, Plus, Trash2, Car, FileText, ExternalLink } from "lucide-react";
import {
  DocExtractBanner,
  KiBadge,
  ExtractedFieldWrapper,
  type ScanState,
} from "./DocExtractBanner";
import type {
  NewKundeInput,
  KundenWashUpsertFields,
  NewKundenUnterlageInput,
} from "../store/kundenStore";
import type { CustomerFieldSuggestions } from "../store/customerFieldSuggestions";
import { SuggestTextInput } from "./SuggestTextInput";
import type { DepartmentArea } from "../types/departmentArea";
import type { KundenStamm, KundenWashStamm } from "../types/kunden";

type TabId = "vat" | "kunde" | "art" | "waschanlage" | "additional";

type KontaktEntry = {
  id: string;
  name: string;
  telefonCode: string;
  telefon: string;
  handyCode: string;
  handy: string;
  email: string;
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
    telefonCode: "+49",
    telefon: "",
    handyCode: "+49",
    handy: "",
    email: "",
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

const ADRESSE_COLORS: { dot: string; dotActive: string; activePill: string }[] = [
  { dot: "bg-indigo-300",  dotActive: "bg-indigo-500",  activePill: "bg-indigo-500"  },
  { dot: "bg-teal-300",    dotActive: "bg-teal-500",    activePill: "bg-teal-500"    },
  { dot: "bg-violet-300",  dotActive: "bg-violet-500",  activePill: "bg-violet-500"  },
  { dot: "bg-amber-300",   dotActive: "bg-amber-500",   activePill: "bg-amber-500"   },
  { dot: "bg-rose-300",    dotActive: "bg-rose-500",    activePill: "bg-rose-500"    },
  { dot: "bg-cyan-300",    dotActive: "bg-cyan-500",    activePill: "bg-cyan-500"    },
  { dot: "bg-slate-400",   dotActive: "bg-slate-600",   activePill: "bg-slate-600"   },
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

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

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
      className="font-medium text-blue-700 underline decoration-blue-400/70 underline-offset-2 hover:text-blue-900"
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
  const low = t.toLowerCase();
  if (["---", "n/a", "na", "none", "...", "..", "-", "unknown"].includes(low)) return false;
  const core = t.replace(/[\s\-\u00ad\u2010-\u2015\u2212\u00a0·.]+/gu, "");
  return core.length > 0;
}

function viesLandToFormLand(viesCode: string): string {
  const m: Record<string, string> = {
    DE: "DE",
    AT: "AT",
    NL: "NL",
    PL: "PL",
  };
  return m[viesCode] ?? "OTHER";
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
  const strasse = lines[0];
  if (lines.length === 1) return { strasse };
  const last = lines[lines.length - 1]!;
  const plzOrt = last.match(/^(\d{4,6})\s+(.+)$/);
  if (plzOrt) {
    return { strasse, plz: plzOrt[1], ort: plzOrt[2] };
  }
  return { strasse, ort: lines.slice(1).join(", ") };
}

function normalizeViesRequestDate(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsedMs = Date.parse(trimmed);
  if (!Number.isNaN(parsedMs)) {
    return new Date(parsedMs).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" });
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

/** EU member state codes (excluding DE which maps to IL). GR and EL both included (ISO vs. VIES). */
const EU_LAND_CODES = new Set(["AT", "BE", "BG", "CY", "CZ", "DK", "EE", "EL", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI"]);

function landCodeToArtLand(landCode: string): string {
  if (landCode === "DE") return "IL";
  if (EU_LAND_CODES.has(landCode)) return "EU";
  return "Drittland";
}

const ART_LAND_OPTIONS = ["IL", "EU", "Drittland"];

const KONTAKT_COLORS: { from: string; to: string; dot: string; dotActive: string; activePill: string }[] = [
  { from: "from-blue-500",    to: "to-indigo-500",  dot: "bg-blue-300",    dotActive: "bg-blue-500",    activePill: "bg-blue-500"    },
  { from: "from-emerald-500", to: "to-teal-500",    dot: "bg-emerald-300", dotActive: "bg-emerald-500", activePill: "bg-emerald-500" },
  { from: "from-violet-500",  to: "to-purple-500",  dot: "bg-violet-300",  dotActive: "bg-violet-500",  activePill: "bg-violet-500"  },
  { from: "from-orange-500",  to: "to-amber-500",   dot: "bg-orange-300",  dotActive: "bg-orange-500",  activePill: "bg-orange-500"  },
  { from: "from-pink-500",    to: "to-rose-500",    dot: "bg-pink-300",    dotActive: "bg-pink-500",    activePill: "bg-pink-500"    },
  { from: "from-cyan-500",    to: "to-sky-500",     dot: "bg-cyan-300",    dotActive: "bg-cyan-500",    activePill: "bg-cyan-500"    },
  { from: "from-slate-600",   to: "to-slate-800",   dot: "bg-slate-400",   dotActive: "bg-slate-600",   activePill: "bg-slate-600"   },
  { from: "from-sky-500",     to: "to-indigo-500",  dot: "bg-sky-300",     dotActive: "bg-sky-500",     activePill: "bg-sky-500"     },
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

function initialForm() {
  return {
    aufnahme: "",
    branche: "",
    fzgHandel: "" as "" | "ja" | "nein",
    juristische_person: false,
    natuerliche_person: false,
    gesellschaftsform: "",
    firmenvorsatz: "",
    firmenname: "",
    bemerkungen: "",
    zustaendige_person_name: "nicht zugeordnet",
    adressen: [emptyAdresse()] as AdresseEntry[],
    internet_adr: "",
    kontakte: [emptyKontakt()] as KontaktEntry[],
    art_kunde: "",
    buchungskonto_haupt: "",
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
  };
}

type FormState = ReturnType<typeof initialForm>;

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

  return {
    ...initialForm(),
    aufnahme: kunde.aufnahme ?? "",
    branche: kunde.branche ?? "",
    fzgHandel: kunde.fzg_haendler == null ? "" : kunde.fzg_haendler ? "ja" : "nein",
    juristische_person: kunde.juristische_person ?? false,
    natuerliche_person: kunde.natuerliche_person ?? false,
    gesellschaftsform: kunde.gesellschaftsform ?? "",
    firmenvorsatz: kunde.firmenvorsatz ?? "",
    firmenname: kunde.firmenname ?? "",
    bemerkungen: kunde.bemerkungen ?? "",
    zustaendige_person_name: kunde.zustaendige_person_name ?? "nicht zugeordnet",
    adressen: [
      {
        ...firstAdresse,
        strasse: kunde.strasse ?? "",
        plz: kunde.plz ?? "",
        ort: kunde.ort ?? "",
        land_code: kunde.land_code ?? "DE",
        art_land_code: kunde.art_land_code ?? landCodeToArtLand(kunde.land_code ?? "DE"),
        ust_id_nr: kunde.ust_id_nr ?? "",
        steuer_nr: kunde.steuer_nr ?? "",
        branchen_nr: kunde.branchen_nr ?? "",
      },
    ],
    internet_adr: kunde.internet_adr ?? "",
    kontakte: [
      {
        ...kontakt,
        name: kunde.ansprechpartner ?? "",
        ...(() => {
          const tel = splitStoredPhone(kunde.telefonnummer);
          const fax = splitStoredPhone(kunde.faxnummer);
          return {
            telefonCode: tel.code,
            telefon: tel.number,
            handyCode: fax.code,
            handy: fax.number,
          };
        })(),
        email: kunde.email ?? "",
        bemerkung: kunde.bemerkungen_kontakt ?? "",
      },
    ],
    art_kunde: kunde.art_kunde ?? "",
    buchungskonto_haupt: kunde.buchungskonto_haupt ?? "",
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
  };
}

function formToPayload(form: FormState): NewKundeInput {
  const fzg_haendler =
    form.fzgHandel === "ja" ? true : form.fzgHandel === "nein" ? false : undefined;
  const z = form.zustaendige_person_name.trim();
  const zustaendige_person_name =
    z && z !== "nicht zugeordnet" ? z : undefined;

  return {
    aufnahme: emptyToUndef(form.aufnahme),
    firmenname: form.firmenname.trim(),
    branche: emptyToUndef(form.branche),
    fzg_haendler,
    juristische_person: form.juristische_person,
    natuerliche_person: form.natuerliche_person,
    gesellschaftsform: emptyToUndef(form.gesellschaftsform),
    firmenvorsatz: emptyToUndef(form.firmenvorsatz),
    bemerkungen: emptyToUndef(form.bemerkungen),
    zustaendige_person_name,
    strasse: emptyToUndef(form.adressen[0]?.strasse ?? ""),
    plz: emptyToUndef(form.adressen[0]?.plz ?? ""),
    ort: emptyToUndef(form.adressen[0]?.ort ?? ""),
    land_code: form.adressen[0]?.land_code ?? "DE",
    art_land_code: emptyToUndef(form.adressen[0]?.art_land_code ?? ""),
    ust_id_nr: emptyToUndef(form.adressen[0]?.ust_id_nr ?? ""),
    steuer_nr: emptyToUndef(form.adressen[0]?.steuer_nr ?? ""),
    branchen_nr: emptyToUndef(form.adressen[0]?.branchen_nr ?? ""),
    ansprechpartner: emptyToUndef(form.kontakte[0]?.name ?? ""),
    telefonnummer: emptyToUndef(
      form.kontakte[0]?.telefon
        ? `${form.kontakte[0].telefonCode} ${form.kontakte[0].telefon}`
        : ""
    ),
    faxnummer: emptyToUndef(
      form.kontakte[0]?.handy
        ? `${form.kontakte[0].handyCode} ${form.kontakte[0].handy}`
        : ""
    ),
    email: emptyToUndef(form.kontakte[0]?.email ?? ""),
    internet_adr: emptyToUndef(form.internet_adr),
    bemerkungen_kontakt: emptyToUndef(form.kontakte[0]?.bemerkung ?? ""),
    faxen_flag: false,
    art_kunde: emptyToUndef(form.art_kunde),
    buchungskonto_haupt: emptyToUndef(form.buchungskonto_haupt),
  };
}

function washFormToPayload(form: FormState): KundenWashUpsertFields {
  const limit = Math.max(0, Number(form.wash_limit) || 0);
  return {
    bukto: emptyToUndef(form.wash_bukto),
    limit_betrag: limit,
    rechnung_zusatz: emptyToUndef(form.wash_rechnung_zusatz),
    rechnung_plz: emptyToUndef(form.wash_rechnung_plz),
    rechnung_ort: emptyToUndef(form.wash_rechnung_ort),
    rechnung_strasse: emptyToUndef(form.wash_rechnung_strasse),
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
  };
}

const tabLabels: Record<TabId, string> = {
  vat: "USt-IdNr. prüfen",
  kunde: "Kunde & Adresse",
  art: "Art / Buchungskonto",
  waschanlage: "Waschanlage",
  additional: "Additional",
};

const BASE_TAB_ORDER: TabId[] = ["vat", "kunde", "art", "waschanlage"];

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none ring-slate-200/50 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

type Props = {
  open: boolean;
  onClose: () => void;
  department?: DepartmentArea;
  mode?: "create" | "edit";
  editInitial?: { kunde: KundenStamm; wash?: KundenWashStamm | null };
  editKundeTopContent?: ReactNode;
  editAdresseExtraContent?: ReactNode;
  editKundeSideContent?: ReactNode;
  additionalTabLabel?: string;
  additionalTabContent?: ReactNode;
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
};

export function NewCustomerModal({
  open,
  onClose,
  department,
  mode = "create",
  editInitial,
  editKundeTopContent,
  editAdresseExtraContent,
  editKundeSideContent,
  additionalTabLabel = "Additional",
  additionalTabContent,
  nextKundenNrPreview,
  fieldSuggestions,
  onSubmit,
}: Props) {
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
  const isEditMode = mode === "edit";
  const hasAdditionalTab = isEditMode && Boolean(additionalTabContent);
  const hasEditKundeSideContent = isEditMode && Boolean(editKundeSideContent);
  const tabOrder: TabId[] = hasAdditionalTab
    ? [...BASE_TAB_ORDER, "additional" as TabId]
    : BASE_TAB_ORDER;
  const kundenNrDisplay = isEditMode ? editInitial?.kunde.kunden_nr ?? nextKundenNrPreview : nextKundenNrPreview;

  // Track whether the modal was open on the previous render so we only
  // re-initialise the form when the modal *transitions* from closed → open.
  // Without this guard, every parent re-render (search-bar keystroke, adding a
  // Termin/Beziehung, etc.) creates a new `editInitial` object reference and
  // causes this effect to reset the form, losing any unsaved edits.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;

    const nowAufnahme = new Date().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" });
    const prepared =
      isEditMode && editInitial
        ? formFromExistingCustomer(editInitial.kunde, editInitial.wash, department)
        : {
            ...initialForm(),
            aufnahme: nowAufnahme,
            includeWashProfile: department === "waschanlage",
          };
    setForm(prepared);
    setTab(isEditMode ? "kunde" : "vat");
    setActiveKontaktIdx(0);
    setActiveAdresseIdx(0);
    setViesCountry("DE");
    setViesVatInput("");
    setVatCheckLoading(false);
    setVatCheckResult(null);
    setVatCheckError(null);
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

    // Handle proxy / gateway error shapes that don't use FastAPI's {"detail": ...} format.
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>
      const candidate = obj["detail"] ?? obj["error"] ?? obj["message"] ?? obj["error_description"]
      const text = extractText(candidate)
      if (text) return applyFriendly(text)
    }

    return "Prüfung fehlgeschlagen — keine Detail-Antwort vom Server (möglicherweise Proxy-Timeout oder CORS-Problem)."
  }

  const runVatCheck = async () => {
    const trimmed = viesVatInput.trim();
    if (!trimmed) {
      setVatCheckError("Bitte USt-IdNr. eingeben.");
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
        const corsHint = {
          error: "CORS oder Netzwerkfehler (HTTP-Status 0)",
          hint: "Das Backend hat geantwortet, aber der Browser blockiert die Antwort. Stellen Sie sicher, dass CORS_ORIGINS auf dem Server die Cloud-Domain enthält.",
        };
        setVatCheckError(
          "CORS-Fehler: Der Browser blockiert die Antwort des Backends. Bitte CORS_ORIGINS in der Cloud-Konfiguration prüfen."
        );
        return;
      }
      const textBody = await res.text();
      let parsedBody: unknown = null;
      let parseError: string | null = null;
      try {
        parsedBody = textBody.trim() ? JSON.parse(textBody) : null;
      } catch {
        parseError = "Antwort war kein gültiges JSON (vermutlich Proxy-Timeout oder Gateway-Fehler)";
      }

      if (!res.ok) {
        const body = parsedBody as Record<string, unknown> | null;
        if (parseError) {
          setVatCheckError(
            `HTTP ${res.status} — ${parseError}. Proxy-Timeout? Prüfen Sie VIES_MAX_TOTAL_SEC in der Backend-Konfiguration.`
          );
          return;
        }
        // Empty body — show the HTTP status code clearly.
        if (!body || Object.keys(body).length === 0) {
          const hint =
            res.status === 405
              ? `HTTP 405 — der Server verbietet POST auf diesem Pfad. Im Cloud-Deployment fehlt wahrscheinlich die Umgebungsvariable VITE_API_BASE_URL (Build-Zeit). Ohne sie landen Anfragen beim Frontend-Host statt beim Python-Backend. Setzen Sie VITE_API_BASE_URL=https://ihr-backend.example.com in den Build-Einstellungen und bauen Sie das Frontend neu.`
              : `HTTP ${res.status} — leere Antwort vom Server. Mögliche Ursachen: Proxy-Timeout, Cold-Start des Backends oder fehlende CORS_ORIGINS-Konfiguration.`;
          setVatCheckError(hint);
          return;
        }
        setVatCheckError(formatVatCheckDetail(body));
        return;
      }
      const body = parsedBody as ViesCheckResult;
      setVatCheckResult(body);
    } catch (err) {
      const jsMsg = err instanceof Error ? err.message : String(err)
      const targetUrl = `${API_BASE || "(Vite-Proxy)"}/api/v1/vat/check`
      const hint = API_BASE
        ? `Prüfen Sie, ob das Backend unter ${API_BASE} läuft und CORS_ORIGINS diese Domain enthält.`
        : "Lokal: Läuft das Python-Backend? (uvicorn main:app --reload --port 8000). Cloud: VITE_API_BASE_URL als Build-Variable setzen."
      setVatCheckError(
        `Netzwerkfehler — ${jsMsg}. Ziel: ${targetUrl}. ${hint}`
      );
    } finally {
      setVatCheckLoading(false);
    }
  };

  const applyViesResultToForm = () => {
    if (!vatCheckResult?.valid) return;
    const cc = vatCheckResult.country_code;
    const nr = vatCheckResult.vat_number;
    const ust = `${cc}${nr}`.replace(/\s+/g, "");
    const addr = isMeaningfulViesText(vatCheckResult.address)
      ? parseViesAddress(vatCheckResult.address)
      : {};
    const nm = isMeaningfulViesText(vatCheckResult.name) ? vatCheckResult.name!.trim() : "";
    const viesRequestDate = normalizeViesRequestDate(vatCheckResult.request_date);
    const derivedLandCode = viesLandToFormLand(cc);
    setForm((f) => ({
      ...f,
      ...(viesRequestDate ? { aufnahme: viesRequestDate } : {}),
      ...(nm ? { firmenname: nm } : {}),
      adressen: f.adressen.map((a, i) =>
        i === 0
          ? {
              ...a,
              ust_id_nr: ust,
              land_code: derivedLandCode,
              art_land_code: landCodeToArtLand(derivedLandCode),
              ...(addr.strasse ? { strasse: addr.strasse } : {}),
              ...(addr.plz ? { plz: addr.plz } : {}),
              ...(addr.ort ? { ort: addr.ort } : {}),
            }
          : a
      ),
    }));
    if (viesRequestDate) {
      setAufnahmePreview(viesRequestDate);
    }
    setTab("kunde");
  };

  const submitCustomer = (attachScanned: boolean) => {
    const wash = form.includeWashProfile ? washFormToPayload(form) : null;
    const payload = formToPayload(form);
    const finalPayload =
      isEditMode && editInitial
        ? { ...payload, kunden_nr: editInitial.kunde.kunden_nr }
        : payload;
    onSubmit(finalPayload, wash, attachScanned ? scannedAttachment : null);
    setShowAttachPrompt(false);
  };

  const handleSave = () => {
    if (!form.firmenname.trim()) {
      alert("Bitte geben Sie einen Firmennamen ein.");
      setTab("kunde");
      return;
    }
    if (!isEditMode && scannedAttachment) {
      setShowAttachPrompt(true);
      return;
    }
    submitCustomer(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px] sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative flex w-full max-w-[92rem] max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-kunde-title"
      >
        {/* Title bar — inspired by legacy DEMA header */}
        <div className="relative flex shrink-0 flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 pr-14 text-white sm:flex-nowrap sm:px-6 sm:pr-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 id="new-kunde-title" className="text-lg font-bold tracking-tight sm:text-xl">
                Kundendaten
              </h2>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-blue-100">
                {isEditMode ? "(Bearbeiten)" : "(Neu)"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">DEMA Management</p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Aufnahme
            </p>
            <p className="text-sm font-semibold tabular-nums text-white">{aufnahmePreview}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2 top-2 rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 flex-wrap gap-0 border-b border-slate-200 bg-slate-50/90 px-4 pt-2 sm:px-5">
          {tabOrder.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                tab === id
                  ? id === "waschanlage"
                    ? "border-cyan-600 text-cyan-800"
                    : "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {id === "waschanlage" ? (
                <Droplets className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              ) : id === "vat" ? (
                <BadgeCheck className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              ) : null}
              {id === "additional" ? additionalTabLabel : tabLabels[id]}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-4 py-3 sm:px-5">
          {tab === "vat" && (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Mitgliedstaat / Schema</label>
                    <select
                      value={viesCountry}
                      onChange={(e) => setViesCountry(e.target.value)}
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
                    <label className={labelClass}>USt-IdNr.</label>
                    <input
                      type="text"
                      value={viesVatInput}
                      onChange={(e) => setViesVatInput(e.target.value)}
                      placeholder="z. B. 814584193 oder DE814584193"
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
                    className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {vatCheckLoading ? "Prüfe…" : "Bei VIES prüfen"}
                  </button>
                  {vatCheckResult?.valid ? (
                    <button
                      type="button"
                      onClick={applyViesResultToForm}
                      className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                    >
                      Daten ins Formular übernehmen
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
                      vatCheckResult.valid
                        ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                        : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                  >
                    <p className="font-semibold">
                      {vatCheckResult.valid
                        ? "USt-IdNr. gültig laut VIES"
                        : "USt-IdNr. ungültig oder nicht bestätigt"}
                    </p>
                    <p className="mt-1 font-mono text-xs">
                      {vatCheckResult.country_code}
                      {vatCheckResult.vat_number}
                    </p>
                    {vatCheckResult.valid &&
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
                      <p className="mt-2 text-slate-800">
                        <span className="font-medium text-slate-600">Name: </span>
                        {vatCheckResult.name}
                      </p>
                    ) : null}
                    {isMeaningfulViesText(vatCheckResult.address) ? (
                      <p className="mt-1 whitespace-pre-line text-slate-800">
                        <span className="font-medium text-slate-600">Adresse: </span>
                        {vatCheckResult.address}
                      </p>
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
                        {normalizeViesRequestDate(vatCheckResult.request_date) ?? vatCheckResult.request_date}
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
                        <p className="font-semibold text-slate-800">Näherungsabgleich (VIES Match)</p>
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
            <div className="flex flex-col gap-3">

              {isEditMode ? (
                editKundeTopContent ?? null
              ) : (
                <DocExtractBanner
                  scanState={docScanState}
                  fileName={docFileName}
                  extractedCount={extractedFields.size}
                  onFileSelect={handleDocUpload}
                  onClear={clearDocExtraction}
                />
              )}

              {/* ── Main grid: Firmendaten | Adresse & Steuer | Kontakt | (optional edit-side) ── */}
              <div className={`grid gap-4 ${hasEditKundeSideContent ? "grid-cols-4" : "grid-cols-3"}`}>

                {/* ── Col 1: Firmendaten ── */}
                <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Firmendaten</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>KundenNr.</label>
                      <div
                        className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-semibold text-slate-800"
                        title={isEditMode ? "Bestehende Kundennummer" : "Wird beim Speichern vergeben"}
                      >
                        {kundenNrDisplay}
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Branche{isExtracted("branche") && <KiBadge />}</label>
                      <ExtractedFieldWrapper extracted={isExtracted("branche")}>
                        <SuggestTextInput
                          type="text"
                          value={form.branche}
                          onChange={(e) => set("branche", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.branche}
                          title="Vorschläge aus gespeicherten Kunden"
                        />
                      </ExtractedFieldWrapper>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className={labelClass}>FZG-Händler</span>
                      <div className="mt-1 flex gap-2">
                        {(["ja", "nein"] as const).map((v) => (
                          <label
                            key={v}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                              form.fzgHandel === v
                                ? "border-blue-500 bg-blue-50 text-blue-800"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="fzg"
                              checked={form.fzgHandel === v}
                              onChange={() => set("fzgHandel", v)}
                              className="border-slate-300 text-blue-600"
                            />
                            {v.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Gesellschaftsform{isExtracted("gesellschaftsform") && <KiBadge />}</label>
                      <ExtractedFieldWrapper extracted={isExtracted("gesellschaftsform")}>
                        <SuggestTextInput
                          type="text"
                          value={form.gesellschaftsform}
                          onChange={(e) => set("gesellschaftsform", e.target.value)}
                          placeholder="z. B. GmbH, AG"
                          className={inputClass}
                          suggestions={fieldSuggestions.gesellschaftsform}
                          title="Vorschläge aus gespeicherten Kunden"
                        />
                      </ExtractedFieldWrapper>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.juristische_person}
                        onChange={(e) => set("juristische_person", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      Juristische Person
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.natuerliche_person}
                        onChange={(e) => set("natuerliche_person", e.target.checked)}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      Natürliche Person
                    </label>
                  </div>

                  <div>
                    <label className={labelClass}>Firmenvorsatz{isExtracted("firmenvorsatz") && <KiBadge />}</label>
                    <ExtractedFieldWrapper extracted={isExtracted("firmenvorsatz")}>
                      <SuggestTextInput
                        type="text"
                        value={form.firmenvorsatz}
                        onChange={(e) => set("firmenvorsatz", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.firmenvorsatz}
                        title="Vorschläge aus gespeicherten Kunden"
                      />
                    </ExtractedFieldWrapper>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Firmenname <span className="text-red-500">*</span>
                      {isExtracted("firmenname") && <KiBadge />}
                    </label>
                    <ExtractedFieldWrapper extracted={isExtracted("firmenname")}>
                      <SuggestTextInput
                        type="text"
                        value={form.firmenname}
                        onChange={(e) => set("firmenname", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.firmenname}
                        title="Vorschläge aus gespeicherten Kunden"
                      />
                    </ExtractedFieldWrapper>
                  </div>


                  <div>
                    <label className={labelClass}>Bemerkungen</label>
                    <textarea
                      value={form.bemerkungen}
                      onChange={(e) => set("bemerkungen", e.target.value)}
                      rows={8}
                      className={`${inputClass} resize-y py-2 min-h-[120px]`}
                    />
                  </div>
                </div>

                {/* ── Col 2: Adresse & Steuer ── */}
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
                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">

                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Adresse &amp; Steuer</p>
                        <button
                          type="button"
                          onClick={() => {
                            const nextTyp = ADRESSE_TYPEN[form.adressen.length] ?? "Sonstiges";
                            setForm((f) => ({ ...f, adressen: [...f.adressen, emptyAdresse(nextTyp)] }));
                            setActiveAdresseIdx(form.adressen.length);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-600 transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Neu
                        </button>
                      </div>

                      {/* Pill tabs */}
                      <div className="flex flex-wrap gap-1.5">
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
                              {ad.typ}
                            </button>
                          );
                        })}
                      </div>

                      {/* Active address card */}
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                              {ADRESSE_TYPEN.map((t) => (
                                <option key={t} value={t}>{t}</option>
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
                              title="Adresse entfernen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="space-y-2 p-3">
                          <div>
                            <label className={labelClass}>Strasse{isExtracted("strasse") && <KiBadge />}</label>
                            <ExtractedFieldWrapper extracted={isExtracted("strasse")}>
                              <SuggestTextInput
                                type="text"
                                value={a.strasse}
                                onChange={(e) => patchAdresse({ strasse: e.target.value })}
                                placeholder="nicht bekannt"
                                className={inputClass}
                                suggestions={fieldSuggestions.strasse}
                                title="Vorschläge aus gespeicherten Kunden"
                              />
                            </ExtractedFieldWrapper>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelClass}>PLZ{isExtracted("plz") && <KiBadge />}</label>
                              <ExtractedFieldWrapper extracted={isExtracted("plz")}>
                                <SuggestTextInput
                                  type="text"
                                  value={a.plz}
                                  onChange={(e) => patchAdresse({ plz: e.target.value })}
                                  className={inputClass}
                                  suggestions={fieldSuggestions.plz}
                                  title="Vorschläge aus gespeicherten Kunden"
                                />
                              </ExtractedFieldWrapper>
                            </div>
                            <div>
                              <label className={labelClass}>Ort{isExtracted("ort") && <KiBadge />}</label>
                              <ExtractedFieldWrapper extracted={isExtracted("ort")}>
                                <SuggestTextInput
                                  type="text"
                                  value={a.ort}
                                  onChange={(e) => patchAdresse({ ort: e.target.value })}
                                  className={inputClass}
                                  suggestions={fieldSuggestions.ort}
                                  title="Vorschläge aus gespeicherten Kunden"
                                />
                              </ExtractedFieldWrapper>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelClass}>Land{isExtracted("land_code") && <KiBadge />}</label>
                              <select
                                value={a.land_code}
                                onChange={(e) => {
                                  const code = e.target.value;
                                  patchAdresse({ land_code: code, art_land_code: landCodeToArtLand(code) });
                                }}
                                className={inputClass}
                              >
                                {LAND_OPTIONS.map((l) => (
                                  <option key={l.code} value={l.code}>{l.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className={labelClass}>Art_Land</label>
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

                          <div>
                            <label className={labelClass}>UST-ID-Nr.</label>
                            <SuggestTextInput
                              type="text"
                              value={a.ust_id_nr}
                              onChange={(e) => patchAdresse({ ust_id_nr: e.target.value })}
                              className={inputClass}
                              suggestions={fieldSuggestions.ust_id_nr}
                              title="Vorschläge aus gespeicherten Kunden"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className={labelClass}>Steuer-Nr.</label>
                              <SuggestTextInput
                                type="text"
                                value={a.steuer_nr}
                                onChange={(e) => patchAdresse({ steuer_nr: e.target.value })}
                                className={inputClass}
                                suggestions={fieldSuggestions.steuer_nr}
                                title="Vorschläge aus gespeicherten Kunden"
                              />
                            </div>
                            <div>
                              <label className={labelClass}>Branchen-Nr.</label>
                              <SuggestTextInput
                                type="text"
                                value={a.branchen_nr}
                                onChange={(e) => patchAdresse({ branchen_nr: e.target.value })}
                                className={inputClass}
                                suggestions={fieldSuggestions.branchen_nr}
                                title="Vorschläge aus gespeicherten Kunden"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {isEditMode && editAdresseExtraContent ? <div className="pt-2">{editAdresseExtraContent}</div> : null}
                    </div>
                  );
                })()}

                {/* ── Col 3: Kontakt ── */}
                {(() => {
                  const k = form.kontakte[activeKontaktIdx] ?? form.kontakte[0]!;
                  const safeIdx = Math.min(activeKontaktIdx, form.kontakte.length - 1);
                  const col = KONTAKT_COLORS[safeIdx % KONTAKT_COLORS.length]!;
                  const initials = k.name ? k.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() : String(safeIdx + 1);

                  return (
                    <div className="flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">

                      {/* ── Header ── */}
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Kontakte</p>
                        <button
                          type="button"
                          onClick={() => {
                            setForm((f) => ({ ...f, kontakte: [...f.kontakte, emptyKontakt()] }));
                            setActiveKontaktIdx(form.kontakte.length);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:from-blue-700 hover:to-indigo-700 transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Neu
                        </button>
                      </div>

                      {/* ── Pill tabs (one per contact) ── */}
                      <div className="flex flex-wrap gap-1.5">
                        {form.kontakte.map((c, i) => {
                          const dc = KONTAKT_COLORS[i % KONTAKT_COLORS.length]!;
                          const isActive = i === safeIdx;
                          const label = c.name || `Kontakt ${i + 1}`;
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
                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        {/* Clean card header */}
                        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${col.activePill}`}
                            >
                              {initials}
                            </div>
                            <span className="truncate text-sm font-semibold text-slate-700">
                              {k.name || `Kontakt ${safeIdx + 1}`}
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
                              title="Kontakt entfernen"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="space-y-2 p-3">
                          <div>
                            <label className={labelClass}>Name</label>
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
                              className={inputClass}
                              placeholder="Vor- und Nachname"
                            />
                          </div>

                          {/* Telefon with country code */}
                          <div>
                            <label className={labelClass}>Telefon</label>
                            <div className="flex gap-1.5">
                              <select
                                value={k.telefonCode}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    kontakte: f.kontakte.map((c, i) =>
                                      i === safeIdx ? { ...c, telefonCode: e.target.value } : c
                                    ),
                                  }))
                                }
                                className="h-9 w-24 shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 text-xs text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              >
                                {COUNTRY_CODES.map((cc) => (
                                  <option key={cc.code} value={cc.code}>{cc.label}</option>
                                ))}
                              </select>
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
                                className={`${inputClass} flex-1`}
                                placeholder="030 1234567"
                              />
                            </div>
                          </div>

                          {/* Handy with country code */}
                          <div>
                            <label className={labelClass}>Handy</label>
                            <div className="flex gap-1.5">
                              <select
                                value={k.handyCode}
                                onChange={(e) =>
                                  setForm((f) => ({
                                    ...f,
                                    kontakte: f.kontakte.map((c, i) =>
                                      i === safeIdx ? { ...c, handyCode: e.target.value } : c
                                    ),
                                  }))
                                }
                                className="h-9 w-24 shrink-0 rounded-lg border border-slate-200 bg-white px-1.5 text-xs text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              >
                                {COUNTRY_CODES.map((cc) => (
                                  <option key={cc.code} value={cc.code}>{cc.label}</option>
                                ))}
                              </select>
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
                                className={`${inputClass} flex-1`}
                                placeholder="0170 1234567"
                              />
                            </div>
                          </div>

                          <div>
                            <label className={labelClass}>E-Mail</label>
                            <input
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
                              placeholder="name@firma.de"
                            />
                          </div>

                          <div>
                            <label className={labelClass}>Bemerkung</label>
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
                              rows={8}
                              className={`${inputClass} resize-y py-2 min-h-[120px]`}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}

                {hasEditKundeSideContent ? <div className="space-y-4">{editKundeSideContent}</div> : null}
              </div>
            </div>
          )}

          {tab === "art" && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Art (Kunde)</label>
                <SuggestTextInput
                  type="text"
                  value={form.art_kunde}
                  onChange={(e) => set("art_kunde", e.target.value)}
                  className={inputClass}
                  suggestions={fieldSuggestions.art_kunde}
                  title="Vorschläge aus gespeicherten Kunden"
                />
              </div>
              <div>
                <label className={labelClass}>Buchungskonto (Haupt)</label>
                <SuggestTextInput
                  type="text"
                  value={form.buchungskonto_haupt}
                  onChange={(e) => set("buchungskonto_haupt", e.target.value)}
                  className={inputClass}
                  suggestions={fieldSuggestions.buchungskonto_haupt}
                  title="Vorschläge aus gespeicherten Kunden"
                />
              </div>
            </div>
          )}

          {tab === "waschanlage" && (
            <div className="space-y-5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-cyan-200/80 bg-cyan-50/50 p-4 text-sm text-slate-800 shadow-sm">
                <input
                  type="checkbox"
                  checked={form.includeWashProfile}
                  onChange={(e) => set("includeWashProfile", e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-cyan-600"
                />
                <span>
                  <span className="font-semibold text-cyan-900">Waschprofil anlegen</span>
                  <span className="mt-1 block text-xs font-normal text-slate-600">
                    Speichert zusätzliche Waschanlagen-Daten für diesen Kunden. Unter Waschanlage
                    standardmäßig aktiv.
                  </span>
                </span>
              </label>

              {!form.includeWashProfile ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Aktivieren Sie „Waschprofil anlegen“, um BUKto, Limit, Bank und Wasch-Infos zu
                  speichern.
                </p>
              ) : (
                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,1.15fr)_minmax(0,1fr)]">
                  <div className="space-y-6 xl:col-span-1">
                    {/* ── Bank & Zahlung ────────────────────────────── */}
                    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                        Bank &amp; Zahlung
                      </p>
                      <div>
                        <label className={labelClass}>Bankname</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_bankname}
                          onChange={(e) => set("wash_bankname", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.wash_bankname}
                          title="Vorschläge aus Waschprofilen"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelClass}>BIC</label>
                          <SuggestTextInput
                            type="text"
                            value={form.wash_bic}
                            onChange={(e) => set("wash_bic", e.target.value)}
                            className={inputClass}
                            suggestions={fieldSuggestions.wash_bic}
                            title="Vorschläge aus Waschprofilen"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>IBAN</label>
                          <SuggestTextInput
                            type="text"
                            value={form.wash_iban}
                            onChange={(e) => set("wash_iban", e.target.value)}
                            className={inputClass}
                            suggestions={fieldSuggestions.wash_iban}
                            title="Vorschläge aus Waschprofilen"
                          />
                        </div>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.wash_lastschrift}
                          onChange={(e) => set("wash_lastschrift", e.target.checked)}
                          className="rounded border-slate-300 text-cyan-600"
                        />
                        Lastschrift
                      </label>
                    </div>

                    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                      Konto
                    </p>
                    <div>
                      <label className={labelClass}>BUKto</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_bukto}
                        onChange={(e) => set("wash_bukto", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_bukto}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Limit (€)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.wash_limit}
                        onChange={(e) => set("wash_limit", e.target.value)}
                        className={inputClass}
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        Limit ist nur dann aktiv, wenn Betrag &gt; 0 ist.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.wash_kunde_gesperrt}
                        onChange={(e) => set("wash_kunde_gesperrt", e.target.checked)}
                        className="rounded border-slate-300 text-cyan-600"
                      />
                      Kunde gesperrt
                    </label>
                    </div>
                  </div>

                  <div className="space-y-6 xl:col-span-1">
                    <div className="rounded-xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                            Preisliste Referenz
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            Offizielle DEMA Preisliste Waschstrasse (PDF) fuer schnelle Rueckfragen.
                          </p>
                        </div>
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                      </div>
                      <a
                        href={WASH_PRICE_LIST_PDF_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-white px-3 py-2 text-sm font-semibold text-cyan-900 transition hover:border-cyan-400 hover:bg-cyan-50"
                      >
                        Preisliste als PDF oeffnen
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    {/* ── Fuhrpark / Kennzeichen ────────────────────── */}
                    <div className="space-y-3 self-start rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-cyan-600" />
                      <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                        Fuhrpark / Kennzeichen
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
                        placeholder="NEU: z. B. LU-XX-123"
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
                              title="Entfernen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {form.wash_kennzeichen_list.length === 0 && (
                      <p className="py-2 text-center text-xs text-slate-400">
                        Noch keine Kennzeichen hinzugefuegt.
                      </p>
                    )}
                    </div>

                  </div>

                  <div className="space-y-6 xl:col-span-1">
                    {/* ── Wasch-Infos ───────────────────────────────── */}
                    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                      Wasch-Infos
                    </p>
                    <div>
                      <label className={labelClass}>Waschprogramm</label>
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
                        <label className={labelClass}>Netto preis</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.wash_netto_preis}
                          onChange={(e) => set("wash_netto_preis", e.target.value)}
                          placeholder="z. B. 29,90"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Brutto preis</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.wash_brutto_preis}
                          onChange={(e) => set("wash_brutto_preis", e.target.value)}
                          placeholder="z. B. 35,58"
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Intervall / Rhythmus</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wasch_intervall}
                        onChange={(e) => set("wasch_intervall", e.target.value)}
                        placeholder="z. B. wöchentlich"
                        className={inputClass}
                        suggestions={fieldSuggestions.wasch_intervall}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Wichtige Infos</label>
                      <textarea
                        value={form.wash_wichtige_infos}
                        onChange={(e) => set("wash_wichtige_infos", e.target.value)}
                        rows={2}
                        className={`${inputClass} min-h-[64px] resize-y py-2`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Bemerkungen (Waschanlage)</label>
                      <textarea
                        value={form.wash_bemerkungen}
                        onChange={(e) => set("wash_bemerkungen", e.target.value)}
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
          {tab === "additional" && hasAdditionalTab ? (
            <div className="space-y-4">{additionalTabContent}</div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">
                Zuständige Person
              </label>
              <select
                value={form.zustaendige_person_name}
                onChange={(e) => set("zustaendige_person_name", e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {ZUSTAENDIGE_OPTIONS.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
              >
                {isEditMode ? "Änderungen speichern" : "Speichern"}
              </button>
            </div>
          </div>
        </div>

        {showAttachPrompt && scannedAttachment ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/45 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
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
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
}
