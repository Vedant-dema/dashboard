import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useId,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Search, MapPin, Globe, Loader2, X, AlertCircle } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { buildGeocodeSearchUrl } from "../services/geocodeApi";

export type GlobalAddressResult = {
  label: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  land_code?: string;
  land_name?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  name?: string;
  address?: {
    road?: string;
    pedestrian?: string;
    path?: string;
    footway?: string;
    house_number?: string;
    postcode?: string;
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

function parseNominatim(items: NominatimResult[]): GlobalAddressResult[] {
  return items
    .map((r) => {
      const a = r.address;
      if (!a) {
        return {
          label: r.display_name,
          strasse: undefined,
          plz: undefined,
          ort: undefined,
          land_code: undefined,
          land_name: undefined,
        };
      }
      const road = a.road ?? a.pedestrian ?? a.path ?? a.footway ?? "";
      const hn = (a.house_number ?? "").trim();
      const street =
        hn && road ? `${road} ${hn}`.trim()
        : road || hn || "";
      const city = a.city ?? a.town ?? a.village ?? a.hamlet ?? a.county ?? a.state ?? "";
      const postcode = a.postcode ?? "";
      const countryCode = (a.country_code ?? "").toUpperCase();
      return {
        label: r.display_name,
        strasse: street || undefined,
        plz: postcode || undefined,
        ort: city || undefined,
        land_code: countryCode || undefined,
        land_name: a.country || undefined,
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

const REQUEST_TIMEOUT_MS = 15000;

/** Above modal overlays (e.g. z-50) and stacking contexts. */
const DROPDOWN_Z = 2147483646;

const BASE_INPUT =
  "h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20";

type Props = {
  onSelect: (result: GlobalAddressResult) => void;
};

export function GlobalAddressSearch({ onSelect }: Props) {
  const { t, language } = useLanguage();
  const uid = useId().replace(/:/g, "");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalAddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  /** True when fetch failed before HTTP (backend down, wrong URL, CORS). */
  const [networkError, setNetworkError] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  const langParam =
    language === "de" ? "de"
    : language === "fr" ? "fr"
    : language === "it" ? "it"
    : language === "es" ? "es"
    : language === "ru" ? "ru"
    : "en";

  const applyDropdownGeometry = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: DROPDOWN_Z,
    });
  }, []);

  /** Before paint: anchor portal so the list is not rendered at the bottom of <body>. */
  useLayoutEffect(() => {
    if (!open) return;
    applyDropdownGeometry();
  }, [open, error, results.length, loading, applyDropdownGeometry]);

  /** Track scroll/resize to keep dropdown anchored. */
  useEffect(() => {
    if (!open) return;
    const h = () => applyDropdownGeometry();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => {
      window.removeEventListener("scroll", h, true);
      window.removeEventListener("resize", h);
    };
  }, [open, applyDropdownGeometry]);

  const fetchAddresses = useCallback(
    async (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      const seq = ++requestSeqRef.current;
      abortRef.current?.abort();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortRef.current = new AbortController();
      const { signal } = abortRef.current;

      timeoutRef.current = setTimeout(() => {
        abortRef.current?.abort();
      }, REQUEST_TIMEOUT_MS);

      setLoading(true);
      setError(false);
      setNetworkError(false);

      try {
        const url = buildGeocodeSearchUrl(q.trim(), langParam);
        const res = await fetch(url, {
          signal,
          headers: { Accept: "application/json" },
        });

        let payload: unknown;
        try {
          payload = await res.json();
        } catch {
          if (seq !== requestSeqRef.current) return;
          setNetworkError(false);
          setError(true);
          setResults([]);
          applyDropdownGeometry();
          setOpen(true);
          return;
        }

        if (seq !== requestSeqRef.current) return;

        if (!res.ok) {
          const d = payload as { detail?: string | string[] };
          const detail = d.detail;
          const msg =
            typeof detail === "string"
              ? detail
              : Array.isArray(detail)
                ? detail.join(", ")
                : `HTTP ${res.status}`;
          throw new Error(msg);
        }

        if (!Array.isArray(payload)) {
          throw new Error("Invalid geocode response");
        }

        const parsed = parseNominatim(payload as NominatimResult[]);
        applyDropdownGeometry();
        setResults(parsed);
        setOpen(true);
        setActiveIdx(-1);
        setError(false);
        setNetworkError(false);
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        const isAbort = (err as Error).name === "AbortError";
        const isNetwork = err instanceof TypeError;
        if (isAbort) {
          setNetworkError(false);
          setError(true);
          setResults([]);
          applyDropdownGeometry();
          setOpen(true);
          return;
        }
        setNetworkError(isNetwork);
        setError(true);
        setResults([]);
        applyDropdownGeometry();
        setOpen(true);
      } finally {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    [langParam, applyDropdownGeometry]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      setError(false);
      setNetworkError(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (val.trim().length < 2) {
        setResults([]);
        setOpen(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      debounceRef.current = setTimeout(() => fetchAddresses(val), 350);
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
      setError(false);
      setNetworkError(false);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setResults([]);
    setOpen(false);
    setActiveIdx(-1);
    setError(false);
    setNetworkError(false);
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

  /** Close on click outside the input + portal. */
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (inputRef.current?.contains(t)) return;
      const portal = document.getElementById(`portal-${uid}`);
      if (portal?.contains(t)) return;
      setOpen(false);
      setActiveIdx(-1);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [uid]);

  /** Scroll active item into view. */
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx + 1] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  /** Cleanup. */
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const listboxId = `global-addr-${uid}`;
  const showDropdown = open && (results.length > 0 || error || (!loading && query.trim().length >= 2));

  const dropdownContent = showDropdown ? (
    <div id={`portal-${uid}`} style={dropdownStyle}>
      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-white px-4 py-3 shadow-lg">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-700">
              {t("globalAddrConnError", "Address service unavailable")}
            </p>
            <p className="mt-0.5 text-[11px] text-red-500">
              {networkError
                ? t(
                    "globalAddrNetworkError",
                    "Cannot reach the API. Start the backend from the backend folder: uvicorn main:app --reload --port 8000"
                  )
                : t("globalAddrConnErrorHint", "Check your internet connection and try again.")}
            </p>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
          {t("globalAddrNoResults", "No addresses found. Try a different search term.")}
        </div>
      ) : (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={t("globalAddrListLabel", "Address suggestions")}
          className="max-h-72 overflow-y-auto rounded-xl border border-teal-200/80 bg-white py-1 shadow-2xl ring-1 ring-teal-100/60"
          style={{ boxShadow: "0 20px 60px rgba(13,148,136,0.15), 0 4px 16px rgba(0,0,0,0.08)" }}
        >
          <li className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Search className="h-3 w-3" />
            {t("globalAddrHint", "Select to fill PLZ, Ort and Land")}
          </li>
          {results.map((r, i) => {
            const isActive = i === activeIdx;
            const secondLine = [r.plz, r.ort].filter(Boolean).join(" ");
            const topLine = r.strasse ?? r.label;
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
                  <p
                    className={`truncate text-sm font-medium ${
                      isActive ? "text-teal-900" : "text-slate-800"
                    }`}
                  >
                    {topLine}
                  </p>
                  {secondLine && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {secondLine}
                      {r.land_name && (
                        <span className="ml-1 rounded bg-slate-100 px-1 py-px text-[10px] font-semibold text-slate-500">
                          {r.land_code ?? r.land_name}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
          <li className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
            {t("globalAddrPowered", "Powered by OpenStreetMap · Photon & Nominatim")}
          </li>
        </ul>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center">
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
            applyDropdownGeometry();
            if (results.length > 0 || error) setOpen(true);
          }}
          className={BASE_INPUT}
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
      {loading && query.trim().length >= 2 && (
        <p className="mt-1 text-[11px] text-teal-600">
          {t("globalAddrSearching", "Searching…")}
        </p>
      )}
      {typeof document !== "undefined" && createPortal(dropdownContent, document.body)}
    </>
  );
}
