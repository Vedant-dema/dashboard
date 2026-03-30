import { useState, useMemo, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { AbholauftragRow } from "../types/abholauftraege";
import { combinedMatch } from "../lib/globalSearchMatch";
import { loadAbholauftraegeDb } from "../store/abholauftraegeStore";
import { SuggestTextInput } from "../components/SuggestTextInput";
import { useLanguage } from "../contexts/LanguageContext";
import type { DepartmentArea } from "../types/departmentArea";
import { DEPARTMENT_I18N_KEY } from "../types/departmentArea";

const SORT_OPTIONS = ["Abholbereit", "Erstellt", "Kunde", "Fabrikat", "Fahrzeugart"] as const;

const FAHRZEUGART_OPTIONS = ["", "LKW", "Anhänger", "Auflieger", "PAKET", "Stapler", "Sonstige"];

const ERLEDIGT_FILTER = ["", "nein", "ja"] as const;

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

function erledigtLabel(done: boolean): string {
  return done ? "Ja" : "Nein";
}

export function AbholauftraegePage({ department }: { department?: DepartmentArea }) {
  const { t } = useLanguage();
  const [db] = useState(() => loadAbholauftraegeDb());

  const [fahrgestellSuche, setFahrgestellSuche] = useState("");
  const [erledigt, setErledigt] = useState<string>("");
  const [erstelltVon, setErstelltVon] = useState("");
  const [erstelltBis, setErstelltBis] = useState("");
  const [abholVon, setAbholVon] = useState("");
  const [abholBis, setAbholBis] = useState("");
  const [kundeFilter, setKundeFilter] = useState("");
  const [fahrzeugart, setFahrzeugart] = useState("");
  const [fabrikat, setFabrikat] = useState("");
  const [typFilter, setTypFilter] = useState("");
  const [sortierung, setSortierung] = useState<string>(SORT_OPTIONS[0]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [globalHeaderSearch, setGlobalHeaderSearch] = useState("");

  useEffect(() => {
    const q = sessionStorage.getItem("dema-search-q-abhol");
    if (q) {
      setGlobalHeaderSearch(q);
      sessionStorage.removeItem("dema-search-q-abhol");
    }
  }, []);

  const suggestions = useMemo(() => {
    const fin = new Set<string>();
    const fb = new Set<string>();
    for (const r of db.rows) {
      if (r.fahrgestellnummer) fin.add(r.fahrgestellnummer);
      if (r.fahrgestellnummer_2) fin.add(r.fahrgestellnummer_2);
      if (r.fabrikat) fb.add(r.fabrikat);
    }
    return { fin: [...fin].sort(), fabrikat: [...fb].sort() };
  }, [db.rows]);

  const filtered = useMemo(() => {
    let list: AbholauftragRow[] = [...db.rows];

    if (globalHeaderSearch.trim()) {
      const raw = globalHeaderSearch.trim();
      list = list.filter((r) =>
        combinedMatch(
          raw,
          [
            r.kunde_anzeige,
            r.fahrgestellnummer,
            r.fahrgestellnummer_2,
            r.fabrikat,
            r.typ,
            r.fahrzeugart,
            r.aufbauart,
          ],
          [r.fahrgestellnummer, r.fahrgestellnummer_2]
        )
      );
    }

    if (fahrgestellSuche.trim()) {
      const q = fahrgestellSuche.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.fahrgestellnummer.toLowerCase().includes(q) ||
          (r.fahrgestellnummer_2 || "").toLowerCase().includes(q)
      );
    }
    if (erledigt === "ja") list = list.filter((r) => r.erledigt);
    if (erledigt === "nein") list = list.filter((r) => !r.erledigt);

    const ev = parseDeDate(erstelltVon);
    const eb = parseDeDate(erstelltBis);
    if (ev != null) list = list.filter((r) => Date.parse(r.erstellt_datum) >= ev);
    if (eb != null) list = list.filter((r) => Date.parse(r.erstellt_datum) <= eb);

    const av = parseDeDate(abholVon);
    const ab = parseDeDate(abholBis);
    if (av != null) list = list.filter((r) => Date.parse(r.abholbereit_datum) >= av);
    if (ab != null) list = list.filter((r) => Date.parse(r.abholbereit_datum) <= ab);

    if (kundeFilter.trim()) {
      const k = kundeFilter.toLowerCase();
      list = list.filter((r) => r.kunde_anzeige.toLowerCase().includes(k));
    }
    if (fahrzeugart) list = list.filter((r) => r.fahrzeugart === fahrzeugart);
    if (fabrikat.trim()) {
      const f = fabrikat.toLowerCase();
      list = list.filter((r) => r.fabrikat.toLowerCase().includes(f));
    }
    if (typFilter.trim()) {
      const tf = typFilter.toLowerCase();
      list = list.filter((r) => r.typ.toLowerCase().includes(tf));
    }

    const cmp = (a: AbholauftragRow, b: AbholauftragRow) => {
      switch (sortierung) {
        case "Erstellt":
          return b.erstellt_datum.localeCompare(a.erstellt_datum);
        case "Kunde":
          return a.kunde_anzeige.localeCompare(b.kunde_anzeige);
        case "Fabrikat":
          return a.fabrikat.localeCompare(b.fabrikat);
        case "Fahrzeugart":
          return a.fahrzeugart.localeCompare(b.fahrzeugart);
        default:
          return a.abholbereit_datum.localeCompare(b.abholbereit_datum);
      }
    };
    list.sort(cmp);
    return list;
  }, [
    db.rows,
    globalHeaderSearch,
    fahrgestellSuche,
    erledigt,
    erstelltVon,
    erstelltBis,
    abholVon,
    abholBis,
    kundeFilter,
    fahrzeugart,
    fabrikat,
    typFilter,
    sortierung,
  ]);

  const showAll = () => {
    setFahrgestellSuche("");
    setErledigt("");
    setErstelltVon("");
    setErstelltBis("");
    setAbholVon("");
    setAbholBis("");
    setKundeFilter("");
    setFahrzeugart("");
    setFabrikat("");
    setTypFilter("");
  };

  const selected = selectedId != null ? db.rows.find((r) => r.id === selectedId) : null;

  const inputCls =
    "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/20";

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          {t("sidebarPickupOrders", "Abholaufträge")}
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {t(
            "abholauftraegeSubtitle",
            "Abholliste — Suche nach Fahrgestellnummer und Filter wie im Legacy-System."
          )}
          {department ? (
            <>
              {" "}
              {t("customersArea", "Area")}:{" "}
              <span className="font-medium text-slate-600">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="glass-card mb-4 space-y-4 border-indigo-100/80 p-4 shadow-indigo-900/5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[min(100%,20rem)] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-indigo-900/80">
              {t("abholauftraegeVinSearch", "Fahrgestellnummer suchen")}
            </label>
            <SuggestTextInput
              type="text"
              value={fahrgestellSuche}
              onChange={(e) => setFahrgestellSuche(e.target.value)}
              suggestions={suggestions.fin}
              placeholder="VIN / FIN eingeben…"
              className={`${inputCls} h-10`}
            />
          </div>
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
            className="rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-medium text-indigo-900 hover:bg-indigo-50"
          >
            alle
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Erledigt</label>
            <select value={erledigt} onChange={(e) => setErledigt(e.target.value)} className={inputCls}>
              {ERLEDIGT_FILTER.map((v) => (
                <option key={v || "all"} value={v}>
                  {v === "ja" ? "Ja" : v === "nein" ? "Nein" : "Alle"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Erstellt von</label>
            <input type="date" value={erstelltVon} onChange={(e) => setErstelltVon(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Erstellt bis</label>
            <input type="date" value={erstelltBis} onChange={(e) => setErstelltBis(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Abholbereit von</label>
            <input type="date" value={abholVon} onChange={(e) => setAbholVon(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Abholbereit bis</label>
            <input type="date" value={abholBis} onChange={(e) => setAbholBis(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500">Kunde (enthält)</label>
            <input
              type="text"
              value={kundeFilter}
              onChange={(e) => setKundeFilter(e.target.value)}
              className={inputCls}
              placeholder="PLZ, Ort, Firma…"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fahrzeugart</label>
            <select value={fahrzeugart} onChange={(e) => setFahrzeugart(e.target.value)} className={inputCls}>
              {FAHRZEUGART_OPTIONS.map((o) => (
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
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Typ</label>
            <input type="text" value={typFilter} onChange={(e) => setTypFilter(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Sortierung</label>
            <select value={sortierung} onChange={(e) => setSortierung(e.target.value)} className={inputCls}>
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden border-indigo-100/60 shadow-indigo-900/5">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-indigo-50 font-semibold text-indigo-950">
              <tr>
                <th className="whitespace-nowrap px-2 py-3">Erledigt</th>
                <th className="whitespace-nowrap px-2 py-3">Erstellt</th>
                <th className="whitespace-nowrap px-2 py-3">Abholbereit</th>
                <th className="min-w-[220px] px-2 py-3">Kunde</th>
                <th className="whitespace-nowrap px-2 py-3">Fahrzeugart</th>
                <th className="whitespace-nowrap px-2 py-3">Fabrikat</th>
                <th className="whitespace-nowrap px-2 py-3">Typ</th>
                <th className="whitespace-nowrap px-2 py-3">AufbauArt</th>
                <th className="whitespace-nowrap px-2 py-3">Fahrgestellnummer</th>
                <th className="whitespace-nowrap px-2 py-3">Fahrgestellnummer2</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                    Keine Abholaufträge. Filter mit „alle“ zurücksetzen.
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer transition ${
                      selectedId === row.id
                        ? "bg-indigo-900 text-white"
                        : i % 2 === 1
                          ? "bg-indigo-50/35 text-slate-800 hover:bg-indigo-50/70"
                          : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <td className="whitespace-nowrap px-2 py-2 font-medium">{erledigtLabel(row.erledigt)}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatDeDate(row.erstellt_datum)}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{formatDeDate(row.abholbereit_datum)}</td>
                    <td className="max-w-md px-2 py-2 text-xs leading-snug" title={row.kunde_anzeige}>
                      {row.kunde_anzeige}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{row.fahrzeugart}</td>
                    <td className="whitespace-nowrap px-2 py-2">{row.fabrikat}</td>
                    <td className="max-w-[120px] truncate px-2 py-2" title={row.typ}>
                      {row.typ}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{row.aufbauart}</td>
                    <td className="max-w-[180px] truncate px-2 py-2 font-mono text-xs" title={row.fahrgestellnummer}>
                      {row.fahrgestellnummer}
                    </td>
                    <td className="max-w-[140px] truncate px-2 py-2 font-mono text-xs" title={row.fahrgestellnummer_2 || ""}>
                      {row.fahrgestellnummer_2 || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-indigo-100 bg-indigo-50/90 px-4 py-2.5 text-right text-sm text-slate-700">
          {t("abholauftraegeCount", "Anzahl Aufträge:")}{" "}
          <span className="font-semibold tabular-nums text-indigo-900">{filtered.length}</span>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => setSelectedId(null)}
          role="presentation"
        >
          <div
            className="flex h-full w-full max-w-lg shrink-0 flex-col border-l border-indigo-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="abhol-drawer-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-indigo-100 bg-indigo-50/50 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-800">Abholauftrag</p>
                <h2 id="abhol-drawer-title" className="truncate font-mono text-lg font-bold text-slate-800">
                  {selected.fahrgestellnummer}
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  {selected.fabrikat} {selected.typ} · {erledigtLabel(selected.erledigt)}
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
              <dl className="space-y-3">
                {(
                  [
                    ["Erstellt", formatDeDate(selected.erstellt_datum)],
                    ["Abholbereit", formatDeDate(selected.abholbereit_datum)],
                    ["Kunde", selected.kunde_anzeige],
                    ["Fahrzeugart", selected.fahrzeugart],
                    ["AufbauArt", selected.aufbauart],
                    ["FIN 2", selected.fahrgestellnummer_2 || "—"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="border-b border-slate-100 pb-2">
                    <dt className="text-xs font-semibold text-slate-500">{k}</dt>
                    <dd className="mt-0.5 font-medium text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
