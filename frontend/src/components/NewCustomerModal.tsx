import { useEffect, useState, useCallback, type ReactNode } from "react";
import { X, Droplets, BadgeCheck, Plus, Trash2 } from "lucide-react";
import {
  DocExtractBanner,
  KiBadge,
  ExtractedFieldWrapper,
  type ScanState,
} from "./DocExtractBanner";
import type { NewKundeInput, KundenWashUpsertFields } from "../store/kundenStore";
import type { CustomerFieldSuggestions } from "../store/customerFieldSuggestions";
import { SuggestTextInput } from "./SuggestTextInput";
import type { DepartmentArea } from "../types/departmentArea";

type TabId = "vat" | "kunde" | "art" | "waschanlage";

type KontaktEntry = {
  id: string;
  rolle: string;
  name: string;
  telefon: string;
  fax: string;
  email: string;
  bemerkung: string;
  faxen: boolean;
};

const KONTAKT_ROLLEN = [
  "Ansprechpartner",
  "Geschäftsführer",
  "Einkauf",
  "Verkauf",
  "Buchhaltung",
  "Techniker",
  "Lager",
  "Disposition",
  "Sonstiges",
];

function emptyKontakt(): KontaktEntry {
  return {
    id: Math.random().toString(36).slice(2),
    rolle: "Ansprechpartner",
    name: "",
    telefon: "",
    fax: "",
    email: "",
    bemerkung: "",
    faxen: false,
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

const FAHRZEUG_TYPEN = ["", "PKW", "LKW", "Transporter", "Bus", "Sonstiges"];

const ROLLE_COLORS: Record<string, { from: string; to: string; badge: string; dot: string; dotActive: string }> = {
  Ansprechpartner: { from: "from-blue-500",    to: "to-indigo-500",  badge: "bg-blue-100 text-blue-700",       dot: "bg-blue-300",    dotActive: "bg-blue-500"    },
  Geschäftsführer: { from: "from-slate-700",   to: "to-slate-900",   badge: "bg-slate-200 text-slate-700",     dot: "bg-slate-400",   dotActive: "bg-slate-700"   },
  Einkauf:         { from: "from-pink-500",    to: "to-rose-500",    badge: "bg-pink-100 text-pink-700",       dot: "bg-pink-300",    dotActive: "bg-pink-500"    },
  Verkauf:         { from: "from-emerald-500", to: "to-teal-500",    badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-300", dotActive: "bg-emerald-500" },
  Buchhaltung:     { from: "from-violet-500",  to: "to-purple-500",  badge: "bg-violet-100 text-violet-700",   dot: "bg-violet-300",  dotActive: "bg-violet-500"  },
  Techniker:       { from: "from-orange-500",  to: "to-amber-500",   badge: "bg-orange-100 text-orange-700",   dot: "bg-orange-300",  dotActive: "bg-orange-500"  },
  Lager:           { from: "from-cyan-500",    to: "to-sky-500",     badge: "bg-cyan-100 text-cyan-700",       dot: "bg-cyan-300",    dotActive: "bg-cyan-500"    },
  Disposition:     { from: "from-sky-500",     to: "to-indigo-500",  badge: "bg-sky-100 text-sky-700",         dot: "bg-sky-300",     dotActive: "bg-sky-500"     },
  Sonstiges:       { from: "from-stone-400",   to: "to-stone-600",   badge: "bg-stone-100 text-stone-600",     dot: "bg-stone-300",   dotActive: "bg-stone-500"   },
};
const ROLLE_COLORS_DEFAULT = { from: "from-blue-500", to: "to-indigo-600", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-300", dotActive: "bg-blue-600" };

const WASCH_PROGRAMME = [
  "",
  "Standard",
  "Premium",
  "Unterboden",
  "Komplett",
  "Lkw-Wäsche",
  "Nach Vereinbarung",
];

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  if (!t || t === "—") return undefined;
  return t;
}

function initialForm() {
  return {
    branche: "",
    fzgHandel: "" as "" | "ja" | "nein",
    juristische_person: false,
    natuerliche_person: false,
    gesellschaftsform: "",
    ansprache: "",
    firmenvorsatz: "",
    firmenname: "",
    bemerkungen: "",
    zustaendige_person_name: "nicht zugeordnet",
    strasse: "",
    plz: "",
    ort: "",
    land_code: "DE",
    art_land_code: "IL",
    ust_id_nr: "",
    steuer_nr: "",
    branchen_nr: "",
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
    wash_kennzeichen: "",
    wasch_fahrzeug_typ: "",
    wasch_programm: "",
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

function formToPayload(form: FormState): NewKundeInput {
  const fzg_haendler =
    form.fzgHandel === "ja" ? true : form.fzgHandel === "nein" ? false : undefined;
  const z = form.zustaendige_person_name.trim();
  const zustaendige_person_name =
    z && z !== "nicht zugeordnet" ? z : undefined;

  return {
    firmenname: form.firmenname.trim(),
    branche: emptyToUndef(form.branche),
    fzg_haendler,
    juristische_person: form.juristische_person,
    natuerliche_person: form.natuerliche_person,
    gesellschaftsform: emptyToUndef(form.gesellschaftsform),
    ansprache: emptyToUndef(form.ansprache),
    firmenvorsatz: emptyToUndef(form.firmenvorsatz),
    bemerkungen: emptyToUndef(form.bemerkungen),
    zustaendige_person_name,
    strasse: emptyToUndef(form.strasse),
    plz: emptyToUndef(form.plz),
    ort: emptyToUndef(form.ort),
    land_code: form.land_code,
    art_land_code: emptyToUndef(form.art_land_code),
    ust_id_nr: emptyToUndef(form.ust_id_nr),
    steuer_nr: emptyToUndef(form.steuer_nr),
    branchen_nr: emptyToUndef(form.branchen_nr),
    ansprechpartner: emptyToUndef(form.kontakte[0]?.name ?? ""),
    telefonnummer: emptyToUndef(form.kontakte[0]?.telefon ?? ""),
    faxnummer: emptyToUndef(form.kontakte[0]?.fax ?? ""),
    email: emptyToUndef(form.kontakte[0]?.email ?? ""),
    internet_adr: emptyToUndef(form.internet_adr),
    bemerkungen_kontakt: emptyToUndef(form.kontakte[0]?.bemerkung ?? ""),
    faxen_flag: form.kontakte[0]?.faxen ?? false,
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
    kennzeichen: emptyToUndef(form.wash_kennzeichen),
    wasch_fahrzeug_typ: emptyToUndef(form.wasch_fahrzeug_typ),
    wasch_programm: emptyToUndef(form.wasch_programm),
    wasch_intervall: emptyToUndef(form.wasch_intervall),
  };
}

const tabLabels: Record<TabId, string> = {
  vat: "USt-IdNr. prüfen",
  kunde: "Kunde & Adresse",
  art: "Art / Buchungskonto",
  waschanlage: "Waschanlage",
};

const TAB_ORDER: TabId[] = ["vat", "kunde", "art", "waschanlage"];

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none ring-slate-200/50 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

type Props = {
  open: boolean;
  onClose: () => void;
  department?: DepartmentArea;
  /** Vorschau der nächsten automatischen KundenNr. (wird beim Speichern vergeben). */
  nextKundenNrPreview: string;
  /** Vorschläge aus bestehenden Kunden/Wash (<datalist>, kein Browser-Autofill). */
  fieldSuggestions: CustomerFieldSuggestions;
  /** `wash` gesetzt → nach createKunde wird upsertKundenWash aufgerufen (wie beim Bearbeiten). */
  onSubmit: (data: NewKundeInput, wash: KundenWashUpsertFields | null) => void;
};

export function NewCustomerModal({
  open,
  onClose,
  department,
  nextKundenNrPreview,
  fieldSuggestions,
  onSubmit,
}: Props) {
  const [tab, setTab] = useState<TabId>("vat");
  const [form, setForm] = useState<FormState>(initialForm);
  const [activeKontaktIdx, setActiveKontaktIdx] = useState(0);
  const [aufnahmePreview, setAufnahmePreview] = useState("");
  const [viesCountry, setViesCountry] = useState("DE");
  const [viesVatInput, setViesVatInput] = useState("");
  const [vatCheckLoading, setVatCheckLoading] = useState(false);
  const [vatCheckResult, setVatCheckResult] = useState<ViesCheckResult | null>(null);
  const [vatCheckError, setVatCheckError] = useState<string | null>(null);
  /** Full JSON string last returned by POST /api/v1/vat/check (always shown after a request). */
  const [vatBackendResponseJson, setVatBackendResponseJson] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        ...initialForm(),
        includeWashProfile: department === "waschanlage",
      });
      setTab("vat");
      setActiveKontaktIdx(0);
      setViesCountry("DE");
      setViesVatInput("");
      setVatCheckLoading(false);
      setVatCheckResult(null);
      setVatCheckError(null);
      setVatBackendResponseJson(null);
      setAufnahmePreview(
        new Date().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" })
      );
    }
  }, [open, department]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  // ── Document extraction state ──
  const [docScanState, setDocScanState] = useState<ScanState>("idle");
  const [docFileName, setDocFileName] = useState("");
  const [extractedFields, setExtractedFields] = useState<Set<string>>(new Set());

  /** Fields this mock extractor can fill — maps form keys to realistic demo values */
  const MOCK_EXTRACTED: Partial<Record<keyof FormState, FormState[keyof FormState]>> = {
    firmenname:      "Muster Automobil GmbH",
    gesellschaftsform: "GmbH",
    branche:         "Automobilhandel",
    firmenvorsatz:   "Muster",
    ansprache:       "Sehr geehrte Damen und Herren",
    strasse:         "Hauptstraße 42",
    plz:             "44137",
    ort:             "Dortmund",
    land_code:       "DE",
    internet_adr:    "www.muster-auto.de",
  };

  const handleDocUpload = (file: File) => {
    setDocFileName(file.name);
    setDocScanState("scanning");
    setExtractedFields(new Set());

    // Simulate OCR processing delay (2.5 s)
    setTimeout(() => {
      const filled = new Set<string>();
      for (const [key, value] of Object.entries(MOCK_EXTRACTED) as [keyof FormState, FormState[keyof FormState]][]) {
        // Only fill if field is currently empty
        if (!form[key]) {
          set(key, value);
          filled.add(key as string);
        }
      }
      setExtractedFields(filled);
      setDocScanState("done");
    }, 2500);
  };

  const clearDocExtraction = () => {
    // Reset extracted fields to empty
    for (const key of extractedFields) {
      set(key as keyof FormState, "" as FormState[keyof FormState]);
    }
    setExtractedFields(new Set());
    setDocScanState("idle");
    setDocFileName("");
  };

  const isExtracted = (key: string) => extractedFields.has(key);

  const formatVatCheckDetail = (raw: unknown): string => {
    if (typeof raw === "string" && raw.trim()) return raw.trim();
    if (Array.isArray(raw)) {
      return raw
        .map((e) => {
          if (e && typeof e === "object" && "msg" in e) return String((e as { msg: string }).msg);
          if (e && typeof e === "object" && "message" in e)
            return String((e as { message: string }).message);
          return JSON.stringify(e);
        })
        .join("; ");
    }
    // Handle proxy / gateway error shapes that don't use FastAPI's {"detail": ...} format.
    if (raw && typeof raw === "object") {
      const obj = raw as Record<string, unknown>;
      const candidate =
        obj["detail"] ?? obj["error"] ?? obj["message"] ?? obj["error_description"];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      if (typeof candidate === "number") return String(candidate);
    }
    return "Prüfung fehlgeschlagen — keine Detail-Antwort vom Server (möglicherweise Proxy-Timeout oder CORS-Problem).";
  };

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
    setVatBackendResponseJson(null);
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
        setVatBackendResponseJson(JSON.stringify(corsHint, null, 2));
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

      let displayJson: unknown;
      if (parseError) {
        displayJson = {
          _httpStatus: res.status,
          _httpStatusText: res.statusText || "(kein Statustext)",
          _parseError: parseError,
          _rawText: textBody.slice(0, 4000),
        };
      } else if (parsedBody !== null && typeof parsedBody === "object") {
        displayJson = parsedBody;
      } else if (parsedBody !== null) {
        displayJson = parsedBody;
      } else {
        // Empty body.
        displayJson = {
          _httpStatus: res.status,
          _httpStatusText: res.statusText || "(kein Statustext)",
          _body: "(leer)",
        };
      }
      try {
        setVatBackendResponseJson(JSON.stringify(displayJson, null, 2));
      } catch {
        setVatBackendResponseJson(String(displayJson));
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
    } catch {
      setVatCheckError(
        API_BASE
          ? "Netzwerkfehler. Das Backend ist nicht erreichbar — CORS-Block oder Backend nicht gestartet?"
          : "Netzwerkfehler. Lokal: Läuft das Python-Backend (Port 8000)? Cloud: VITE_API_BASE_URL als Build-Variable setzen und Frontend neu bauen."
      );
      setVatBackendResponseJson(
        JSON.stringify(
          {
            error: "fetch failed — keine Antwort vom Server",
            hint: API_BASE
              ? "Backend prüfen: CORS_ORIGINS muss die Frontend-Domain enthalten"
              : "VITE_API_BASE_URL ist leer — in Cloud-Build-Einstellungen auf Backend-URL setzen, z. B. https://dema-backend.onrender.com",
            apiBase: API_BASE || "(leer — VITE_API_BASE_URL nicht gesetzt)",
          },
          null,
          2
        )
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
    const derivedLandCode = viesLandToFormLand(cc);
    setForm((f) => ({
      ...f,
      ust_id_nr: ust,
      land_code: derivedLandCode,
      art_land_code: landCodeToArtLand(derivedLandCode),
      ...(nm ? { firmenname: nm } : {}),
      ...(addr.strasse ? { strasse: addr.strasse } : {}),
      ...(addr.plz ? { plz: addr.plz } : {}),
      ...(addr.ort ? { ort: addr.ort } : {}),
    }));
    setTab("kunde");
  };

  const handleSave = () => {
    if (!form.firmenname.trim()) {
      alert("Bitte geben Sie einen Firmennamen ein.");
      setTab("kunde");
      return;
    }
    const wash = form.includeWashProfile ? washFormToPayload(form) : null;
    onSubmit(formToPayload(form), wash);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px] sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex w-full max-w-7xl max-h-[88vh] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
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
                (Neu)
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              DEMA Management · <code className="rounded bg-black/20 px-1">kunden</code>
              {", optional "}
              <code className="rounded bg-black/20 px-1">kunden_wash</code> (Tab Waschanlage)
            </p>
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
          {TAB_ORDER.map((id) => (
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
              {tabLabels[id]}
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
                {vatBackendResponseJson ? (
                  <div className="mt-4 rounded-xl border-2 border-blue-200 bg-white p-3 shadow-sm ring-1 ring-blue-100">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-900">
                      Server-Antwort (komplettes JSON vom Backend)
                    </p>
                    <p className="mb-2 text-[11px] leading-snug text-slate-600">
                      Feld <code className="rounded bg-slate-100 px-1">vies_raw</code> enthält die VoW-Rohantwort,
                      sofern das Backend sie mitsendet.
                    </p>
                    <pre
                      className="max-h-[min(50vh,28rem)] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-left font-mono text-[11px] leading-relaxed text-amber-100"
                      tabIndex={0}
                    >
                      {vatBackendResponseJson}
                    </pre>
                  </div>
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
              <p className="text-xs text-slate-500">
                Hinweis: VIES kann auslastungsbedingt kurzzeitig antworten — ggf. später erneut
                versuchen.                 Geprüfte Daten können Sie im Tab <strong>Kunde &amp; Adresse</strong> anpassen.
              </p>
            </div>
          )}

          {tab === "kunde" && (
            <div className="flex flex-col gap-3">

              {/* ── Document extraction banner ── */}
              <DocExtractBanner
                scanState={docScanState}
                fileName={docFileName}
                extractedCount={extractedFields.size}
                onFileSelect={handleDocUpload}
                onClear={clearDocExtraction}
              />

              {/* ── 3-column grid: Firmendaten | Adresse & Steuer | Kontakt ── */}
              <div className="grid grid-cols-3 gap-4">

                {/* ── Col 1: Firmendaten ── */}
                <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Firmendaten</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>KundenNr.</label>
                      <div
                        className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-semibold text-slate-800"
                        title="Wird beim Speichern vergeben"
                      >
                        {nextKundenNrPreview}
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

                  <div className="grid grid-cols-2 gap-3">
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
                    <div>
                      <label className={labelClass}>Ansprache{isExtracted("ansprache") && <KiBadge />}</label>
                      <ExtractedFieldWrapper extracted={isExtracted("ansprache")}>
                        <SuggestTextInput
                          type="text"
                          value={form.ansprache}
                          onChange={(e) => set("ansprache", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.ansprache}
                          title="Vorschläge aus gespeicherten Kunden"
                        />
                      </ExtractedFieldWrapper>
                    </div>
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
                    <label className={labelClass}>Zuständige Person</label>
                    <select
                      value={form.zustaendige_person_name}
                      onChange={(e) => set("zustaendige_person_name", e.target.value)}
                      className={inputClass}
                    >
                      {ZUSTAENDIGE_OPTIONS.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Bemerkungen</label>
                    <textarea
                      value={form.bemerkungen}
                      onChange={(e) => set("bemerkungen", e.target.value)}
                      rows={2}
                      className={`${inputClass} resize-none py-2`}
                    />
                  </div>
                </div>

                {/* ── Col 2: Adresse & Steuer ── */}
                <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Adresse &amp; Steuer</p>

                  <div>
                    <label className={labelClass}>Strasse{isExtracted("strasse") && <KiBadge />}</label>
                    <ExtractedFieldWrapper extracted={isExtracted("strasse")}>
                      <SuggestTextInput
                        type="text"
                        value={form.strasse}
                        onChange={(e) => set("strasse", e.target.value)}
                        placeholder="nicht bekannt"
                        className={inputClass}
                        suggestions={fieldSuggestions.strasse}
                        title="Vorschläge aus gespeicherten Kunden"
                      />
                    </ExtractedFieldWrapper>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>PLZ{isExtracted("plz") && <KiBadge />}</label>
                      <ExtractedFieldWrapper extracted={isExtracted("plz")}>
                        <SuggestTextInput
                          type="text"
                          value={form.plz}
                          onChange={(e) => set("plz", e.target.value)}
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
                          value={form.ort}
                          onChange={(e) => set("ort", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.ort}
                          title="Vorschläge aus gespeicherten Kunden"
                        />
                      </ExtractedFieldWrapper>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Land</label>
                      <select
                        value={form.land_code}
                        onChange={(e) => {
                          const code = e.target.value;
                          setForm((f) => ({
                            ...f,
                            land_code: code,
                            art_land_code: landCodeToArtLand(code),
                          }));
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
                        value={form.art_land_code}
                        onChange={(e) => set("art_land_code", e.target.value)}
                        className={inputClass}
                      >
                        {ART_LAND_OPTIONS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>UST-ID-Nr.</label>
                    <SuggestTextInput
                      type="text"
                      value={form.ust_id_nr}
                      onChange={(e) => set("ust_id_nr", e.target.value)}
                      className={inputClass}
                      suggestions={fieldSuggestions.ust_id_nr}
                      title="Vorschläge aus gespeicherten Kunden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Steuer-Nr.</label>
                      <SuggestTextInput
                        type="text"
                        value={form.steuer_nr}
                        onChange={(e) => set("steuer_nr", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.steuer_nr}
                        title="Vorschläge aus gespeicherten Kunden"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Branchen-Nr.</label>
                      <SuggestTextInput
                        type="text"
                        value={form.branchen_nr}
                        onChange={(e) => set("branchen_nr", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.branchen_nr}
                        title="Vorschläge aus gespeicherten Kunden"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Col 3: Kontakt ── */}
                {(() => {
                  const k = form.kontakte[activeKontaktIdx] ?? form.kontakte[0]!;
                  const safeIdx = Math.min(activeKontaktIdx, form.kontakte.length - 1);
                  const col = ROLLE_COLORS[k.rolle] ?? ROLLE_COLORS_DEFAULT;
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
                          const dc = ROLLE_COLORS[c.rolle] ?? ROLLE_COLORS_DEFAULT;
                          const isActive = i === safeIdx;
                          const label = c.name || c.rolle;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setActiveKontaktIdx(i)}
                              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                                isActive
                                  ? `${dc.dotActive} text-white shadow-sm`
                                  : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white/60" : dc.dotActive}`} />
                              {label}
                            </button>
                          );
                        })}
                      </div>

                      {/* ── Active card ── */}
                      <div className="overflow-hidden rounded-2xl border border-slate-200/60 shadow-md">
                        {/* Gradient header */}
                        <div className={`bg-gradient-to-br ${col.from} ${col.to} px-4 pt-4 pb-5`}>
                          <div className="flex items-start justify-between">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-sm font-bold text-white ring-2 ring-white/40">
                              {initials}
                            </div>
                            {form.kontakte.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setForm((f) => ({ ...f, kontakte: f.kontakte.filter((_, i) => i !== safeIdx) }));
                                  setActiveKontaktIdx(Math.max(0, safeIdx - 1));
                                }}
                                className="rounded-lg p-1 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                                title="Kontakt entfernen"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="mt-2 truncate text-sm font-semibold text-white">
                            {k.name || "— Kein Name —"}
                          </p>
                          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${col.badge}`}>
                            {k.rolle}
                          </span>
                        </div>

                        {/* Card body */}
                        <div className="space-y-2.5 bg-white p-3">
                          <div>
                            <label className={labelClass}>Rolle</label>
                            <select
                              value={k.rolle}
                              onChange={(e) => {
                                const rolle = e.target.value;
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx ? { ...c, rolle, name: "", telefon: "", email: "" } : c
                                  ),
                                }));
                              }}
                              className={inputClass}
                            >
                              {KONTAKT_ROLLEN.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>

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

                          <div>
                            <label className={labelClass}>Telefon</label>
                            <input
                              type="text"
                              value={k.telefon}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  kontakte: f.kontakte.map((c, i) =>
                                    i === safeIdx ? { ...c, telefon: e.target.value } : c
                                  ),
                                }))
                              }
                              className={inputClass}
                              placeholder="+49 …"
                            />
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
                              rows={2}
                              className={`${inputClass} resize-none py-2`}
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}
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
              <p className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600">
                Waschdaten (<code className="text-[10px]">kunden_wash</code>) erfassen Sie im Tab{" "}
                <strong>Waschanlage</strong> — gleiches Modell wie beim Bearbeiten eines Kunden.
              </p>
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
                    Speichert Zusatzdaten in <code className="text-[10px]">kunden_wash</code> (1:1 zur
                    Kunden-ID). Unter Waschanlage standardmäßig aktiv.
                  </span>
                </span>
              </label>

              {!form.includeWashProfile ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Aktivieren Sie „Waschprofil anlegen“, um BUKto, Limit, Rechnungsadresse, Bank und
                  Wasch-Infos zu speichern.
                </p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                      Konto &amp; Rechnung
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
                    <p className="border-t border-slate-100 pt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Rechnungsadresse
                    </p>
                    <div>
                      <label className={labelClass}>Rechnung-Zusatz</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_rechnung_zusatz}
                        onChange={(e) => set("wash_rechnung_zusatz", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_rechnung_zusatz}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelClass}>PLZ</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_rechnung_plz}
                          onChange={(e) => set("wash_rechnung_plz", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.wash_rechnung_plz}
                          title="Vorschläge aus Waschprofilen"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={labelClass}>Ort</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_rechnung_ort}
                          onChange={(e) => set("wash_rechnung_ort", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.wash_rechnung_ort}
                          title="Vorschläge aus Waschprofilen"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Strasse</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_rechnung_strasse}
                        onChange={(e) => set("wash_rechnung_strasse", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_rechnung_strasse}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                      Bank &amp; Wasch-Infos
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
                    <div>
                      <label className={labelClass}>Kennzeichen</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_kennzeichen}
                        onChange={(e) => set("wash_kennzeichen", e.target.value)}
                        placeholder="z. B. HH-AB 1234"
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_kennzeichen}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fahrzeugtyp</label>
                      <select
                        value={form.wasch_fahrzeug_typ}
                        onChange={(e) => set("wasch_fahrzeug_typ", e.target.value)}
                        className={inputClass}
                      >
                        {FAHRZEUG_TYPEN.map((v) => (
                          <option key={v || "—"} value={v}>
                            {v || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Waschprogramm / Tarif</label>
                      <select
                        value={form.wasch_programm}
                        onChange={(e) => set("wasch_programm", e.target.value)}
                        className={inputClass}
                      >
                        {WASCH_PROGRAMME.map((v) => (
                          <option key={v || "—"} value={v}>
                            {v || "—"}
                          </option>
                        ))}
                      </select>
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex justify-end gap-2">
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
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
