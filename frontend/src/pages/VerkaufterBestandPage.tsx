import { useState, useMemo, useCallback } from "react";
import { Search, ChevronDown, ChevronUp, X } from "lucide-react";
import type { VerkaufterBestandRow } from "../types/verkaufterBestand";
import { loadVerkaufterBestandDb } from "../store/verkaufterBestandStore";
import { SuggestTextInput } from "../components/SuggestTextInput";
import { useLanguage } from "../contexts/LanguageContext";
import type { DepartmentArea } from "../types/departmentArea";
import { DEPARTMENT_I18N_KEY } from "../types/departmentArea";

const SORT_OPTIONS = [
  "Verkaufsdatum",
  "Kaufdatum",
  "Position",
  "Firmenname",
  "Fabrikat",
  "Einkäufer",
] as const;

const FAHRZEUGART_OPTIONS = ["", "LKW", "PKW", "Anhänger", "Auflieger", "Wechselbrücke", "Sonstige"];
const AUFBAU_OPTIONS = ["", "SZM", "Pritsche", "Kastenwagen", "Koffer", "Kipper", "Plane", "Silo", "Sonstige"];

type FlagKey = keyof Pick<
  VerkaufterBestandRow,
  | "fehlende_kosten"
  | "kein_abholer"
  | "kein_kaeufer"
  | "keine_erstkontrolle"
  | "kein_auftrag_erteilt"
  | "auftrag_erledigt"
  | "reinigung_offen"
  | "offene_auftraege"
  | "kein_eingang"
  | "verkauf_check"
  | "abgeholt"
  | "bh_check"
>;

const FLAG_FILTERS: { key: FlagKey; label: string; warn?: boolean }[] = [
  { key: "fehlende_kosten", label: "Fehlende Kosten" },
  { key: "kein_abholer", label: "kein Abholer" },
  { key: "kein_kaeufer", label: "kein Käufer" },
  { key: "keine_erstkontrolle", label: "keine Erstkontrolle" },
  { key: "kein_auftrag_erteilt", label: "kein Auftrag erteilt", warn: true },
  { key: "auftrag_erledigt", label: "Auftrag erledigt" },
  { key: "reinigung_offen", label: "Reinigung offen" },
  { key: "offene_auftraege", label: "offene Aufträge" },
  { key: "kein_eingang", label: "kein Eingang" },
  { key: "verkauf_check", label: "Verkauf Check" },
  { key: "abgeholt", label: "Abgeholt" },
  { key: "bh_check", label: "BH Check" },
];

function parseDeDate(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const d = Date.parse(t);
  return Number.isNaN(d) ? null : d;
}

function formatDeDate(iso: string): string {
  if (!iso) return "—";
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return new Date(d).toLocaleDateString("de-DE");
}

function matchesEzFilter(rowEz: string, filterEz: string): boolean {
  const f = filterEz.trim().toLowerCase();
  if (!f) return true;
  const r = (rowEz || "").toLowerCase();
  return r.includes(f) || r.replace(/-/g, ".").includes(f);
}

export function VerkaufterBestandPage({ department }: { department?: DepartmentArea }) {
  const { t } = useLanguage();
  const [db] = useState(() => loadVerkaufterBestandDb());

  const [showMoreFilters, setShowMoreFilters] = useState(true);
  const [positionsNr, setPositionsNr] = useState("");
  const [linkaeufer, setLinkaeufer] = useState("");
  const [beteiligter, setBeteiligter] = useState("");
  const [verkaeufer, setVerkaeufer] = useState("");
  const [verkaufVon, setVerkaufVon] = useState("");
  const [verkaufBis, setVerkaufBis] = useState("");
  const [kaufVon, setKaufVon] = useState("");
  const [kaufBis, setKaufBis] = useState("");
  const [fahrzeugart, setFahrzeugart] = useState("");
  const [aufbauart, setAufbauart] = useState("");
  const [fabrikat, setFabrikat] = useState("");
  const [modellTyp, setModellTyp] = useState("");
  const [ezFilter, setEzFilter] = useState("");
  const [fahrgestell, setFahrgestell] = useState("");
  const [extras, setExtras] = useState("");
  const [telefon, setTelefon] = useState("");
  const [debitorNr, setDebitorNr] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [plz, setPlz] = useState("");
  const [ort, setOrt] = useState("");
  const [land, setLand] = useState("");
  const [importVerkaufsNr, setImportVerkaufsNr] = useState("");
  const [sortierung, setSortierung] = useState<string>(SORT_OPTIONS[0]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [flagFilters, setFlagFilters] = useState<Partial<Record<FlagKey, boolean>>>({});

  const setFlag = useCallback((key: FlagKey, value: boolean) => {
    setFlagFilters((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = true;
      return next;
    });
  }, []);

  const suggestions = useMemo(() => {
    const fb = new Set<string>();
    const pos = new Set<string>();
    for (const r of db.rows) {
      if (r.fabrikat) fb.add(r.fabrikat);
      if (r.position_anzeige) pos.add(r.position_anzeige);
    }
    return { fabrikat: [...fb].sort(), position: [...pos].sort() };
  }, [db.rows]);

  const filtered = useMemo(() => {
    let list: VerkaufterBestandRow[] = [...db.rows];

    if (positionsNr.trim()) {
      const q = positionsNr.trim();
      list = list.filter((r) => r.position_anzeige.includes(q));
    }
    if (linkaeufer.trim()) {
      const q = linkaeufer.toLowerCase();
      list = list.filter((r) => (r.linkaeufer || "").toLowerCase().includes(q));
    }
    if (beteiligter.trim()) {
      const q = beteiligter.toLowerCase();
      list = list.filter((r) => (r.beteiligter || "").toLowerCase().includes(q));
    }
    if (verkaeufer.trim()) {
      const q = verkaeufer.toLowerCase();
      list = list.filter((r) => (r.verkaeufer || "").toLowerCase().includes(q));
    }

    const vv = parseDeDate(verkaufVon);
    const vb = parseDeDate(verkaufBis);
    if (vv != null) list = list.filter((r) => Date.parse(r.verkauf_datum) >= vv);
    if (vb != null) list = list.filter((r) => Date.parse(r.verkauf_datum) <= vb);

    const kv = parseDeDate(kaufVon);
    const kb = parseDeDate(kaufBis);
    if (kv != null) list = list.filter((r) => Date.parse(r.kauf_datum) >= kv);
    if (kb != null) list = list.filter((r) => Date.parse(r.kauf_datum) <= kb);

    if (fahrzeugart) list = list.filter((r) => r.fahrzeugart === fahrzeugart);
    if (aufbauart) list = list.filter((r) => r.aufbauart === aufbauart);
    if (fabrikat.trim()) {
      const f = fabrikat.toLowerCase();
      list = list.filter((r) => r.fabrikat.toLowerCase().includes(f));
    }
    if (modellTyp.trim()) {
      const m = modellTyp.toLowerCase();
      list = list.filter((r) => r.typ.toLowerCase().includes(m));
    }
    if (ezFilter.trim()) list = list.filter((r) => matchesEzFilter(r.ez, ezFilter));
    if (fahrgestell.trim()) {
      const f = fahrgestell.toLowerCase();
      list = list.filter((r) => r.fahrgestellnummer.toLowerCase().includes(f));
    }
    if (extras.trim()) {
      const e = extras.toLowerCase();
      list = list.filter((r) => (r.extras || "").toLowerCase().includes(e));
    }
    if (telefon.trim()) {
      const t = telefon.toLowerCase();
      list = list.filter((r) => (r.telefonnummer || "").toLowerCase().includes(t));
    }
    if (debitorNr.trim()) list = list.filter((r) => r.debitor_nr.includes(debitorNr.trim()));
    if (firmenname.trim()) {
      const fn = firmenname.toLowerCase();
      list = list.filter((r) => r.firmenname.toLowerCase().includes(fn));
    }
    if (plz.trim()) list = list.filter((r) => r.plz.includes(plz.trim()));
    if (ort.trim()) list = list.filter((r) => r.ort.toLowerCase().includes(ort.trim().toLowerCase()));
    if (land.trim()) list = list.filter((r) => r.land.toLowerCase().includes(land.trim().toLowerCase()));
    if (importVerkaufsNr.trim()) {
      const im = importVerkaufsNr.toLowerCase();
      list = list.filter((r) => (r.import_verkaufs_nr || "").toLowerCase().includes(im));
    }

    (Object.entries(flagFilters) as [FlagKey, boolean][]).forEach(([key, on]) => {
      if (on) list = list.filter((r) => r[key] === true);
    });

    const cmp = (a: VerkaufterBestandRow, b: VerkaufterBestandRow) => {
      switch (sortierung) {
        case "Kaufdatum":
          return b.kauf_datum.localeCompare(a.kauf_datum);
        case "Position":
          return parseInt(b.position_anzeige, 10) - parseInt(a.position_anzeige, 10);
        case "Firmenname":
          return a.firmenname.localeCompare(b.firmenname);
        case "Fabrikat":
          return a.fabrikat.localeCompare(b.fabrikat);
        case "Einkäufer":
          return a.einkaeufer.localeCompare(b.einkaeufer);
        default:
          return b.verkauf_datum.localeCompare(a.verkauf_datum);
      }
    };
    list.sort(cmp);
    return list;
  }, [
    db.rows,
    positionsNr,
    linkaeufer,
    beteiligter,
    verkaeufer,
    verkaufVon,
    verkaufBis,
    kaufVon,
    kaufBis,
    fahrzeugart,
    aufbauart,
    fabrikat,
    modellTyp,
    ezFilter,
    fahrgestell,
    extras,
    telefon,
    debitorNr,
    firmenname,
    plz,
    ort,
    land,
    importVerkaufsNr,
    flagFilters,
    sortierung,
  ]);

  const showAll = () => {
    setPositionsNr("");
    setLinkaeufer("");
    setBeteiligter("");
    setVerkaeufer("");
    setVerkaufVon("");
    setVerkaufBis("");
    setKaufVon("");
    setKaufBis("");
    setFahrzeugart("");
    setAufbauart("");
    setFabrikat("");
    setModellTyp("");
    setEzFilter("");
    setFahrgestell("");
    setExtras("");
    setTelefon("");
    setDebitorNr("");
    setFirmenname("");
    setPlz("");
    setOrt("");
    setLand("");
    setImportVerkaufsNr("");
    setFlagFilters({});
  };

  const selected = selectedId != null ? db.rows.find((r) => r.id === selectedId) : null;

  const inputFocus =
    "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500/20";

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          {t("sidebarSoldInventory", "Verkaufter Bestand")}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {t("verkaufterBestandSubtitle", "Suche verkaufter Bestand — Filter und Spalten wie im Legacy-System.")}
          {department ? (
            <>
              {" "}
              {t("customersArea", "Area")}:{" "}
              <span className="font-medium text-slate-600">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="glass-card mb-4 space-y-4 border-emerald-100/80 p-4 shadow-emerald-900/5">
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
            className="rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
          >
            alle
          </button>
          <span className="text-xs text-slate-400">Filter wirken sofort auf die Ergebnisliste.</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">PositionsNr</label>
            <SuggestTextInput
              type="text"
              value={positionsNr}
              onChange={(e) => setPositionsNr(e.target.value)}
              suggestions={suggestions.position}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Linkäufer</label>
            <input
              type="text"
              value={linkaeufer}
              onChange={(e) => setLinkaeufer(e.target.value)}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Beteiligter</label>
            <input
              type="text"
              value={beteiligter}
              onChange={(e) => setBeteiligter(e.target.value)}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Verkäufer</label>
            <input
              type="text"
              value={verkaeufer}
              onChange={(e) => setVerkaeufer(e.target.value)}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">von Verkaufsdatum</label>
            <input type="date" value={verkaufVon} onChange={(e) => setVerkaufVon(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">bis Verkaufsdatum</label>
            <input type="date" value={verkaufBis} onChange={(e) => setVerkaufBis(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">von Kaufdatum</label>
            <input type="date" value={kaufVon} onChange={(e) => setKaufVon(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">bis Kaufdatum</label>
            <input type="date" value={kaufBis} onChange={(e) => setKaufBis(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fahrzeugart</label>
            <select value={fahrzeugart} onChange={(e) => setFahrzeugart(e.target.value)} className={inputFocus}>
              {FAHRZEUGART_OPTIONS.map((o) => (
                <option key={o || "a"} value={o}>
                  {o || "Alle"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">AufbauArt</label>
            <select value={aufbauart} onChange={(e) => setAufbauart(e.target.value)} className={inputFocus}>
              {AUFBAU_OPTIONS.map((o) => (
                <option key={o || "a"} value={o}>
                  {o || "Alle"}
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
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Modell, Typ</label>
            <input type="text" value={modellTyp} onChange={(e) => setModellTyp(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">EZ (MM, JJJJ)</label>
            <input
              type="text"
              value={ezFilter}
              onChange={(e) => setEzFilter(e.target.value)}
              placeholder="z. B. 2018-06"
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fahrgestellnummer</label>
            <input type="text" value={fahrgestell} onChange={(e) => setFahrgestell(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Extras</label>
            <input type="text" value={extras} onChange={(e) => setExtras(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Telefonnummer</label>
            <input type="text" value={telefon} onChange={(e) => setTelefon(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">DebitorNr</label>
            <input type="text" value={debitorNr} onChange={(e) => setDebitorNr(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Firmenname</label>
            <input type="text" value={firmenname} onChange={(e) => setFirmenname(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">PLZ</label>
            <input type="text" value={plz} onChange={(e) => setPlz(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Ort</label>
            <input type="text" value={ort} onChange={(e) => setOrt(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Land</label>
            <input type="text" value={land} onChange={(e) => setLand(e.target.value)} className={inputFocus} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">ImportNr / VerkaufsNr</label>
            <input
              type="text"
              value={importVerkaufsNr}
              onChange={(e) => setImportVerkaufsNr(e.target.value)}
              className={inputFocus}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Sortierung</label>
            <select value={sortierung} onChange={(e) => setSortierung(e.target.value)} className={inputFocus}>
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-700"
          >
            {showMoreFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Status-Filter
          </button>
          {showMoreFilters && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
              {FLAG_FILTERS.map(({ key, label, warn }) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm ${
                    warn
                      ? "border-amber-200 bg-amber-50/80 text-amber-950"
                      : "border-slate-200 bg-slate-50/80 text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(flagFilters[key])}
                    onChange={(e) => setFlag(key, e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden border-emerald-100/60 shadow-emerald-900/5">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1400px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-emerald-50 font-semibold text-emerald-900">
              <tr>
                <th className="whitespace-nowrap px-2 py-3">Position</th>
                <th className="whitespace-nowrap px-2 py-3">Verkauf</th>
                <th className="whitespace-nowrap px-2 py-3">Kauf</th>
                <th className="whitespace-nowrap px-2 py-3">Fahrzeugart</th>
                <th className="whitespace-nowrap px-2 py-3">Fabrikat</th>
                <th className="whitespace-nowrap px-2 py-3">Typ</th>
                <th className="whitespace-nowrap px-2 py-3">AufbauArt</th>
                <th className="whitespace-nowrap px-2 py-3">EZ</th>
                <th className="whitespace-nowrap px-2 py-3">Fahrgestell</th>
                <th className="whitespace-nowrap px-2 py-3">DebitorNr</th>
                <th className="whitespace-nowrap px-2 py-3">Firmenname</th>
                <th className="whitespace-nowrap px-2 py-3">PLZ</th>
                <th className="whitespace-nowrap px-2 py-3">Ort</th>
                <th className="whitespace-nowrap px-2 py-3">Land</th>
                <th className="whitespace-nowrap px-2 py-3">Einkäufer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-4 py-12 text-center text-sm text-slate-500">
                    Keine Treffer. Filter mit „alle“ zurücksetzen.
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer transition ${
                      selectedId === row.id
                        ? "bg-emerald-900 text-white"
                        : i % 2 === 1
                          ? "bg-emerald-50/40 text-slate-800 hover:bg-emerald-50/80"
                          : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <td className="whitespace-nowrap px-2 py-2 font-medium tabular-nums">{row.position_anzeige}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatDeDate(row.verkauf_datum)}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatDeDate(row.kauf_datum)}</td>
                    <td className="whitespace-nowrap px-2 py-2">{row.fahrzeugart}</td>
                    <td className="whitespace-nowrap px-2 py-2">{row.fabrikat}</td>
                    <td className="max-w-[140px] truncate px-2 py-2" title={row.typ}>
                      {row.typ}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{row.aufbauart}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.ez || "—"}</td>
                    <td className="max-w-[160px] truncate px-2 py-2 font-mono text-xs" title={row.fahrgestellnummer}>
                      {row.fahrgestellnummer}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.debitor_nr}</td>
                    <td className="max-w-[180px] truncate px-2 py-2" title={row.firmenname}>
                      {row.firmenname}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.plz}</td>
                    <td className="whitespace-nowrap px-2 py-2">{row.ort}</td>
                    <td className="whitespace-nowrap px-2 py-2">{row.land}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium">{row.einkaeufer}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-emerald-100 bg-emerald-50/90 px-4 py-2.5 text-right text-sm text-slate-700">
          {t("verkaufterBestandCount", "Anzahl der ausgewählten Fahrzeuge:")}{" "}
          <span className="font-semibold tabular-nums text-emerald-900">{filtered.length}</span>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => setSelectedId(null)}
          role="presentation"
        >
          <div
            className="flex h-full w-full max-w-md shrink-0 flex-col border-l border-emerald-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="vb-drawer-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-emerald-100 bg-emerald-50/50 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-800">Position</p>
                <h2 id="vb-drawer-title" className="truncate text-xl font-bold text-slate-800">
                  {selected.position_anzeige}
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  {selected.fabrikat} · {selected.fahrgestellnummer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="shrink-0 rounded-xl p-2 text-slate-500 hover:bg-white"
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 text-sm">
              <dl className="space-y-2">
                {(
                  [
                    ["Verkäufer", selected.verkaeufer || "—"],
                    ["Linkäufer", selected.linkaeufer || "—"],
                    ["Beteiligter", selected.beteiligter || "—"],
                    ["Telefon", selected.telefonnummer || "—"],
                    ["Extras", selected.extras || "—"],
                    ["Import/Verkaufs-Nr.", selected.import_verkaufs_nr || "—"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-slate-100 py-1.5">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="max-w-[60%] text-right font-medium text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs font-semibold uppercase text-slate-500">Status-Markierungen</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {FLAG_FILTERS.filter(({ key }) => selected[key]).map(({ label }) => (
                  <li key={label} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">
                    {label}
                  </li>
                ))}
              </ul>
              {!FLAG_FILTERS.some(({ key }) => selected[key]) ? (
                <p className="mt-1 text-xs text-slate-400">Keine gesetzten Status-Flags in der Demo.</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
