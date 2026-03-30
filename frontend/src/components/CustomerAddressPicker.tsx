import { useState, useRef, useEffect, useCallback, useId } from "react";
import { Building2, MapPin, ChevronDown, X } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

export type AddressCandidate = {
  firmenname: string;
  strasse?: string;
  plz?: string;
  ort?: string;
  land_code?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (candidate: AddressCandidate) => void;
  candidates: readonly AddressCandidate[];
  className?: string;
  placeholder?: string;
  required?: boolean;
};

const MAX_ITEMS = 8;

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-teal-100 font-semibold text-teal-900 not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export function CustomerAddressPicker({
  value,
  onChange,
  onSelect,
  candidates,
  className,
  placeholder,
  required,
}: Props) {
  const { t } = useLanguage();
  const uid = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = value.trim().length > 0
    ? candidates
        .filter((c) => c.firmenname.toLowerCase().includes(value.trim().toLowerCase()))
        .slice(0, MAX_ITEMS)
    : [];

  const hasResults = filtered.length > 0;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setOpen(true);
      setActiveIdx(-1);
    },
    [onChange]
  );

  const handleSelect = useCallback(
    (candidate: AddressCandidate) => {
      onSelect(candidate);
      setOpen(false);
      setActiveIdx(-1);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    onChange("");
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || !hasResults) {
        if (e.key === "ArrowDown" && filtered.length === 0 && value.trim()) {
          setOpen(true);
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, -1));
      } else if (e.key === "Enter" && activeIdx >= 0) {
        e.preventDefault();
        handleSelect(filtered[activeIdx]);
      } else if (e.key === "Escape") {
        setOpen(false);
        setActiveIdx(-1);
      }
    },
    [open, hasResults, filtered, activeIdx, handleSelect, value]
  );

  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const listboxId = `addr-picker-list-${uid}`;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          id={uid}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value.trim()) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={className}
          placeholder={placeholder ?? t("addrPickerPlaceholder", "Company name…")}
          autoComplete="nope"
          required={required}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && hasResults}
          aria-controls={open && hasResults ? listboxId : undefined}
          aria-activedescendant={activeIdx >= 0 ? `${listboxId}-${activeIdx}` : undefined}
        />
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center gap-0.5">
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto rounded p-0.5 text-slate-400 hover:text-slate-600"
              tabIndex={-1}
              aria-label={t("commonClear", "Clear")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {open && hasResults && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={t("addrPickerListLabel", "Customer suggestions")}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-teal-200/80 bg-white py-1 shadow-xl shadow-teal-900/10 ring-1 ring-teal-100/50"
        >
          <li className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Building2 className="h-3 w-3" />
            {t("addrPickerHint", "Select to fill address fields")}
          </li>
          {filtered.map((c, i) => {
            const addressLine = [c.strasse, [c.plz, c.ort].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ");
            const isActive = i === activeIdx;
            return (
              <li
                key={`${c.firmenname}-${i}`}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={isActive}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(c);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex cursor-pointer items-start gap-2.5 px-3 py-2 transition-colors ${
                  isActive ? "bg-teal-50" : "hover:bg-slate-50"
                }`}
              >
                <Building2
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isActive ? "text-teal-600" : "text-slate-400"}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isActive ? "text-teal-900" : "text-slate-800"}`}>
                    {highlight(c.firmenname, value)}
                  </p>
                  {addressLine && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      {addressLine}
                      {c.land_code && (
                        <span className="ml-1 rounded bg-slate-100 px-1 py-px text-[10px] font-medium text-slate-500">
                          {c.land_code}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && value.trim().length > 0 && !hasResults && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm text-slate-500">{t("addrPickerNoResults", "No matching customers found.")}</p>
        </div>
      )}
    </div>
  );
}
