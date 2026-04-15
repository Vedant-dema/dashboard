import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDashed,
  AlertTriangle,
} from "lucide-react";
import type { AngebotStamm } from "../types/angebote";
import { combinedMatch } from "../lib/globalSearchMatch";
import { useApplyGlobalSearchFocus } from "../hooks/useApplyGlobalSearchFocus";
import {
  loadAngeboteDb,
  saveAngeboteDb,
  createAngebot,
  previewNextAngebotNr,
} from "../store/angeboteStore";
import { SuggestTextInput } from "../components/SuggestTextInput";
import { NewAngebotModal } from "../components/NewAngebotModal";
import { useLanguage } from "../contexts/LanguageContext";
import type { DepartmentArea } from "../types/departmentArea";
import { DEPARTMENT_I18N_KEY } from "../types/departmentArea";
import { angebotLedgerKind, type AngebotLedgerKind } from "../lib/angebotLedger";

const SORT_OPTIONS = [
  "Angebot-ID",
  "Angebotdatum",
  "Termin",
  "Preis",
  "Firmenname",
  "Fabrikat",
  "EZ",
] as const;

const FAHRZEUGART_OPTIONS = ["", "LKW", "PKW", "Auflieger", "Transporter", "Sonstige"];
const AUFBAU_OPTIONS = ["", "SZM", "Kipper", "Koffer", "Sonstige"];

function formatEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(n);
}

function parseDeDate(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const d = Date.parse(t);
  return Number.isNaN(d) ? null : d;
}

function yn(v: boolean): string {
  return v ? "Ja" : "Nein";
}

type StockFlowLaneFilter = "all" | AngebotLedgerKind;

export function AngebotePage({ department }: { department?: DepartmentArea }) {
  const { t } = useLanguage();
  const [db, setDb] = useState(() => loadAngeboteDb());
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [angebotId, setAngebotId] = useState("");
  const [angebotVon, setAngebotVon] = useState("");
  const [angebotBis, setAngebotBis] = useState("");
  const [abgabeVon, setAbgabeVon] = useState("");
  const [abgabeBis, setAbgabeBis] = useState("");
  const [ezVon, setEzVon] = useState("");
  const [ezBis, setEzBis] = useState("");
  const [preisVon, setPreisVon] = useState("");
  const [preisBis, setPreisBis] = useState("");
  const [fahrzeugart, setFahrzeugart] = useState("");
  const [aufbauart, setAufbauart] = useState("");
  const [fabrikat, setFabrikat] = useState("");
  const [modellTyp, setModellTyp] = useState("");
  const [kundenfilter, setKundenfilter] = useState("");
  const [globalHeaderSearch, setGlobalHeaderSearch] = useState("");
  const [land, setLand] = useState("");
  const [sortierung, setSortierung] = useState<string>(SORT_OPTIONS[0]);
  const [stockFlowLane, setStockFlowLane] = useState<StockFlowLaneFilter>("all");
  const [nurAnbieten, setNurAnbieten] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const q = sessionStorage.getItem("dema-search-q-angebote");
    if (q) {
      setGlobalHeaderSearch(q);
      sessionStorage.removeItem("dema-search-q-angebote");
    }
  }, []);

  const persist = useCallback((next: typeof db) => {
    saveAngeboteDb(next);
    setDb(next);
  }, []);

  const suggestions = useMemo(() => {
    const fa = new Set<string>();
    const fb = new Set<string>();
    const ort = new Set<string>();
    const plz = new Set<string>();
    for (const a of db.angebote) {
      if (a.fahrzeugart) fa.add(a.fahrzeugart);
      if (a.fabrikat) fb.add(a.fabrikat);
      if (a.ort) ort.add(a.ort);
      if (a.plz) plz.add(a.plz);
    }
    return {
      fabrikat: [...fb].sort(),
      ort: [...ort].sort(),
      plz: [...plz].sort(),
      angebot_nr: db.angebote.map((a) => a.angebot_nr),
    };
  }, [db.angebote]);


  const filtered = useMemo(() => {
    let list: AngebotStamm[] = [...db.angebote];

    if (globalHeaderSearch.trim()) {
      const raw = globalHeaderSearch.trim();
      list = list.filter((a) =>
        combinedMatch(
          raw,
          [
            a.angebot_nr,
            a.firmenname,
            a.fabrikat,
            a.typ,
            a.modellreihe,
            a.plz,
            a.ort,
            a.fahrgestellnummer,
            a.bemerkungen,
            a.land_code,
            a.fahrzeugart,
            a.aufbauart,
          ],
          [a.fahrgestellnummer]
        )
      );
    }

    if (angebotId.trim()) {
      const q = angebotId.trim().toLowerCase();
      list = list.filter((a) => a.angebot_nr.toLowerCase().includes(q));
    }
    const av = parseDeDate(angebotVon);
    const ab = parseDeDate(angebotBis);
    if (av != null) {
      list = list.filter((a) => Date.parse(a.angebot_datum) >= av);
    }
    if (ab != null) {
      list = list.filter((a) => Date.parse(a.angebot_datum) <= ab);
    }
    const abgv = parseDeDate(abgabeVon);
    const abgb = parseDeDate(abgabeBis);
    if (abgv != null || abgb != null) {
      list = list.filter((a) => {
        const t = a.abgabetermin || a.termin;
        if (!t) return false;
        const d = Date.parse(t);
        if (abgv != null && d < abgv) return false;
        if (abgb != null && d > abgb) return false;
        return true;
      });
    }
    const ezv = parseDeDate(ezVon);
    const ezb = parseDeDate(ezBis);
    if (ezv != null || ezb != null) {
      list = list.filter((a) => {
        if (!a.ez) return false;
        const d = Date.parse(a.ez);
        if (ezv != null && d < ezv) return false;
        if (ezb != null && d > ezb) return false;
        return true;
      });
    }
    const pv = preisVon.trim() ? Number(preisVon.replace(",", ".")) : NaN;
    const pb = preisBis.trim() ? Number(preisBis.replace(",", ".")) : NaN;
    if (!Number.isNaN(pv)) list = list.filter((a) => a.preis >= pv);
    if (!Number.isNaN(pb)) list = list.filter((a) => a.preis <= pb);

    if (fahrzeugart) list = list.filter((a) => a.fahrzeugart === fahrzeugart);
    if (aufbauart) list = list.filter((a) => a.aufbauart === aufbauart);
    if (fabrikat.trim()) {
      const f = fabrikat.toLowerCase();
      list = list.filter((a) => a.fabrikat.toLowerCase().includes(f));
    }
    if (modellTyp.trim()) {
      const m = modellTyp.toLowerCase();
      list = list.filter(
        (a) =>
          a.typ.toLowerCase().includes(m) ||
          (a.modellreihe || "").toLowerCase().includes(m)
      );
    }
    if (kundenfilter.trim()) {
      const k = kundenfilter.toLowerCase();
      list = list.filter((a) => a.firmenname.toLowerCase().includes(k));
    }
    if (land.trim()) {
      const l = land.trim().toLowerCase();
      list = list.filter((a) => (a.land_code || "").toLowerCase().includes(l));
    }
    if (stockFlowLane !== "all") {
      list = list.filter((a) => angebotLedgerKind(a) === stockFlowLane);
    }
    if (nurAnbieten) list = list.filter((a) => a.anbieten);

    const cmp = (a: AngebotStamm, b: AngebotStamm) => {
      switch (sortierung) {
        case "Angebotdatum":
          return a.angebot_datum.localeCompare(b.angebot_datum);
        case "Termin":
          return (a.termin || "").localeCompare(b.termin || "");
        case "Preis":
          return a.preis - b.preis;
        case "Firmenname":
          return a.firmenname.localeCompare(b.firmenname);
        case "Fabrikat":
          return a.fabrikat.localeCompare(b.fabrikat);
        case "EZ":
          return (a.ez || "").localeCompare(b.ez || "");
        default:
          return a.angebot_nr.localeCompare(b.angebot_nr);
      }
    };
    list.sort(cmp);
    return list;
  }, [
    db.angebote,
    globalHeaderSearch,
    angebotId,
    angebotVon,
    angebotBis,
    abgabeVon,
    abgabeBis,
    ezVon,
    ezBis,
    preisVon,
    preisBis,
    fahrzeugart,
    aufbauart,
    fabrikat,
    modellTyp,
    kundenfilter,
    land,
    stockFlowLane,
    nurAnbieten,
    sortierung,
  ]);

  const showAll = () => {
    setGlobalHeaderSearch("");
    setAngebotId("");
    setAngebotVon("");
    setAngebotBis("");
    setAbgabeVon("");
    setAbgabeBis("");
    setEzVon("");
    setEzBis("");
    setPreisVon("");
    setPreisBis("");
    setFahrzeugart("");
    setAufbauart("");
    setFabrikat("");
    setModellTyp("");
    setKundenfilter("");
    setLand("");
    setStockFlowLane("all");
    setNurAnbieten(false);
  };

  const focusAngebotFromSearch = useCallback(
    (id: number) => {
      if (!db.angebote.some((a) => a.id === id)) return;
      showAll();
      setSelectedId(id);
    },
    [db.angebote]
  );

  useApplyGlobalSearchFocus("angebote", focusAngebotFromSearch);

  const selected = selectedId != null ? db.angebote.find((a) => a.id === selectedId) : null;

  const ledgerMix = useMemo(() => {
    const z = { purchase: 0, disposal: 0, neutral: 0, conflict: 0 };
    for (const a of filtered) {
      z[angebotLedgerKind(a)] += 1;
    }
    return z;
  }, [filtered]);

  const stockFlowLaneButtons = useMemo(
    () =>
      (
        [
          { id: "all" as const, labelKey: "angeboteStockLaneAll" as const, fallback: "All types", Icon: null },
          {
            id: "purchase" as const,
            labelKey: "angebotStockLedgerPurchase" as const,
            fallback: "Purchased",
            Icon: ArrowDownLeft,
          },
          {
            id: "disposal" as const,
            labelKey: "angebotStockLedgerDisposal" as const,
            fallback: "Sold (third party)",
            Icon: ArrowUpRight,
          },
          {
            id: "neutral" as const,
            labelKey: "angebotStockLedgerNeutral" as const,
            fallback: "Unclassified",
            Icon: CircleDashed,
          },
          {
            id: "conflict" as const,
            labelKey: "angeboteStockLaneConflict" as const,
            fallback: "Review",
            Icon: AlertTriangle,
          },
        ] as const
      ).map((o) => ({ ...o, label: t(o.labelKey, o.fallback) })),
    [t],
  );

  const renderLedgerBadge = useCallback(
    (kind: AngebotLedgerKind, forSelectedRow: boolean) => {
      const base =
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
      const sel = forSelectedRow
        ? "border border-white/25 bg-white/10 text-white shadow-sm"
        : "";
      if (kind === "purchase") {
        return (
          <span
            className={`${base} ${
              forSelectedRow ? sel : "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-700/10"
            }`}
            title={t("angebotStockLedgerPurchaseSub", "Inbound — DEMA acquires the vehicle.")}
          >
            <ArrowDownLeft className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{t("angebotStockLedgerPurchase", "Purchased")}</span>
          </span>
        );
      }
      if (kind === "disposal") {
        return (
          <span
            className={`${base} ${
              forSelectedRow ? sel : "bg-amber-100 text-amber-950 ring-1 ring-amber-700/15"
            }`}
            title={t("angebotStockLedgerDisposalSub", "Outbound — disposal to another company.")}
          >
            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{t("angebotStockLedgerDisposal", "Sold (third party)")}</span>
          </span>
        );
      }
      if (kind === "conflict") {
        return (
          <span
            className={`${base} ${
              forSelectedRow ? sel : "bg-rose-100 text-rose-950 ring-1 ring-rose-600/15"
            }`}
            title={t("angeboteStockLaneConflictHint", "Purchase and disposal are both set — pick one lane in the offer form.")}
          >
            <AlertTriangle className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            <span className="truncate">{t("angeboteStockLaneConflict", "Review")}</span>
          </span>
        );
      }
      return (
        <span
          className={`${base} ${
            forSelectedRow ? sel : "bg-slate-100 text-slate-600 ring-1 ring-slate-300/60"
          }`}
          title={t("angebotStockLedgerNeutralSub", "Neither purchase nor third-party sale flagged yet.")}
        >
          <CircleDashed className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
          <span className="truncate">{t("angebotStockLedgerNeutral", "Unclassified")}</span>
        </span>
      );
    },
    [t],
  );

  const ledgerStripeClass = useCallback((kind: AngebotLedgerKind) => {
    if (kind === "purchase") return "border-l-[3px] border-l-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/65";
    if (kind === "disposal") return "border-l-[3px] border-l-amber-500 bg-amber-50/35 hover:bg-amber-50/55";
    if (kind === "conflict") return "border-l-[3px] border-l-rose-500 bg-rose-50/35 hover:bg-rose-50/55";
    return "";
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">{t("commonOffers", "Offers")}</h1>
          {department ? (
            <p className="mt-0.5 text-sm text-slate-500">
              {t("customersArea", "Area")}:{" "}
              <span className="font-medium text-slate-600">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
              {" · "}
              <span className="text-slate-400">
                {t(
                  "angeboteDeptHint",
                  "Filters and list follow the classic OFFERS screen; layout like Customers."
                )}
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-2xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Neues Angebot
        </button>
      </div>

      <div className="glass-card mb-4 space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            <Search className="h-4 w-4" />
            Zeigen
          </button>
          <button
            type="button"
            onClick={showAll}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            alle
          </button>
          <span className="text-xs text-slate-400">
            Filter wirken sofort auf die Tabelle (wie Schnellsuche bei Kunden).
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Angebot-ID</label>
            <SuggestTextInput
              type="text"
              value={angebotId}
              onChange={(e) => setAngebotId(e.target.value)}
              suggestions={suggestions.angebot_nr}
              title="Angebotsnummern"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Angebotdatum von</label>
            <input
              type="date"
              value={angebotVon}
              onChange={(e) => setAngebotVon(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Angebotdatum bis</label>
            <input
              type="date"
              value={angebotBis}
              onChange={(e) => setAngebotBis(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Abgabetermin von</label>
            <input
              type="date"
              value={abgabeVon}
              onChange={(e) => setAbgabeVon(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Abgabetermin bis</label>
            <input
              type="date"
              value={abgabeBis}
              onChange={(e) => setAbgabeBis(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">EZ von</label>
            <input
              type="date"
              value={ezVon}
              onChange={(e) => setEzVon(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">EZ bis</label>
            <input
              type="date"
              value={ezBis}
              onChange={(e) => setEzBis(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Preis von (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={preisVon}
              onChange={(e) => setPreisVon(e.target.value)}
              placeholder="0"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Preis bis (€)</label>
            <input
              type="text"
              inputMode="decimal"
              value={preisBis}
              onChange={(e) => setPreisBis(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fahrzeugart</label>
            <select
              value={fahrzeugart}
              onChange={(e) => setFahrzeugart(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            >
              {FAHRZEUGART_OPTIONS.map((opt) => (
                <option key={opt || "all"} value={opt}>
                  {opt || "Alle"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">AufbauArt</label>
            <select
              value={aufbauart}
              onChange={(e) => setAufbauart(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            >
              {AUFBAU_OPTIONS.map((opt) => (
                <option key={opt || "all"} value={opt}>
                  {opt || "Alle"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fabrikat</label>
            <SuggestTextInput
              type="text"
              value={fabrikat}
              onChange={(e) => setFabrikat(e.target.value)}
              suggestions={suggestions.fabrikat}
              title="Fabrikate in Angeboten"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Modell, Typ</label>
            <input
              type="text"
              value={modellTyp}
              onChange={(e) => setModellTyp(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Kundenfilter</label>
            <input
              type="text"
              value={kundenfilter}
              onChange={(e) => setKundenfilter(e.target.value)}
              placeholder="Firmenname…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Land</label>
            <input
              type="text"
              value={land}
              onChange={(e) => setLand(e.target.value)}
              placeholder="z. B. DE"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Sortierung</label>
            <select
              value={sortierung}
              onChange={(e) => setSortierung(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500/20"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t("angeboteStockFlowFilterTitle", "Stock flow")}
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {stockFlowLaneButtons.map(({ id, label, Icon }) => {
              const active = stockFlowLane === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStockFlowLane(id)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:min-h-0 sm:py-1 ${
                    active
                      ? "border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-600/25"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50/60"
                  }`}
                >
                  {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden /> : null}
                  {label}
                </button>
              );
            })}
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm text-slate-600 sm:min-h-0">
            <input
              type="checkbox"
              checked={nurAnbieten}
              onChange={(e) => setNurAnbieten(e.target.checked)}
              className="rounded border-slate-300"
            />
            {t("angeboteFilterOfferVehicle", "Offer vehicle")}
          </label>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-teal-600"
          >
            {showMoreFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Weitere Filter
          </button>
          {showMoreFilters && (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Alter von (J.)</label>
                <input type="number" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Alter bis (J.)</label>
                <input type="number" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">PS von</label>
                <input type="number" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">PS bis</label>
                <input type="number" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Gewicht von (kg)</label>
                <input type="number" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Gewicht bis (kg)</label>
                <input type="number" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-3 py-3">Angebot</th>
                <th className="whitespace-nowrap px-3 py-3">Angebotdatum</th>
                <th className="whitespace-nowrap px-3 py-3">Fahrzeugart</th>
                <th className="whitespace-nowrap px-3 py-3">Fabrikat</th>
                <th className="whitespace-nowrap px-3 py-3">Typ</th>
                <th className="whitespace-nowrap px-3 py-3">AufbauArt</th>
                <th className="whitespace-nowrap px-3 py-3">EZ</th>
                <th className="whitespace-nowrap px-3 py-3">Preis</th>
                <th className="whitespace-nowrap px-3 py-3">{t("angeboteStockFlowColHeader", "Stock flow")}</th>
                <th className="whitespace-nowrap px-3 py-3">Anbieten</th>
                <th className="whitespace-nowrap px-3 py-3">Abgebieter</th>
                <th className="whitespace-nowrap px-3 py-3">PLZ</th>
                <th className="whitespace-nowrap px-3 py-3">Ort</th>
                <th className="whitespace-nowrap px-3 py-3">Firmenname</th>
                <th className="whitespace-nowrap px-3 py-3">Termin</th>
                <th className="whitespace-nowrap px-3 py-3">Eingetragen</th>
                <th className="whitespace-nowrap px-3 py-3">Eingeholt</th>
                <th className="whitespace-nowrap px-3 py-3">Verhandelt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-4 py-12 text-center text-sm text-slate-500">
                    {t(
                      "angeboteEmptyFiltered",
                      "No offers match these filters. Reset filters or create a new offer.",
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => {
                  const ledger = angebotLedgerKind(row);
                  const isRowSelected = selectedId === row.id;
                  const stripe = ledgerStripeClass(ledger);
                  const zebraNeutral =
                    ledger === "neutral"
                      ? i % 2 === 1
                        ? "bg-slate-50/90 text-slate-800 hover:bg-slate-100"
                        : "text-slate-800 hover:bg-slate-50"
                      : "text-slate-800";
                  return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer transition ${
                      isRowSelected ? "bg-slate-800 text-white" : `${stripe} ${zebraNeutral}`.trim()
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums">{row.angebot_nr}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{row.angebot_datum}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.fahrzeugart}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.fabrikat}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.typ}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.aufbauart}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{row.ez || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatEur(row.preis)}</td>
                    <td className="max-w-[9rem] px-3 py-2.5 align-middle">
                      {renderLedgerBadge(ledger, isRowSelected)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{yn(row.anbieten)}</td>
                    <td className="max-w-[120px] truncate px-3 py-2.5">{row.abgebieter || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{row.plz}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.ort}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5" title={row.firmenname}>
                      {row.firmenname}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{row.termin}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.eingetragen || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.eingeholt || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.verhandelt || "—"}</td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 space-y-1 border-t border-slate-200 bg-slate-50/90 px-4 py-2.5 text-right text-sm text-slate-600">
          <div>
            {t("angeboteFooterRowCount", "Rows shown:")}{" "}
            <span className="font-semibold tabular-nums text-slate-800">{filtered.length}</span>
          </div>
          <div className="text-xs text-slate-500">
            {t("angeboteSummaryLedgerMix", "{purchase} inbound · {disposal} outbound · {neutral} open · {conflict} review")
              .replace("{purchase}", String(ledgerMix.purchase))
              .replace("{disposal}", String(ledgerMix.disposal))
              .replace("{neutral}", String(ledgerMix.neutral))
              .replace("{conflict}", String(ledgerMix.conflict))}
          </div>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => setSelectedId(null)}
          role="presentation"
        >
          <div
            className="flex h-full w-full max-w-lg shrink-0 flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="angebot-drawer-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Angebot</p>
                <h2 id="angebot-drawer-title" className="truncate text-xl font-bold text-slate-800">
                  {selected.angebot_nr}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {selected.fabrikat} {selected.typ}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="mb-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50/30 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  {t("angeboteDrawerLabelStockFlow", "Stock flow")}
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  {renderLedgerBadge(angebotLedgerKind(selected), false)}
                  <span className="text-[11px] leading-snug text-slate-500 sm:max-w-[15rem] sm:text-right">
                    {t(
                      "angeboteDrawerStockFlowHint",
                      "Inbound purchase vs outbound third-party sale — same as the new-offer form.",
                    )}
                  </span>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                {(
                  [
                    ["Angebotdatum", selected.angebot_datum],
                    ["Abgabetermin", selected.abgabetermin || "—"],
                    ["Fahrzeugart", selected.fahrzeugart],
                    ["Aufbau", selected.aufbauart],
                    ["Modellreihe", selected.modellreihe || "—"],
                    ["FIN", selected.fahrgestellnummer || "—"],
                    ["EZ", selected.ez || "—"],
                    ["Preis", formatEur(selected.preis)],
                    ["Anbieten", yn(selected.anbieten)],
                    ["Abgemeldet", yn(selected.abgemeldet ?? false)],
                    ["Kunde", selected.firmenname],
                    ["PLZ / Ort", `${selected.plz} ${selected.ort}`],
                    ["Termin", selected.termin],
                    ["Eingetragen", selected.eingetragen || "—"],
                    ["Eingeholt", selected.eingeholt || "—"],
                    ["Verhandelt", selected.verhandelt || "—"],
                    ["Bemerkungen", selected.bemerkungen || "—"],
                    ["Extras", selected.extras || "—"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-right font-medium text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      <NewAngebotModal
        open={showNew}
        onClose={() => setShowNew(false)}
        nextAngebotNrPreview={previewNextAngebotNr(db)}
        fabrikatSuggestions={suggestions.fabrikat}
        onSubmit={(payload) => {
          setDb((current) => {
            const next = createAngebot(current, payload);
            saveAngeboteDb(next);
            return next;
          });
          setShowNew(false);
        }}
      />
    </div>
  );
}
