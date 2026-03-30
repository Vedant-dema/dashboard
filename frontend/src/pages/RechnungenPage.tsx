import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, Plus, X, FolderOpen, Link2 } from "lucide-react";
import type { RechnungListRow } from "../types/rechnungen";
import { combinedMatch } from "../lib/globalSearchMatch";
import { useApplyGlobalSearchFocus } from "../hooks/useApplyGlobalSearchFocus";
import { loadRechnungenDb, formatRechnungsbetrag } from "../store/rechnungenStore";
import { SuggestTextInput } from "../components/SuggestTextInput";
import { useLanguage } from "../contexts/LanguageContext";
import type { DepartmentArea } from "../types/departmentArea";
import { DEPARTMENT_I18N_KEY } from "../types/departmentArea";

const SORT_KEYS = [
  "rechn_nr",
  "r_datum",
  "kunden_nr",
  "firmenname",
  "rechnungsbetrag",
] as const;
type SortKey = (typeof SORT_KEYS)[number];

const ART_OPTIONS = ["", "DIL", "DEG", "DSL", "S", "NSL"];

function parseIsoDateStart(s: string): number | null {
  if (!s.trim()) return null;
  const d = Date.parse(s + "T00:00:00");
  return Number.isNaN(d) ? null : d;
}

function parseIsoDateEnd(s: string): number | null {
  if (!s.trim()) return null;
  const d = Date.parse(s + "T23:59:59");
  return Number.isNaN(d) ? null : d;
}

function formatRDatum(iso: string): string {
  if (!iso) return "—";
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function RechnungenPage({ department }: { department?: DepartmentArea }) {
  const { t } = useLanguage();
  const [db, setDb] = useState(() => loadRechnungenDb());

  useEffect(() => {
    const onCh = () => setDb(loadRechnungenDb());
    window.addEventListener("dema-rechnungen-db-changed", onCh);
    return () => window.removeEventListener("dema-rechnungen-db-changed", onCh);
  }, []);

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [globalHeaderSearch, setGlobalHeaderSearch] = useState("");
  const [quickFirmenname, setQuickFirmenname] = useState("");
  const [rechnungsNr, setRechnungsNr] = useState("");
  const [vonRDatum, setVonRDatum] = useState("");
  const [bisRDatum, setBisRDatum] = useState("");
  const [art, setArt] = useState("");
  const [rechnungErst, setRechnungErst] = useState("");
  const [verkaufer, setVerkaufer] = useState("");
  const [vermerk, setVermerk] = useState("");
  const [kundenNr, setKundenNr] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [land, setLand] = useState("");
  const [ustId, setUstId] = useState("");
  const [positionsNr, setPositionsNr] = useState("");
  const [fahrgestellNr, setFahrgestellNr] = useState("");
  const [verkaufsNr, setVerkaufsNr] = useState("");
  const [filterNichtErledigt, setFilterNichtErledigt] = useState(false);
  const [filterBhCheck, setFilterBhCheck] = useState(false);
  const [filterNichtAbgeholt, setFilterNichtAbgeholt] = useState(false);
  const [sortierung, setSortierung] = useState<SortKey>("rechn_nr");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNewDrawer, setShowNewDrawer] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState("");

  useEffect(() => {
    const q = sessionStorage.getItem("dema-search-q-rechnungen");
    if (q) {
      setGlobalHeaderSearch(q);
      sessionStorage.removeItem("dema-search-q-rechnungen");
    }
  }, []);

  const suggestions = useMemo(() => {
    const fn = new Set<string>();
    const ku = new Set<string>();
    for (const r of db.rows) {
      if (r.firmenname) fn.add(r.firmenname);
      if (r.kunden_nr) ku.add(r.kunden_nr);
    }
    return { firmenname: [...fn].sort((a, b) => a.localeCompare(b, "de")), kunden_nr: [...ku].sort() };
  }, [db.rows]);

  const erstellerOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of db.rows) {
      if (r.rechnung_erstellt_von) s.add(r.rechnung_erstellt_von);
    }
    return ["", ...[...s].sort((a, b) => a.localeCompare(b, "de"))];
  }, [db.rows]);

  const verkauferOptions = useMemo(() => {
    const s = new Set<string>();
    for (const r of db.rows) {
      if (r.verkaufer) s.add(r.verkaufer);
    }
    return ["", ...[...s].sort((a, b) => a.localeCompare(b, "de"))];
  }, [db.rows]);

  const resetFilters = useCallback(() => {
    setGlobalHeaderSearch("");
    setQuickFirmenname("");
    setRechnungsNr("");
    setVonRDatum("");
    setBisRDatum("");
    setArt("");
    setRechnungErst("");
    setVerkaufer("");
    setVermerk("");
    setKundenNr("");
    setFirmenname("");
    setPlz("");
    setOrt("");
    setLand("");
    setUstId("");
    setPositionsNr("");
    setFahrgestellNr("");
    setVerkaufsNr("");
    setFilterNichtErledigt(false);
    setFilterBhCheck(false);
    setFilterNichtAbgeholt(false);
    setSortierung("rechn_nr");
  }, []);

  const refreshDb = useCallback(() => setDb(loadRechnungenDb()), []);

  const focusRechnungFromSearch = useCallback(
    (id: number) => {
      if (!db.rows.some((r) => r.id === id)) return;
      resetFilters();
      setSelectedId(id);
    },
    [db.rows, resetFilters]
  );

  useApplyGlobalSearchFocus("rechnungen", focusRechnungFromSearch);

  const filtered = useMemo(() => {
    let list = [...db.rows];
    if (globalHeaderSearch.trim()) {
      const raw = globalHeaderSearch.trim();
      list = list.filter((r) =>
        combinedMatch(
          raw,
          [
            r.rechn_nr,
            r.firmenname,
            r.kunden_nr,
            r.fahrgestell_nr,
            r.positions_nr,
            r.verkaufs_nr,
            r.ort,
            r.plz,
            r.land,
            r.art,
            r.buchung,
            r.vermerk,
            r.ust_id,
            r.ersteller,
            r.verkaufer,
          ],
          [r.kunden_nr, r.fahrgestell_nr, r.rechn_nr, r.positions_nr, r.verkaufs_nr]
        )
      );
    }
    const qf = quickFirmenname.trim().toLowerCase();
    if (qf) list = list.filter((r) => r.firmenname.toLowerCase().includes(qf));
    if (rechnungsNr.trim()) {
      const q = rechnungsNr.trim().toLowerCase();
      list = list.filter((r) => r.rechn_nr.toLowerCase().includes(q));
    }
    const vStart = parseIsoDateStart(vonRDatum);
    const vEnd = parseIsoDateEnd(bisRDatum);
    if (vStart != null) list = list.filter((r) => Date.parse(r.r_datum) >= vStart);
    if (vEnd != null) list = list.filter((r) => Date.parse(r.r_datum) <= vEnd);
    if (art) list = list.filter((r) => r.art === art);
    if (rechnungErst) list = list.filter((r) => r.rechnung_erstellt_von === rechnungErst);
    if (verkaufer) list = list.filter((r) => r.verkaufer === verkaufer);
    if (vermerk.trim()) {
      const v = vermerk.trim().toLowerCase();
      list = list.filter((r) => r.vermerk.toLowerCase().includes(v));
    }
    if (kundenNr.trim()) {
      const k = kundenNr.trim();
      list = list.filter((r) => r.kunden_nr.includes(k));
    }
    if (firmenname.trim()) {
      const f = firmenname.trim().toLowerCase();
      list = list.filter((r) => r.firmenname.toLowerCase().includes(f));
    }
    if (plz.trim()) list = list.filter((r) => r.plz.includes(plz.trim()));
    if (ort.trim()) list = list.filter((r) => r.ort.toLowerCase().includes(ort.trim().toLowerCase()));
    if (land.trim()) list = list.filter((r) => r.land.toLowerCase().includes(land.trim().toLowerCase()));
    if (ustId.trim()) list = list.filter((r) => r.ust_id.toLowerCase().includes(ustId.trim().toLowerCase()));
    if (positionsNr.trim()) list = list.filter((r) => r.positions_nr.toLowerCase().includes(positionsNr.trim().toLowerCase()));
    if (fahrgestellNr.trim()) {
      const fg = fahrgestellNr.trim().toLowerCase();
      list = list.filter((r) => r.fahrgestell_nr.toLowerCase().includes(fg));
    }
    if (verkaufsNr.trim()) list = list.filter((r) => r.verkaufs_nr.toLowerCase().includes(verkaufsNr.trim().toLowerCase()));
    if (filterNichtErledigt) list = list.filter((r) => r.nicht_erledigt);
    if (filterBhCheck) list = list.filter((r) => r.bh_check);
    if (filterNichtAbgeholt) list = list.filter((r) => r.nicht_abgeholt);

    const cmp = (a: RechnungListRow, b: RechnungListRow) => {
      switch (sortierung) {
        case "r_datum":
          return b.r_datum.localeCompare(a.r_datum);
        case "kunden_nr":
          return a.kunden_nr.localeCompare(b.kunden_nr, "de", { numeric: true });
        case "firmenname":
          return a.firmenname.localeCompare(b.firmenname, "de");
        case "rechnungsbetrag":
          return b.betrag_cent - a.betrag_cent;
        default:
          return b.rechn_nr.localeCompare(a.rechn_nr, "de", { numeric: true });
      }
    };
    list.sort(cmp);
    return list;
  }, [
    db.rows,
    globalHeaderSearch,
    quickFirmenname,
    rechnungsNr,
    vonRDatum,
    bisRDatum,
    art,
    rechnungErst,
    verkaufer,
    vermerk,
    kundenNr,
    firmenname,
    plz,
    ort,
    land,
    ustId,
    positionsNr,
    fahrgestellNr,
    verkaufsNr,
    filterNichtErledigt,
    filterBhCheck,
    filterNichtAbgeholt,
    sortierung,
  ]);

  const selected = selectedId != null ? db.rows.find((r) => r.id === selectedId) : null;

  const inputFocus =
    "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20";

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            {t("rechnungenPageTitle", "Rechnungen")}
          </h1>
          {department ? (
            <p className="mt-0.5 text-sm text-slate-500">
              {t("customersArea", "Bereich")}:{" "}
              <span className="font-medium text-slate-600">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowNewDrawer(true)}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          {t("rechnungenNewInvoice", "Neue Rechnung erfassen")}
        </button>
      </div>

      <div className="glass-card mb-4 space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-600">{t("rechnungenQuickSearch", "Firmenname Schnellsuche:")}</span>
          <SuggestTextInput
            type="text"
            value={quickFirmenname}
            onChange={(e) => setQuickFirmenname(e.target.value)}
            suggestions={suggestions.firmenname}
            title={t("rechnungenSuggestionsCompanies", "Gespeicherte Firmennamen")}
            className="h-10 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          <button
            type="button"
            onClick={refreshDb}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            <Search className="h-4 w-4" />
            {t("rechnungenShow", "Zeigen")}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {t("rechnungenAll", "alle")}
          </button>
          <span className="text-xs text-slate-400">{t("rechnungenFilterHint", "Filter wirken sofort auf die Liste.")}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelNr", "RechnungsNr:")}</label>
            <input type="text" value={rechnungsNr} onChange={(e) => setRechnungsNr(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelVonRDatum", "von RDatum:")}</label>
            <input type="date" value={vonRDatum} onChange={(e) => setVonRDatum(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelBisRDatum", "bis RDatum:")}</label>
            <input type="date" value={bisRDatum} onChange={(e) => setBisRDatum(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelArt", "Art:")}</label>
            <select value={art} onChange={(e) => setArt(e.target.value)} className={inputFocus}>
              {ART_OPTIONS.map((o) => (
                <option key={o || "all"} value={o}>
                  {o || "—"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelKundenNr", "KundenNr:")}</label>
            <SuggestTextInput
              value={kundenNr}
              onChange={(e) => setKundenNr(e.target.value)}
              suggestions={suggestions.kunden_nr}
              title={t("rechnungenSuggestionsKu", "Kundennummern")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersThCompany", "Firmenname:")}</label>
            <SuggestTextInput
              value={firmenname}
              onChange={(e) => setFirmenname(e.target.value)}
              suggestions={suggestions.firmenname}
              title={t("rechnungenSuggestionsCompanies", "Gespeicherte Firmennamen")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersThZip", "PLZ:")}</label>
            <input type="text" value={plz} onChange={(e) => setPlz(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersThCity", "Ort:")}</label>
            <input type="text" value={ort} onChange={(e) => setOrt(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersThCountry", "Land:")}</label>
            <input type="text" value={land} onChange={(e) => setLand(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">{t("dupCustomersSort", "Sortierung:")}</label>
            <select
              value={sortierung}
              onChange={(e) => setSortierung(e.target.value as SortKey)}
              className={inputFocus}
            >
              <option value="rechn_nr">{t("rechnungenSortRechnNr", "RechnungsNr")}</option>
              <option value="r_datum">{t("rechnungenSortRDatum", "R_Datum")}</option>
              <option value="kunden_nr">{t("customersSortKundenNr", "KundenNr")}</option>
              <option value="firmenname">{t("customersSortFirmenname", "Firmenname")}</option>
              <option value="rechnungsbetrag">{t("rechnungenSortBetrag", "Rechnungsbetrag")}</option>
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
          >
            {showMoreFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {t("customersMoreFilters", "Weitere Filter")}
          </button>
          {showMoreFilters ? (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-3 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelRechnungErst", "Rechnung erst.:")}</label>
                <select value={rechnungErst} onChange={(e) => setRechnungErst(e.target.value)} className={inputFocus}>
                  {erstellerOptions.map((o) => (
                    <option key={o || "e"} value={o}>
                      {o || "—"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelVerkaeufer", "Verkäufer:")}</label>
                <select value={verkaufer} onChange={(e) => setVerkaufer(e.target.value)} className={inputFocus}>
                  {verkauferOptions.map((o) => (
                    <option key={o || "v"} value={o}>
                      {o || "—"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelVermerk", "Vermerk:")}</label>
                <input type="text" value={vermerk} onChange={(e) => setVermerk(e.target.value)} className={inputFocus} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelUstId", "UmsatzsteuerID:")}</label>
                <input type="text" value={ustId} onChange={(e) => setUstId(e.target.value)} className={inputFocus} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelPositionsNr", "PositionsNr:")}</label>
                <input type="text" value={positionsNr} onChange={(e) => setPositionsNr(e.target.value)} className={inputFocus} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelFgst", "FahrgestellNr:")}</label>
                <input type="text" value={fahrgestellNr} onChange={(e) => setFahrgestellNr(e.target.value)} className={inputFocus} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelVerkaufsNr", "VerkaufsNr:")}</label>
                <input type="text" value={verkaufsNr} onChange={(e) => setVerkaufsNr(e.target.value)} className={inputFocus} />
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2 md:col-span-4">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={filterNichtErledigt}
                    onChange={(e) => setFilterNichtErledigt(e.target.checked)}
                  />
                  {t("rechnungenFilterNichtErledigt", "Nicht Erledigte")}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={filterBhCheck}
                    onChange={(e) => setFilterBhCheck(e.target.checked)}
                  />
                  {t("rechnungenFilterBhCheck", "BH Check")}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={filterNichtAbgeholt}
                    onChange={(e) => setFilterNichtAbgeholt(e.target.checked)}
                  />
                  {t("rechnungenFilterNichtAbgeholt", "nicht Abgeholt")}
                </label>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-3 py-3">{t("rechnungenThRechnNr", "RechnNr")}</th>
                <th className="whitespace-nowrap px-3 py-3">{t("rechnungenThRDatum", "R_Datum")}</th>
                <th className="whitespace-nowrap px-3 py-3">{t("rechnungenThKundenNr", "KundenNr")}</th>
                <th className="px-3 py-3">{t("customersThCompany", "Firmenname")}</th>
                <th className="whitespace-nowrap px-3 py-3">{t("customersThCountry", "Land")}</th>
                <th className="whitespace-nowrap px-3 py-3">{t("customersThZip", "PLZ")}</th>
                <th className="px-3 py-3">{t("customersThCity", "Ort")}</th>
                <th className="whitespace-nowrap px-3 py-3">{t("rechnungenThArt", "Art")}</th>
                <th className="whitespace-nowrap px-3 py-3">{t("rechnungenThBuchung", "Buchung")}</th>
                <th className="whitespace-nowrap px-3 py-3">{t("rechnungenThBezahltAm", "Bezahltam")}</th>
                <th className="w-12 px-2 py-3 text-center">{t("rechnungenThErsteller", "Ersteller")}</th>
                <th className="w-12 px-2 py-3 text-center">{t("rechnungenThVerkaeufer", "Verkäufer")}</th>
                <th className="whitespace-nowrap px-3 py-3 text-right">{t("rechnungenThBetrag", "Rechnungsbetrag")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-sm text-slate-500">
                    {t("rechnungenEmpty", "Keine Treffer. Filter mit „alle“ zurücksetzen.")}
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`cursor-pointer transition ${
                      selectedId === r.id
                        ? "bg-slate-800 text-white"
                        : i % 2 === 1
                          ? "bg-amber-50/40 text-slate-800 hover:bg-amber-50/70"
                          : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono font-medium tabular-nums">{r.rechn_nr}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatRDatum(r.r_datum)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{r.kunden_nr}</td>
                    <td className="max-w-[220px] truncate px-3 py-2.5" title={r.firmenname}>
                      {r.firmenname}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{r.land}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{r.plz}</td>
                    <td className="px-3 py-2.5">{r.ort}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{r.art}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{r.buchung}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {r.bezahlt_am ? formatRDatum(r.bezahlt_am) : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-center text-xs font-medium">{r.ersteller}</td>
                    <td className="px-2 py-2.5 text-center text-xs font-medium">{r.verkaufer}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums">
                      {formatRechnungsbetrag(r.betrag_cent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-2.5 text-right text-sm text-slate-700">
          {t("rechnungenCount", "Anzahl Rechnungen:")}{" "}
          <span className="font-semibold tabular-nums text-slate-700">{filtered.length}</span>
        </div>
      </div>

      {(selected || showNewDrawer) && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => {
            setSelectedId(null);
            setShowNewDrawer(false);
          }}
          role="presentation"
        >
          <div
            className="flex h-full w-full max-w-[min(100vw-12px,92rem)] shrink-0 flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rechnung-drawer-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{t("rechnungenDrawerLabel", "Rechnung")}</p>
                <h2 id="rechnung-drawer-title" className="truncate text-xl font-bold text-slate-800">
                  {showNewDrawer
                    ? t("rechnungenDrawerNew", "(Neu)")
                    : selected?.rechn_nr ?? "—"}
                </h2>
                {!showNewDrawer && selected ? (
                  <p className="mt-0.5 text-sm text-slate-600">{selected.firmenname}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setShowNewDrawer(false);
                }}
                className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label={t("rechnungenCloseDrawer", "Schließen")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/90 p-5 text-sm sm:p-6 lg:p-8">
              {showNewDrawer ? (
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Rechnungskopf</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelNr", "RechnungsNr:")}</label>
                        <input className={inputFocus} placeholder="(Neu)" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenThRDatum", "R_Datum")}</label>
                        <input type="date" className={inputFocus} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenLabelVerkaeufer", "Verkäufer:")}</label>
                        <input className={inputFocus} placeholder="z. B. tk" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">{t("rechnungenThBezahltAm", "Bezahltam")}</label>
                        <input type="date" className={inputFocus} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersThCompany", "Firmenname")}</label>
                        <input className={inputFocus} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-500">{t("customersThStreet", "Straße")}</label>
                        <input className={inputFocus} />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Aktionen</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Kunden auswählen</button>
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">FZG auswählen</button>
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Quittungen</button>
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Quittung Provision</button>
                      <button type="button" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-100">Alle Einträge</button>
                      <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50">Gutschrift erfassen</button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Positionen & Zahlung</h3>
                    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Zahlungsart</label>
                        <select className={inputFocus}>
                          <option>BAR ERHALTEN</option>
                          <option>UEBERWEISUNG ERHALTEN</option>
                          <option>SONSTIGE</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Rechnungsland</label>
                        <select className={inputFocus}>
                          <option>Inland</option>
                          <option>EU</option>
                          <option>Drittes Länder</option>
                        </select>
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-100">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 font-semibold text-slate-600">
                          <tr>
                            <th className="px-3 py-2">PositionsNr.</th>
                            <th className="px-3 py-2">Buchungskonto</th>
                            <th className="px-3 py-2">VerkaufsNr.</th>
                            <th className="px-3 py-2">Fahrgestellnummer</th>
                            <th className="px-3 py-2 text-right">Nettopreis</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                              Positionserfassung folgt mit API-Anbindung
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Netto / MwSt / Brutto</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Netto gesamt</label>
                        <input className={inputFocus} placeholder="0,00" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">MwSt</label>
                        <input className={inputFocus} placeholder="19%" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Bruttopreis</label>
                        <input className={inputFocus} placeholder="0,00" />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">Druckunterlagen (wie Kunden-Ordner)</h3>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={newFolderPath}
                        onChange={(e) => setNewFolderPath(e.target.value)}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                        placeholder="\\Server\\Rechnungen\\2026 oder https://…"
                      />
                      <button
                        type="button"
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        <FolderOpen className="h-4 w-4" />
                        Ordner
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const p = newFolderPath.trim();
                          if (!p) return;
                          if (/^https?:\/\//i.test(p)) {
                            window.open(p, "_blank", "noopener,noreferrer");
                            return;
                          }
                          void navigator.clipboard.writeText(p);
                        }}
                        className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50"
                        title="Link öffnen oder UNC-Pfad kopieren"
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                    </div>
                  </section>

                  <p className="text-xs text-slate-500">
                    {t(
                      "rechnungenDrawerNewHint",
                      "Die vollständige Maske RECHNUNG (Positionen, Zahlungsart, Netto/Brutto, Druck) wird mit Anbindung an die API ergänzt. Hier können Sie vorerst nur die Liste filtern und bestehende Demo-Rechnungen ansehen."
                    )}
                  </p>
                </div>
              ) : selected ? (
                <dl className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {(
                    [
                      [t("rechnungenThRDatum", "R_Datum"), formatRDatum(selected.r_datum)],
                      [t("rechnungenThKundenNr", "KundenNr"), selected.kunden_nr],
                      [t("customersThCompany", "Firmenname"), selected.firmenname],
                      [t("customersThCountry", "Land"), selected.land],
                      [t("customersThZip", "PLZ"), selected.plz],
                      [t("customersThCity", "Ort"), selected.ort],
                      [t("rechnungenThArt", "Art"), selected.art],
                      [t("rechnungenThBuchung", "Buchung"), selected.buchung],
                      [t("rechnungenThBezahltAm", "Bezahltam"), selected.bezahlt_am ? formatRDatum(selected.bezahlt_am) : "—"],
                      [t("rechnungenThBetrag", "Rechnungsbetrag"), formatRechnungsbetrag(selected.betrag_cent)],
                      [t("rechnungenLabelPositionsNr", "PositionsNr:"), selected.positions_nr],
                      [t("rechnungenLabelFgst", "FahrgestellNr:"), selected.fahrgestell_nr],
                      [t("rechnungenLabelVerkaufsNr", "VerkaufsNr:"), selected.verkaufs_nr],
                      [t("rechnungenLabelVermerk", "Vermerk:"), selected.vermerk || "—"],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-2">
                      <dt className="text-slate-500">{k}</dt>
                      <dd className="max-w-[60%] text-right font-medium text-slate-800">{v}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
