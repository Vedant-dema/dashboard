import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Search, MapPin, Globe, Loader2, X } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export type GlobalAddressResult = {
  label: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  land_code?: string;
  land_name?: string;
};

type PhotonFeature = {
  properties: {
    name?: string;
    street?: string;
    housenumber?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    district?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
};

type PhotonResponse = {
  features: PhotonFeature[];
};

function parsePhoton(features: PhotonFeature[]): GlobalAddressResult[] {
  return features
    .map((f) => {
      const p = f.properties;
      const street = [p.street, p.housenumber].filter(Boolean).join(" ");
      const city = p.city ?? p.town ?? p.village ?? p.municipality ?? p.district ?? p.state ?? "";
      const postcode = p.postcode ?? "";
      const countrycode = (p.countrycode ?? "").toUpperCase();
      const country = p.country ?? "";

      const parts: string[] = [];
      if (p.name && p.name !== p.street) parts.push(p.name);
      if (street) parts.push(street);
      if (postcode) parts.push(postcode);
      if (city) parts.push(city);
      if (country) parts.push(country);

      return {
        label: parts.join(", "),
        strasse: street || undefined,
        plz: postcode || undefined,
        ort: city || undefined,
        land_code: countrycode || undefined,
        land_name: country || undefined,
      };
    })
    .filter((r) => r.label.trim().length > 0);
}

const COUNTRY_FLAGS: Record<string, string> = {
  DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭", NL: "🇳🇱", PL: "🇵🇱", FR: "🇫🇷",
  IT: "🇮🇹", ES: "🇪🇸", PT: "🇵🇹", GB: "🇬🇧", US: "🇺🇸", TR: "🇹🇷",
  RU: "🇷🇺", CZ: "🇨🇿", SK: "🇸🇰", HU: "🇭🇺", RO: "🇷🇴", HR: "🇭🇷",
  SI: "🇸🇮", RS: "🇷🇸", BA: "🇧🇦", MK: "🇲🇰", BG: "🇧🇬", GR: "🇬🇷",
  BE: "🇧🇪", LU: "🇱🇺", DK: "🇩🇰", SE: "🇸🇪", NO: "🇳🇴", FI: "🇫🇮",
  IE: "🇮🇪", LT: "🇱🇹", LV: "🇱🇻", EE: "🇪🇪", UA: "🇺🇦", CN: "🇨🇳",
  JP: "🇯🇵", IN: "🇮🇳", AU: "🇦🇺", CA: "🇨🇦", BR: "🇧🇷", AR: "🇦🇷",
};

function flag(code?: string): string {
  return code ? (COUNTRY_FLAGS[code] ?? "🌍") : "🌍";
}

type Props = {
  onSelect: (result: GlobalAddressResult) => void;
  className?: string;
};

export function GlobalAddressSearch({ onSelect, className }: Props) {
  const { t, language } = useLanguage();
  const uid = useId().replace(/:/g, "");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalAddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const langParam =
    language === "de" ? "de"
    : language === "fr" ? "fr"
    : language === "it" ? "it"
    : language === "ru" ? "ru"
    : "en";

  const fetchAddresses = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&lang=${langParam}`;
        const res = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as PhotonResponse;
        const parsed = parsePhoton(data.features ?? []);
        setResults(parsed);
        setOpen(parsed.length > 0);
        setActiveIdx(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
          setOpen(false);
        }
      } finally {
        setLoading(false);
      }
    },
    [langParam]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (val.trim().length < 2) {
        setResults([]);
        setOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(() => fetchAddresses(val), 400);
    },
    [fetchAddresses]
  );

  const handleSelect = useCallback(
    (result: GlobalAddressResult) => {
      onSelect(result);
      setQuery("");
      setOpen(false);
      setResults([]);
      setActiveIdx(-1);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIdx(-1);
    abortRef.current?.abort();
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || results.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && activeIdx >= 0) {
        e.preventDefault();
        handleSelect(results[activeIdx]);
      } else if (e.key === "Escape") {
        setOpen(false);
        setActiveIdx(-1);
      }
    },
    [open, results, activeIdx, handleSelect]
  );

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const listboxId = `global-addr-${uid}`;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
          ) : (
            <Globe className="h-4 w-4 text-teal-500" />
          )}
        </div>
        <input
          ref={inputRef}
          id={uid}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          className={`${className ?? ""} pl-9 pr-8`}
          placeholder={t("globalAddrSearchPlaceholder", "Search address worldwide…")}
          autoComplete="nope"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && results.length > 0}
          aria-controls={open && results.length > 0 ? listboxId : undefined}
          aria-activedescendant={activeIdx >= 0 ? `${listboxId}-${activeIdx}` : undefined}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-2 flex items-center px-1 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
            aria-label={t("commonClear", "Clear")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={t("globalAddrListLabel", "Address suggestions")}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-teal-200/80 bg-white py-1 shadow-2xl shadow-teal-900/12 ring-1 ring-teal-100/60"
        >
          <li className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Search className="h-3 w-3" />
            {t("globalAddrHint", "Select to fill PLZ, Ort and Land")}
          </li>
          {results.map((r, i) => {
            const isActive = i === activeIdx;
            const addrParts = [r.strasse, [r.plz, r.ort].filter(Boolean).join(" ")].filter(Boolean);
            const primaryLine = addrParts[0] ?? r.label;
            const secondaryLine = addrParts.length > 1 ? addrParts.slice(1).join(" · ") : undefined;
            return (
              <li
                key={`${r.label}-${i}`}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(r);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors ${
                  isActive ? "bg-teal-50" : "hover:bg-slate-50"
                }`}
              >
                <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden>
                  {flag(r.land_code)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${isActive ? "text-teal-900" : "text-slate-800"}`}>
                    {primaryLine}
                  </p>
                  {secondaryLine && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {secondaryLine}
                    </p>
                  )}
                </div>
                {r.land_name && (
                  <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {r.land_code ?? r.land_name}
                  </span>
                )}
              </li>
            );
          })}
          <li className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
            {t("globalAddrPowered", "Powered by OpenStreetMap · Photon")}
          </li>
        </ul>
      )}

      {open && query.trim().length >= 2 && !loading && results.length === 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
          {t("globalAddrNoResults", "No addresses found. Try a different search term.")}
        </div>
      )}
    </div>
  );
}
