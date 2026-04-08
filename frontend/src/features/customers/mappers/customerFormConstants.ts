/** EU member state codes (excluding DE which maps to IL). GR and EL both included (ISO vs. VIES). */
export const EU_LAND_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "CY",
  "CZ",
  "DK",
  "EE",
  "EL",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "HU",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
  "XI",
]);

export function landCodeToArtLand(landCode: string): string {
  if (landCode === "DE") return "IL";
  if (EU_LAND_CODES.has(landCode)) return "EU";
  return "Drittland";
}

export const COUNTRY_CODES: { code: string; label: string }[] = [
  { code: "+49", label: "🇩🇪 +49" },
  { code: "+43", label: "🇦🇹 +43" },
  { code: "+41", label: "🇨🇭 +41" },
  { code: "+31", label: "🇳🇱 +31" },
  { code: "+48", label: "🇵🇱 +48" },
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+39", label: "🇮🇹 +39" },
  { code: "+34", label: "🇪🇸 +34" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+90", label: "🇹🇷 +90" },
  { code: "+7", label: "🇷🇺 +7" },
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
  { code: "+86", label: "🇨🇳 +86" },
  { code: "+81", label: "🇯🇵 +81" },
  { code: "+91", label: "🇮🇳 +91" },
];

export const ADRESSE_TYPEN = ["Hauptadresse", "Lieferadresse", "Filiale", "Alte Hauptadresse", "Sonstiges"];

export const ADRESSE_TYP_I18N: Record<string, [string, string]> = {
  Hauptadresse: ["adresseTypHaupt", "Main address"],
  Lieferadresse: ["adresseTypLieferung", "Delivery address"],
  Filiale: ["adresseTypFiliale", "Branch"],
  "Alte Hauptadresse": ["adresseTypAltHaupt", "Old main address"],
  Sonstiges: ["adresseTypSonstiges", "Other"],
};

export const ADRESSE_COLORS: { dot: string; dotActive: string; activePill: string }[] = [
  { dot: "bg-indigo-300", dotActive: "bg-indigo-500", activePill: "bg-indigo-500" },
  { dot: "bg-teal-300", dotActive: "bg-teal-500", activePill: "bg-teal-500" },
  { dot: "bg-violet-300", dotActive: "bg-violet-500", activePill: "bg-violet-500" },
  { dot: "bg-amber-300", dotActive: "bg-amber-500", activePill: "bg-amber-500" },
  { dot: "bg-rose-300", dotActive: "bg-rose-500", activePill: "bg-rose-500" },
  { dot: "bg-cyan-300", dotActive: "bg-cyan-500", activePill: "bg-cyan-500" },
  { dot: "bg-slate-400", dotActive: "bg-slate-600", activePill: "bg-slate-600" },
];
