import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { X, Printer, FolderOpen, Car, Gauge, Euro, ArrowDownLeft, ArrowUpRight, CircleDashed } from "lucide-react";
import type { NewAngebotPayload } from "../types/angebote";
import type { TimetableNegotiationPriceRound, TimetableTruckOffer } from "../types/timetable";
import { SuggestTextInput } from "./SuggestTextInput";
import { GlobalAddressSearch, type GlobalAddressResult } from "./GlobalAddressSearch";
import {
  useLanguage,
  localeTagForLanguage,
  type LanguageCode,
} from "../contexts/LanguageContext";
import { TimetableOfferNegotiationHistory } from "../pages/timetable/components/TimetableOfferNegotiationHistory";
import { newTruckOfferId } from "../pages/timetable/contactDrawerFormUtils";

type TabId = "fahrzeug" | "technik" | "preise";

const MITARBEITER_OPTIONS = ["—", "Liciu Ana-Maria", "Mitsos Deligiannis", "Anna Schmidt", "Team Verkauf"];

const FAHRZEUGART_OPTIONS = ["LKW", "PKW", "Auflieger", "Transporter", "Sonstige"];
const AUFBAU_OPTIONS = ["Sonstige", "SZM", "Kipper", "Koffer", "Pritsche", "Sattel"];

const LAND_OPTIONS: { code: string; label: string }[] = [
  { code: "DE", label: "Deutschland" },
  { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },
  { code: "NL", label: "Niederlande" },
  { code: "BE", label: "Belgien" },
  { code: "LU", label: "Luxemburg" },
  { code: "FR", label: "Frankreich" },
  { code: "IT", label: "Italien" },
  { code: "ES", label: "Spanien" },
  { code: "PT", label: "Portugal" },
  { code: "GB", label: "Großbritannien" },
  { code: "IE", label: "Irland" },
  { code: "DK", label: "Dänemark" },
  { code: "SE", label: "Schweden" },
  { code: "NO", label: "Norwegen" },
  { code: "FI", label: "Finnland" },
  { code: "PL", label: "Polen" },
  { code: "CZ", label: "Tschechien" },
  { code: "SK", label: "Slowakei" },
  { code: "HU", label: "Ungarn" },
  { code: "RO", label: "Rumänien" },
  { code: "BG", label: "Bulgarien" },
  { code: "HR", label: "Kroatien" },
  { code: "SI", label: "Slowenien" },
  { code: "RS", label: "Serbien" },
  { code: "BA", label: "Bosnien-Herzegowina" },
  { code: "MK", label: "Nordmazedonien" },
  { code: "AL", label: "Albanien" },
  { code: "GR", label: "Griechenland" },
  { code: "TR", label: "Türkei" },
  { code: "RU", label: "Russland" },
  { code: "UA", label: "Ukraine" },
  { code: "LT", label: "Litauen" },
  { code: "LV", label: "Lettland" },
  { code: "EE", label: "Estland" },
  { code: "US", label: "USA" },
  { code: "CA", label: "Kanada" },
  { code: "CN", label: "China" },
  { code: "JP", label: "Japan" },
  { code: "IN", label: "Indien" },
  { code: "AU", label: "Australien" },
  { code: "BR", label: "Brasilien" },
  { code: "AR", label: "Argentinien" },
  { code: "ZA", label: "Südafrika" },
  { code: "MA", label: "Marokko" },
  { code: "AE", label: "Vereinigte Arab. Emirate" },
  { code: "SA", label: "Saudi-Arabien" },
];

const tabLabels: Record<TabId, string> = {
  fahrzeug: "Fahrzeug & Kunde",
  technik: "Technik & Termine",
  preise: "Preise & Extras",
};

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none ring-slate-200/50 placeholder:text-slate-400 focus:border-teal-400 focus:ring-2 focus:ring-teal-500/20";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  if (!t || t === "—") return undefined;
  return t;
}

function parseOptionalInt(s: string): number | undefined {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
}

function parsePreis(s: string): number {
  const t = s.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isNaN(n) ? 0 : n;
}

function parseOptionalEuro(s: string): number | null {
  const t = s.trim();
  if (!t || t === "—") return null;
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

type StockLedgerMode = "purchase" | "disposal" | "neutral";

function stockLedgerModeFromFlags(gekauft: boolean, verkauft: boolean): StockLedgerMode {
  if (gekauft && !verkauft) return "purchase";
  if (verkauft && !gekauft) return "disposal";
  return "neutral";
}

type FormState = {
  angebot_datum: string;
  abgabetermin: string;
  termin: string;
  anbieter: string;
  fahrzeugart: string;
  aufbauart: string;
  fabrikat: string;
  modellreihe: string;
  typ: string;
  fahrgestellnummer: string;
  ez_month: string;
  verkauft: boolean;
  anbieten: boolean;
  abgemeldet: boolean;
  bilder_liste: string;
  bemerkungen: string;
  kw: string;
  ps: string;
  km_stand_gesamt: string;
  km_stand_atm: string;
  bereifung_pct: string;
  allgemeiner_zustand: string;
  zul_gesamtgewicht_kg: string;
  leergewicht_kg: string;
  preisvorstellung_kunde: string;
  preisvorstellung_dema: string;
  eingeholt: string;
  verhandelt: string;
  eingetragen: string;
  preis_datum_1: string;
  preis_datum_2: string;
  preis_datum_3: string;
  preis_dema_1: string;
  preis_dema_2: string;
  preis_dema_3: string;
  preis_kunde_1: string;
  preis_kunde_2: string;
  preis_kunde_3: string;
  extras: string;
  negotiation_rounds: TimetableNegotiationPriceRound[];
  firmenname: string;
  plz: string;
  ort: string;
  land_code: string;
  gekauft: boolean;
};

function ezFromMonth(val: string): string {
  if (!val || val.length < 7) return "";
  return `${val}-01`;
}

function initialForm(): FormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    angebot_datum: today,
    abgabetermin: "",
    termin: today,
    anbieter: "",
    fahrzeugart: "LKW",
    aufbauart: "Sonstige",
    fabrikat: "",
    modellreihe: "",
    typ: "",
    fahrgestellnummer: "",
    ez_month: "",
    verkauft: false,
    anbieten: true,
    abgemeldet: false,
    bilder_liste: "",
    bemerkungen: "",
    kw: "",
    ps: "",
    km_stand_gesamt: "",
    km_stand_atm: "",
    bereifung_pct: "",
    allgemeiner_zustand: "",
    zul_gesamtgewicht_kg: "",
    leergewicht_kg: "",
    preisvorstellung_kunde: "",
    preisvorstellung_dema: "",
    eingeholt: "—",
    verhandelt: "—",
    eingetragen: "—",
    preis_datum_1: "",
    preis_datum_2: "",
    preis_datum_3: "",
    preis_dema_1: "",
    preis_dema_2: "",
    preis_dema_3: "",
    preis_kunde_1: "",
    preis_kunde_2: "",
    preis_kunde_3: "",
    extras: "",
    negotiation_rounds: [],
    firmenname: "",
    plz: "",
    ort: "",
    land_code: "DE",
    gekauft: false,
  };
}

function formToPayload(f: FormState): NewAngebotPayload {
  const ez = ezFromMonth(f.ez_month);
  return {
    angebot_datum: f.angebot_datum,
    abgabetermin: emptyToUndef(f.abgabetermin),
    termin: f.termin.trim() || f.angebot_datum,
    fahrzeugart: f.fahrzeugart,
    fabrikat: f.fabrikat.trim(),
    typ: f.typ.trim(),
    modellreihe: emptyToUndef(f.modellreihe),
    aufbauart: f.aufbauart,
    ez,
    fahrgestellnummer: emptyToUndef(f.fahrgestellnummer),
    preis: parsePreis(f.preisvorstellung_dema) || parsePreis(f.preis_dema_1) || 0,
    verkauft: f.verkauft,
    anbieten: f.anbieten,
    gekauft: f.gekauft,
    abgebieter: emptyToUndef(f.anbieter),
    plz: f.plz.trim(),
    ort: f.ort.trim(),
    firmenname: f.firmenname.trim(),
    land_code: f.land_code,
    abgemeldet: f.abgemeldet,
    bemerkungen: emptyToUndef(f.bemerkungen),
    kw: emptyToUndef(f.kw),
    ps: emptyToUndef(f.ps),
    km_stand_gesamt: emptyToUndef(f.km_stand_gesamt),
    km_stand_atm: emptyToUndef(f.km_stand_atm),
    bereifung_pct: emptyToUndef(f.bereifung_pct),
    allgemeiner_zustand: emptyToUndef(f.allgemeiner_zustand),
    zul_gesamtgewicht_kg: emptyToUndef(f.zul_gesamtgewicht_kg),
    leergewicht_kg: emptyToUndef(f.leergewicht_kg),
    preisvorstellung_kunde: emptyToUndef(f.preisvorstellung_kunde),
    preisvorstellung_dema: emptyToUndef(f.preisvorstellung_dema),
    eingeholt: emptyToUndef(f.eingeholt),
    verhandelt: emptyToUndef(f.verhandelt),
    eingetragen: emptyToUndef(f.eingetragen),
    preis_datum_1: emptyToUndef(f.preis_datum_1),
    preis_datum_2: emptyToUndef(f.preis_datum_2),
    preis_datum_3: emptyToUndef(f.preis_datum_3),
    preis_dema_1: parseOptionalInt(f.preis_dema_1),
    preis_dema_2: parseOptionalInt(f.preis_dema_2),
    preis_dema_3: parseOptionalInt(f.preis_dema_3),
    preis_kunde_1: parseOptionalInt(f.preis_kunde_1),
    preis_kunde_2: parseOptionalInt(f.preis_kunde_2),
    preis_kunde_3: parseOptionalInt(f.preis_kunde_3),
    extras: emptyToUndef(f.extras),
    bilder_liste: emptyToUndef(f.bilder_liste),
    negotiation_rounds: f.negotiation_rounds.length ? f.negotiation_rounds : undefined,
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  nextAngebotNrPreview: string;
  fabrikatSuggestions: readonly string[];
  onSubmit: (payload: NewAngebotPayload) => void;
};

export function NewAngebotModal({
  open,
  onClose,
  nextAngebotNrPreview,
  fabrikatSuggestions,
  onSubmit,
}: Props) {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<TabId>("fahrzeug");
  const [form, setForm] = useState<FormState>(initialForm);
  const [extrasLocked, setExtrasLocked] = useState(true);
  const bilderInputRef = useRef<HTMLInputElement>(null);
  const negotiationBridgeOfferIdRef = useRef(newTruckOfferId());

  const localeTag = useMemo(
    () => localeTagForLanguage(language as LanguageCode),
    [language]
  );

  const negotiationBridgeOffer = useMemo((): TimetableTruckOffer => {
    return {
      id: negotiationBridgeOfferIdRef.current,
      captured_at: "",
      vehicle_type: "",
      brand: form.fabrikat.trim(),
      model: `${form.modellreihe.trim()} ${form.typ.trim()}`.trim(),
      year: null,
      mileage_km: null,
      quantity: null,
      expected_price_eur: parseOptionalEuro(form.preisvorstellung_kunde),
      purchase_bid_eur: parseOptionalEuro(form.preisvorstellung_dema),
      location: "",
      notes: "",
      gekauft: form.gekauft,
      verkauft: form.verkauft,
      negotiation_rounds: form.negotiation_rounds,
    };
  }, [
    form.fabrikat,
    form.modellreihe,
    form.typ,
    form.preisvorstellung_kunde,
    form.preisvorstellung_dema,
    form.gekauft,
    form.verkauft,
    form.negotiation_rounds,
  ]);

  const setNegotiationOfferField = useCallback((patch: Partial<TimetableTruckOffer>) => {
    if (patch.negotiation_rounds === undefined) return;
    setForm((s) => ({
      ...s,
      negotiation_rounds: patch.negotiation_rounds ?? [],
    }));
  }, []);

  useEffect(() => {
    if (open) {
      setForm(initialForm());
      setTab("fahrzeug");
      setExtrasLocked(true);
    }
  }, [open]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
  }, []);

  const stockLedgerMode = useMemo(
    () => stockLedgerModeFromFlags(form.gekauft, form.verkauft),
    [form.gekauft, form.verkauft],
  );

  const applyStockLedgerMode = useCallback((mode: StockLedgerMode) => {
    setForm((s) => ({
      ...s,
      gekauft: mode === "purchase",
      verkauft: mode === "disposal",
    }));
  }, []);

  const stockLedgerOptions = useMemo(
    () =>
      [
        {
          id: "purchase" as const,
          title: t("angebotStockLedgerPurchase", "Purchased"),
          sub: t(
            "angebotStockLedgerPurchaseSub",
            "Inbound — DEMA acquires the vehicle",
          ),
          Icon: ArrowDownLeft,
        },
        {
          id: "disposal" as const,
          title: t("angebotStockLedgerDisposal", "Sold (third party)"),
          sub: t(
            "angebotStockLedgerDisposalSub",
            "Outbound — disposal to another company",
          ),
          Icon: ArrowUpRight,
        },
        {
          id: "neutral" as const,
          title: t("angebotStockLedgerNeutral", "Unclassified"),
          sub: t(
            "angebotStockLedgerNeutralSub",
            "Neither purchase nor third-party sale flagged yet",
          ),
          Icon: CircleDashed,
        },
      ] as const,
    [t],
  );

  const handleAddressSelect = useCallback((r: GlobalAddressResult) => {
    setForm((s) => ({
      ...s,
      plz: r.plz ?? s.plz,
      ort: r.ort ?? s.ort,
      land_code: r.land_code ?? s.land_code,
    }));
  }, []);

  const handleBilder = (list: FileList | null) => {
    if (!list?.length) return;
    const names = Array.from(list).map((f) => f.name);
    setForm((s) => {
      const prev = s.bilder_liste.trim();
      const next = prev ? `${prev}; ${names.join("; ")}` : names.join("; ");
      return { ...s, bilder_liste: next };
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    if (!form.fabrikat.trim() || !form.firmenname.trim()) {
      alert("Bitte Fabrikat und Firmenname (Kunde) ausfüllen.");
      setTab("fahrzeug");
      return;
    }
    onSubmit(formToPayload(form));
  };

  const handleResetForm = () => {
    if (!confirm("Formular wirklich leeren? Ungespeicherte Eingaben gehen verloren.")) return;
    setForm(initialForm());
  };

  const stub = (label: string) => {
    alert(`${label} — Anbindung folgt (wie im Legacy-System).`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-2 backdrop-blur-[2px] sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        id="angebot-neu-dialog"
        className="flex max-h-[min(96vh,920px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-teal-200/70 bg-white shadow-2xl shadow-teal-900/10"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-angebot-title"
      >
        <div className="relative flex shrink-0 flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-teal-900 to-slate-900 px-4 py-3 pr-14 text-white sm:px-6 sm:pr-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrint();
              }}
              className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <Printer className="h-4 w-4" />
              Drucken
            </button>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-baseline justify-center gap-2 sm:justify-start">
              <h2 id="new-angebot-title" className="text-lg font-bold tracking-tight sm:text-xl">
                Angebot
              </h2>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-teal-100">
                (Neu)
              </span>
              {stockLedgerMode === "purchase" && (
                <span className="rounded-md border border-emerald-400/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-100">
                  {t("angebotStockLedgerPurchase", "Purchased")}
                </span>
              )}
              {stockLedgerMode === "disposal" && (
                <span className="rounded-md border border-amber-400/40 bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100">
                  {t("angebotStockLedgerDisposal", "Sold (third party)")}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-300">
              DEMA Management · automatische ID{" "}
              <code className="rounded bg-black/20 px-1 print:bg-slate-100">{nextAngebotNrPreview}</code>
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Angebotsdatum</p>
            <p className="text-sm font-semibold tabular-nums">
              {new Date(form.angebot_datum).toLocaleDateString("de-DE")}
            </p>
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

        <div className="flex shrink-0 gap-0 border-b border-teal-100 bg-teal-50/40 px-3 pt-2 sm:px-5">
          {(Object.keys(tabLabels) as TabId[]).map((id) => {
            const Icon = id === "fahrzeug" ? Car : id === "technik" ? Gauge : Euro;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  tab === id
                    ? "border-teal-600 text-teal-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {tabLabels[id]}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-teal-50/25 to-slate-50/40 px-3 py-4 sm:px-6 sm:py-5">
          {tab === "fahrzeug" && (
            <div className="mx-auto max-w-5xl space-y-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Stammdaten</p>
                  <div>
                    <label className={labelClass}>Angebot-ID (automatisch)</label>
                    <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-semibold text-slate-800">
                      {nextAngebotNrPreview}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Angebotsdatum</label>
                    <input
                      type="date"
                      value={form.angebot_datum}
                      onChange={(e) => set("angebot_datum", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Anbieter</label>
                    <input
                      type="text"
                      value={form.anbieter}
                      onChange={(e) => set("anbieter", e.target.value)}
                      className={inputClass}
                      placeholder="Name / Firma"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Fahrzeugart</label>
                      <select
                        value={form.fahrzeugart}
                        onChange={(e) => set("fahrzeugart", e.target.value)}
                        className={inputClass}
                      >
                        {FAHRZEUGART_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>AufbauArt</label>
                      <select
                        value={form.aufbauart}
                        onChange={(e) => set("aufbauart", e.target.value)}
                        className={inputClass}
                      >
                        {AUFBAU_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      Fabrikat <span className="text-red-500">*</span>
                    </label>
                    <SuggestTextInput
                      type="text"
                      value={form.fabrikat}
                      onChange={(e) => set("fabrikat", e.target.value)}
                      suggestions={fabrikatSuggestions}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Modellreihe</label>
                      <input
                        type="text"
                        value={form.modellreihe}
                        onChange={(e) => set("modellreihe", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Typ</label>
                      <input
                        type="text"
                        value={form.typ}
                        onChange={(e) => set("typ", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Fahrgestellnummer</label>
                    <input
                      type="text"
                      value={form.fahrgestellnummer}
                      onChange={(e) => set("fahrgestellnummer", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Erstzulassung (Monat / Jahr)</label>
                    <input
                      type="month"
                      value={form.ez_month}
                      onChange={(e) => set("ez_month", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4">
                    <p className={labelClass}>{t("angebotStockLedgerLabel", "Stock transaction type")}</p>
                    <p className="mb-3 text-[11px] leading-snug text-slate-500 sm:text-xs">
                      {t(
                        "angebotStockLedgerHint",
                        "Purchase (inbound) and third-party sale (outbound) are mutually exclusive—pick the lane that matches this row.",
                      )}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="group" aria-label={t("angebotStockLedgerLabel", "Stock transaction type")}>
                      {stockLedgerOptions.map(({ id, title, sub, Icon }) => {
                        const active = stockLedgerMode === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => applyStockLedgerMode(id)}
                            className={`flex min-h-[44px] w-full flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition sm:min-h-0 ${
                              active
                                ? id === "purchase"
                                  ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/30"
                                  : id === "disposal"
                                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500/30"
                                    : "border-slate-500 bg-white ring-1 ring-slate-400/25"
                                : "border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/40"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                              <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                              {title}
                            </span>
                            <span className="text-[10px] leading-tight text-slate-500">{sub}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-700 sm:min-h-0">
                      <input
                        type="checkbox"
                        checked={form.anbieten}
                        onChange={(e) => set("anbieten", e.target.checked)}
                        className="rounded border-slate-300 text-teal-600"
                      />
                      Fahrzeug anbieten
                    </label>
                    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-slate-700 sm:min-h-0">
                      <input
                        type="checkbox"
                        checked={form.abgemeldet}
                        onChange={(e) => set("abgemeldet", e.target.checked)}
                        className="rounded border-slate-300 text-teal-600"
                      />
                      Abgemeldet
                    </label>
                  </div>
                  <div>
                    <label className={labelClass}>Bilder</label>
                    <input
                      ref={bilderInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleBilder(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => bilderInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50/60 py-2.5 text-sm font-medium text-teal-900 hover:bg-teal-100/80"
                    >
                      <FolderOpen className="h-4 w-4" />
                      Dateien wählen / Ordner (Demo)
                    </button>
                    {form.bilder_liste ? (
                      <p className="mt-1 text-[11px] text-slate-500">{form.bilder_liste}</p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Kunde / Standort</p>
                  <div>
                    <label className={labelClass}>
                      Firmenname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.firmenname}
                      onChange={(e) => set("firmenname", e.target.value)}
                      className={inputClass}
                      placeholder={t("angebotFirmennamePlaceholder", "Company / customer name")}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      {t("globalAddrSearchLabel", "Address search (worldwide)")}
                    </label>
                    <GlobalAddressSearch onSelect={handleAddressSelect} />
                    {(form.plz || form.ort) && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-teal-700">
                        <span className="font-semibold">
                          {[form.plz, form.ort].filter(Boolean).join(" ")}
                        </span>
                        {form.land_code && (
                          <span className="rounded bg-teal-100 px-1 py-px text-[10px] font-semibold text-teal-800">
                            {form.land_code}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>PLZ</label>
                      <input
                        type="text"
                        value={form.plz}
                        onChange={(e) => set("plz", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Ort</label>
                      <input
                        type="text"
                        value={form.ort}
                        onChange={(e) => set("ort", e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Land</label>
                    <select
                      value={form.land_code}
                      onChange={(e) => set("land_code", e.target.value)}
                      className={inputClass}
                    >
                      {LAND_OPTIONS.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.label} ({l.code})
                        </option>
                      ))}
                      {form.land_code && !LAND_OPTIONS.some((l) => l.code === form.land_code) && (
                        <option value={form.land_code}>{form.land_code}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Bemerkungen</label>
                    <textarea
                      value={form.bemerkungen}
                      onChange={(e) => set("bemerkungen", e.target.value)}
                      rows={6}
                      className={`${inputClass} min-h-[120px] resize-y py-2`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "technik" && (
            <div className="mx-auto max-w-5xl space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Technik</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={labelClass}>KW</label>
                    <input
                      type="text"
                      value={form.kw}
                      onChange={(e) => set("kw", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>PS</label>
                    <input
                      type="text"
                      value={form.ps}
                      onChange={(e) => set("ps", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>KM-Stand gesamt</label>
                    <input
                      type="text"
                      value={form.km_stand_gesamt}
                      onChange={(e) => set("km_stand_gesamt", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>KM-Stand ATM</label>
                    <input
                      type="text"
                      value={form.km_stand_atm}
                      onChange={(e) => set("km_stand_atm", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Bereifung (%)</label>
                    <input
                      type="text"
                      value={form.bereifung_pct}
                      onChange={(e) => set("bereifung_pct", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Allgemeiner Zustand</label>
                    <input
                      type="text"
                      value={form.allgemeiner_zustand}
                      onChange={(e) => set("allgemeiner_zustand", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Zul. Gesamtgewicht (kg)</label>
                    <input
                      type="text"
                      value={form.zul_gesamtgewicht_kg}
                      onChange={(e) => set("zul_gesamtgewicht_kg", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Leergewicht (kg)</label>
                    <input
                      type="text"
                      value={form.leergewicht_kg}
                      onChange={(e) => set("leergewicht_kg", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Termine &amp; Preisideen</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>Abgabetermin</label>
                    <input
                      type="date"
                      value={form.abgabetermin}
                      onChange={(e) => set("abgabetermin", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Termin (Liste)</label>
                    <input
                      type="date"
                      value={form.termin}
                      onChange={(e) => set("termin", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Preisvorstellung Kunde</label>
                    <input
                      type="text"
                      value={form.preisvorstellung_kunde}
                      onChange={(e) => set("preisvorstellung_kunde", e.target.value)}
                      placeholder="z. B. 45.000 €"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Preisvorstellung DEMA</label>
                    <input
                      type="text"
                      value={form.preisvorstellung_dema}
                      onChange={(e) => set("preisvorstellung_dema", e.target.value)}
                      placeholder="z. B. 42.500 €"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className={labelClass}>Angebot eingeholt</label>
                    <select
                      value={form.eingeholt}
                      onChange={(e) => set("eingeholt", e.target.value)}
                      className={inputClass}
                    >
                      {MITARBEITER_OPTIONS.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Verhandelt von</label>
                    <select
                      value={form.verhandelt}
                      onChange={(e) => set("verhandelt", e.target.value)}
                      className={inputClass}
                    >
                      {MITARBEITER_OPTIONS.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Angebot eingetragen</label>
                    <select
                      value={form.eingetragen}
                      onChange={(e) => set("eingetragen", e.target.value)}
                      className={inputClass}
                    >
                      {MITARBEITER_OPTIONS.map((z) => (
                        <option key={z} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "preise" && (
            <div className="mx-auto max-w-5xl space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Preishistorie</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="py-2 pr-2">Stufe</th>
                        <th className="py-2 pr-2">Preis-Datum</th>
                        <th className="py-2 pr-2">DEMA (€)</th>
                        <th className="py-2 pr-2">Kunde (€)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {([1, 2, 3] as const).map((n) => (
                        <tr key={n}>
                          <td className="py-2 pr-2 font-medium text-slate-600">{n}</td>
                          <td className="py-2 pr-2">
                            <input
                              type="date"
                              value={form[`preis_datum_${n}` as keyof FormState] as string}
                              onChange={(e) => set(`preis_datum_${n}` as keyof FormState, e.target.value)}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={form[`preis_dema_${n}` as keyof FormState] as string}
                              onChange={(e) => set(`preis_dema_${n}` as keyof FormState, e.target.value)}
                              className={inputClass}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={form[`preis_kunde_${n}` as keyof FormState] as string}
                              onChange={(e) => set(`preis_kunde_${n}` as keyof FormState, e.target.value)}
                              className={inputClass}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  Der Listenpreis in der Übersicht setzt sich aus der ersten gesetzten DEMA-Stufe bzw.
                  Preisvorstellung DEMA zusammen.
                </p>
              </div>

              {/*
                md+ = three columns (Verknüpfte | Extras | Preisverhandlung).
                Below md, stack with negotiation first so it is not hidden under the tall Extras block
                (lg-only columns were easy to miss on laptops/tablets < 1024px).
              */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="order-2 min-w-0 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm md:order-1">
                  <p className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-400">
                    <span>Verknüpfte Datensätze</span>
                  </p>
                  <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-teal-200/80 bg-teal-50/30 text-center text-sm text-slate-600">
                    Noch keine Einträge — nach Anbindung an Fahrzeuge / Kunden erscheinen Zeilen hier
                    (wie die leere Liste im Legacy-Formular).
                  </div>
                </div>
                <div className="order-3 min-w-0 rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 shadow-sm md:order-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-900">Extras</p>
                    <button
                      type="button"
                      onClick={() => setExtrasLocked((x) => !x)}
                      className="rounded-lg border border-teal-200 bg-white px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                    >
                      {extrasLocked ? "Bearbeiten" : "Sperren"}
                    </button>
                  </div>
                  <textarea
                    value={form.extras}
                    onChange={(e) => set("extras", e.target.value)}
                    readOnly={extrasLocked}
                    rows={8}
                    placeholder="Sonderausstattung, Zubehör, Hinweise…"
                    className={`${inputClass} min-h-[160px] resize-y py-2 ${
                      extrasLocked ? "cursor-default bg-slate-50 text-slate-600" : ""
                    }`}
                  />
                </div>
                <div className="order-1 min-w-0 md:order-3">
                  <TimetableOfferNegotiationHistory
                    offer={negotiationBridgeOffer}
                    setOfferField={setNegotiationOfferField}
                    localeTag={localeTag}
                    t={t}
                    compactTop
                    description={t(
                      "angebotNegotiationHint",
                      "Each price round captures the customer (seller) asking price and DEMA's price from the Technik & Termine tab. Enter or update those fields there, then return here and tap Record price round."
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["Kundendaten", () => stub("Kundendaten")],
                ["Allgemeine FZ-Übersicht", () => stub("FZ-Übersicht")],
                ["Termin eintragen", () => stub("Termin eintragen")],
                ["Termin öffnen", () => stub("Termin öffnen")],
                ["Kreditor auswählen", () => stub("Kreditor auswählen")],
                ["Abholauftrag erstellen", () => stub("Abholauftrag")],
              ] as const
            ).map(([label, fn]) => (
              <button
                key={label}
                type="button"
                onClick={fn}
                className="rounded-lg border border-teal-100 bg-white px-2.5 py-1.5 text-[11px] font-medium text-teal-900 hover:border-teal-200 hover:bg-teal-50/80 sm:text-xs"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleResetForm}
              className="order-last rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 sm:order-none sm:mr-auto"
            >
              Angebot löschen
            </button>
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
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 hover:bg-teal-700"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
