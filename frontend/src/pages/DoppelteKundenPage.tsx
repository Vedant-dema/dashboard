import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { loadKundenDb } from "../store/kundenStore";
import { listDoppelteKundenRowsForUi, type DoppelterKundeRow } from "../lib/doppelteKundenFromDb";
import { getCustomerFieldSuggestions } from "../store/customerFieldSuggestions";
import { SuggestTextInput } from "../components/SuggestTextInput";
import { useLanguage } from "../contexts/LanguageContext";
import type { DepartmentArea } from "../types/departmentArea";
import { DEPARTMENT_I18N_KEY } from "../types/departmentArea";

type DupSortKey = "telefonnummer" | "firmenname" | "ku_nr" | "termin" | "beziehung";

function matchesExcludedKiiKegKsl(
  r: DoppelterKundeRow,
  bfirma: string,
  exclude: boolean
): boolean {
  if (!exclude) return true;
  const re = /\b(KII|KEG|KSL)\b/i;
  return !re.test(r.branche) && !re.test(r.firmenname) && !re.test(bfirma);
}

function parseEntryDateMs(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const iso = Date.parse(t);
  if (!Number.isNaN(iso)) return iso;
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return d.getTime();
  }
  return null;
}

function inDateRange(aufnahme: string, von: string, bis: string): boolean {
  const ms = parseEntryDateMs(aufnahme);
  if (ms == null) return !von && !bis;
  const v = von ? parseEntryDateMs(von + "T00:00:00") : null;
  const b = bis ? parseEntryDateMs(bis + "T23:59:59") : null;
  if (v != null && !Number.isNaN(v) && ms < v) return false;
  if (b != null && !Number.isNaN(b) && ms > b) return false;
  return true;
}

export function DoppelteKundenPage({ department }: { department?: DepartmentArea }) {
  const { t } = useLanguage();
  const [db, setDb] = useState(() => loadKundenDb());
  const fieldSuggestions = useMemo(() => getCustomerFieldSuggestions(db), [db]);

  useEffect(() => {
    const onCh = () => setDb(loadKundenDb());
    window.addEventListener("dema-kunden-db-changed", onCh);
    return () => window.removeEventListener("dema-kunden-db-changed", onCh);
  }, []);

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [kundenNr, setKundenNr] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [ansprechpartner, setAnsprechpartner] = useState("");
  const [telefon, setTelefon] = useState("");
  const [fax, setFax] = useState("");
  const [branche, setBranche] = useState("");
  const [art, setArt] = useState("");
  const [nichtKiiKegKsl, setNichtKiiKegKsl] = useState(true);
  const [zpk, setZpk] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [land, setLand] = useState("");
  const [kundeMitVerkn, setKundeMitVerkn] = useState(false);
  const [aufnahmeVon, setAufnahmeVon] = useState("");
  const [aufnahmeBis, setAufnahmeBis] = useState("");
  const [sortierung, setSortierung] = useState<DupSortKey>("telefonnummer");

  const resetFilters = useCallback(() => {
    setKundenNr("");
    setFirmenname("");
    setAnsprechpartner("");
    setTelefon("");
    setFax("");
    setBranche("");
    setArt("");
    setNichtKiiKegKsl(true);
    setZpk("");
    setPlz("");
    setOrt("");
    setLand("");
    setKundeMitVerkn(false);
    setAufnahmeVon("");
    setAufnahmeBis("");
    setSortierung("telefonnummer");
  }, []);

  const refreshDb = useCallback(() => setDb(loadKundenDb()), []);

  const dupList = useMemo(() => listDoppelteKundenRowsForUi(db), [db]);
  const basis = dupList.rows;
  const isDemoFallback = dupList.isDemoFallback;

  const brancheOptions = useMemo(() => {
    const s = new Set<string>();
    for (const k of db.kunden) {
      if (k.branche?.trim()) s.add(k.branche.trim());
    }
    if (isDemoFallback) {
      for (const r of basis) {
        if (r.branche?.trim() && r.branche !== "—") s.add(r.branche.trim());
      }
    }
    return ["", ...[...s].sort((a, b) => a.localeCompare(b, "de"))];
  }, [db.kunden, basis, isDemoFallback]);

  const artOptions = useMemo(() => {
    const s = new Set<string>();
    for (const k of db.kunden) {
      if (k.art_kunde?.trim()) s.add(k.art_kunde.trim());
    }
    if (isDemoFallback) {
      for (const r of basis) {
        if (r.art?.trim() && r.art !== "—") s.add(r.art.trim());
      }
    }
    return ["", ...[...s].sort((a, b) => a.localeCompare(b, "de"))];
  }, [db.kunden, basis, isDemoFallback]);

  const zpkOptions = useMemo(() => {
    const s = new Set<string>();
    for (const k of db.kunden) {
      if (k.buchungskonto_haupt?.trim()) s.add(k.buchungskonto_haupt.trim());
    }
    if (isDemoFallback) {
      for (const r of basis) {
        if (r.zpk?.trim()) s.add(r.zpk.trim());
      }
    }
    return ["", ...[...s].sort((a, b) => a.localeCompare(b, "de"))];
  }, [db.kunden, basis, isDemoFallback]);

  const gefiltert = useMemo(() => {
    return basis.filter((r) => {
      if (kundeMitVerkn && !r.hauptHatVerkn) return false;
      if (
        kundenNr &&
        !r.ku_nr.includes(kundenNr.trim()) &&
        !r.bknr.includes(kundenNr.trim())
      )
        return false;
      const fn = firmenname.trim().toLowerCase();
      if (fn && !r.firmenname.toLowerCase().includes(fn) && !r.bfirma.toLowerCase().includes(fn))
        return false;
      const ap = ansprechpartner.trim().toLowerCase();
      if (ap && !r.ansprechpartner.toLowerCase().includes(ap)) return false;
      const tel = telefon.trim().toLowerCase();
      if (tel && !r.telefonnummer.toLowerCase().includes(tel)) return false;
      const fx = fax.trim().toLowerCase();
      if (fx && !r.faxnummer.toLowerCase().includes(fx)) return false;
      if (branche && r.branche !== branche) return false;
      if (art && r.art !== art) return false;
      if (!matchesExcludedKiiKegKsl(r, r.bfirma, nichtKiiKegKsl)) return false;
      if (zpk && !r.zpk.includes(zpk.trim())) return false;
      if (plz.trim() && !r.plz.includes(plz.trim())) return false;
      if (ort.trim() && !r.ort.toLowerCase().includes(ort.trim().toLowerCase())) return false;
      if (land.trim() && !r.land.toLowerCase().includes(land.trim().toLowerCase())) return false;
      if (!inDateRange(r.aufnahme_raw, aufnahmeVon, aufnahmeBis)) return false;
      return true;
    });
  }, [
    basis,
    kundeMitVerkn,
    kundenNr,
    firmenname,
    ansprechpartner,
    telefon,
    fax,
    branche,
    art,
    nichtKiiKegKsl,
    zpk,
    plz,
    ort,
    land,
    aufnahmeVon,
    aufnahmeBis,
  ]);

  const sortiert = useMemo(() => {
    const copy = [...gefiltert];
    copy.sort((a, b) => {
      const av = a[sortierung] ?? "";
      const bv = b[sortierung] ?? "";
      return String(av).localeCompare(String(bv), "de", { numeric: true });
    });
    return copy;
  }, [gefiltert, sortierung]);

  const inputFocus =
    "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500/20";

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          {t("dupCustomersPageTitle", "Doppelte Kunden")}
        </h1>
        {department ? (
          <p className="mt-0.5 text-sm text-slate-500">
            {t("customersArea", "Bereich")}:{" "}
            <span className="font-medium text-slate-600">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
          </p>
        ) : null}
      </div>

      <div className="glass-card mb-4 space-y-4 border-blue-100/80 p-4 shadow-blue-900/5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={refreshDb}
            className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            <Search className="h-4 w-4" />
            {t("dupCustomersShow", "Zeigen")}
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-800 hover:bg-blue-50"
          >
            {t("dupCustomersAll", "alle")}
          </button>
          <span className="text-xs text-slate-400">
            {t("dupCustomersFilterHint", "Filter wirken sofort auf die Ergebnisliste.")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-ku">
              {t("dupCustomersKundenNr", "KundenNr:")}
            </label>
            <SuggestTextInput
              id="df-ku"
              type="text"
              value={kundenNr}
              onChange={(e) => setKundenNr(e.target.value)}
              suggestions={fieldSuggestions.kunden_nr}
              title={t("customersSuggestionsSaved", "Vorschläge aus gespeicherten Kunden")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-fn">
              {t("dupCustomersFirma", "Firmenname:")}
            </label>
            <SuggestTextInput
              id="df-fn"
              type="text"
              value={firmenname}
              onChange={(e) => setFirmenname(e.target.value)}
              suggestions={fieldSuggestions.firmenname}
              title={t("customersSuggestionsSaved", "Vorschläge aus gespeicherten Kunden")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-ap">
              {t("dupCustomersAnsprech", "Ansprechpartner:")}
            </label>
            <SuggestTextInput
              id="df-ap"
              type="text"
              value={ansprechpartner}
              onChange={(e) => setAnsprechpartner(e.target.value)}
              suggestions={fieldSuggestions.ansprechpartner}
              title={t("customersSuggestionsSaved", "Vorschläge aus gespeicherten Kunden")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-tel">
              {t("dupCustomersTel", "Telefonnummer:")}
            </label>
            <SuggestTextInput
              id="df-tel"
              type="text"
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              suggestions={fieldSuggestions.telefonnummer}
              title={t("customersSuggestionsSaved", "Vorschläge aus gespeicherten Kunden")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-plz">
              {t("customersThZip", "PLZ:")}
            </label>
            <SuggestTextInput
              id="df-plz"
              type="text"
              value={plz}
              onChange={(e) => setPlz(e.target.value)}
              suggestions={fieldSuggestions.plz}
              title={t("customersSuggestionsSaved", "Vorschläge aus gespeicherten Kunden")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-ort">
              {t("customersThCity", "Ort:")}
            </label>
            <SuggestTextInput
              id="df-ort"
              type="text"
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
              suggestions={fieldSuggestions.ort}
              title={t("customersSuggestionsSaved", "Vorschläge aus gespeicherten Kunden")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-land">
              {t("customersThCountry", "Land:")}
            </label>
            <SuggestTextInput
              id="df-land"
              type="text"
              value={land}
              onChange={(e) => setLand(e.target.value)}
              placeholder="z. B. DE"
              suggestions={fieldSuggestions.land_code}
              title={t("customersSuggestionsSaved", "Vorschläge aus gespeicherten Kunden")}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-sort">
              {t("dupCustomersSort", "Sortierung:")}
            </label>
            <select
              id="df-sort"
              value={sortierung}
              onChange={(e) => setSortierung(e.target.value as DupSortKey)}
              className={inputFocus}
            >
              <option value="telefonnummer">{t("dupCustomersSortTel", "Telefonnummer")}</option>
              <option value="ku_nr">{t("customersSortKundenNr", "KundenNr")}</option>
              <option value="firmenname">{t("customersSortFirmenname", "Firmenname")}</option>
              <option value="termin">{t("customersSortTermin", "Termin")}</option>
              <option value="beziehung">{t("dupCustomersSortBez", "Beziehung")}</option>
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
                <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-fax">
                  {t("dupCustomersFax", "Faxnummer:")}
                </label>
                <SuggestTextInput
                  id="df-fax"
                  type="text"
                  value={fax}
                  onChange={(e) => setFax(e.target.value)}
                  suggestions={fieldSuggestions.faxnummer}
                  title={t("customersSuggestionsSaved", "Vorschläge aus gespeicherten Kunden")}
                  className={inputFocus}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-br">
                  {t("dupCustomersBranche", "Branche:")}
                </label>
                <select id="df-br" className={inputFocus} value={branche} onChange={(e) => setBranche(e.target.value)}>
                  {brancheOptions.map((o) => (
                    <option key={o || "all-br"} value={o}>
                      {o || "—"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-art">
                  {t("dupCustomersArt", "Art:")}
                </label>
                <select id="df-art" className={inputFocus} value={art} onChange={(e) => setArt(e.target.value)}>
                  {artOptions.map((o) => (
                    <option key={o || "all-art"} value={o}>
                      {o || "—"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-zpk">
                  {t("dupCustomersZpk", "ZPK:")}
                </label>
                <select id="df-zpk" className={inputFocus} value={zpk} onChange={(e) => setZpk(e.target.value)}>
                  {zpkOptions.map((o) => (
                    <option key={o || "all-zpk"} value={o}>
                      {o || "—"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-von">
                  {t("dupCustomersAufnahmeVon", "Aufnahme von")}
                </label>
                <input
                  id="df-von"
                  type="date"
                  value={aufnahmeVon}
                  onChange={(e) => setAufnahmeVon(e.target.value)}
                  className={inputFocus}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500" htmlFor="df-bis">
                  {t("dupCustomersAufnahmeBis", "Aufnahme bis")}
                </label>
                <input
                  id="df-bis"
                  type="date"
                  value={aufnahmeBis}
                  onChange={(e) => setAufnahmeBis(e.target.value)}
                  className={inputFocus}
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-2 md:col-span-4">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={nichtKiiKegKsl}
                    onChange={(e) => setNichtKiiKegKsl(e.target.checked)}
                  />
                  {t("dupCustomersNotKii", "nicht KII/KEG/KSL")}
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={kundeMitVerkn}
                    onChange={(e) => setKundeMitVerkn(e.target.checked)}
                  />
                  {t("dupCustomersMitVerkn", "Kunde mit Verkn.")}
                </label>
                <label
                  className="flex items-center gap-2 text-sm text-slate-400"
                  title={t("dupCustomersNaHint", "Legacy-Feld; Filter folgt bei Anbindung der Daten.")}
                >
                  <input type="checkbox" checked disabled className="rounded border-slate-300" />
                  {t("dupCustomersNaAnz", "Kunden NA anz.")}
                </label>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden border-blue-100/80 shadow-blue-900/5">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThKuNr", "KU-NR")}</th>
                <th className="px-4 py-3">{t("customersThCompany", "Firmenname")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThAppointment", "Termin")}</th>
                <th className="px-4 py-3">{t("customersThIndustry", "Branche")}</th>
                <th className="px-4 py-3">{t("customersThStreet", "Strasse")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThZip", "PLZ")}</th>
                <th className="px-4 py-3">{t("customersThCity", "Ort")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("customersThCountry", "Land")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("dupCustomersThTel", "Telefonnummer")}</th>
                <th className="w-10 px-2 py-3 text-center">{t("dupCustomersThT", "T")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("dupCustomersThZeichen", "Zeichen")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("dupCustomersThArt", "Art")}</th>
                <th className="w-14 px-2 py-3 text-center">{t("dupCustomersThMarkiert", "Markiert")}</th>
                <th className="whitespace-nowrap px-4 py-3">{t("dupCustomersThBKNR", "BKNr")}</th>
                <th className="px-4 py-3">{t("dupCustomersThBFirma", "BFirma")}</th>
                <th className="min-w-[140px] px-4 py-3">{t("dupCustomersThBez", "Beziehung")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortiert.length === 0 ? (
                <tr>
                  <td colSpan={16} className="px-4 py-12 text-center text-sm text-slate-500">
                    {t("dupCustomersEmptyFilter", "Keine Treffer mit diesen Filtern.")}
                  </td>
                </tr>
              ) : (
                sortiert.map((r, i) => (
                  <tr
                    key={`${r.id}-${i}`}
                    className={
                      i % 2 === 1 ? "bg-blue-50/50 text-slate-800" : "text-slate-800 hover:bg-slate-50"
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">{r.ku_nr}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5" title={r.firmenname}>
                      {r.firmenname}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{r.termin}</td>
                    <td className="px-4 py-2.5">{r.branche}</td>
                    <td className="max-w-[160px] truncate px-4 py-2.5" title={r.strasse}>
                      {r.strasse}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{r.plz}</td>
                    <td className="px-4 py-2.5">{r.ort}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{r.land}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{r.telefonnummer}</td>
                    <td className="px-2 py-2.5 text-center">{r.t}</td>
                    <td className="px-4 py-2.5">{r.zeichen}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{r.art}</td>
                    <td className="px-2 py-2.5 text-center text-slate-400">{r.markiert || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">{r.bknr}</td>
                    <td className="max-w-[200px] truncate px-4 py-2.5" title={r.bfirma}>
                      {r.bfirma}
                    </td>
                    <td className="px-4 py-2.5 text-xs leading-snug text-slate-700">{r.beziehung}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-blue-100 bg-blue-50/90 px-4 py-2.5 text-right text-sm text-slate-700">
          {t("dupCustomersCount", "Anz. der Ausschl:")}{" "}
          <span className="font-semibold tabular-nums text-blue-900">{sortiert.length}</span>
        </div>
      </div>
    </div>
  );
}
