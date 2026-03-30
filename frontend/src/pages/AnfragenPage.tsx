import { useState, useMemo, useEffect } from "react";
import { Search, Plus, X } from "lucide-react";
import type { AnfrageStamm } from "../types/anfragen";
import { loadAnfragenDb, saveAnfragenDb, createAnfrage, previewNextAnfrageNr } from "../store/anfragenStore";
import { SuggestTextInput } from "../components/SuggestTextInput";
import { NewAnfrageModal } from "../components/NewAnfrageModal";
import { useLanguage } from "../contexts/LanguageContext";
import type { DepartmentArea } from "../types/departmentArea";
import { DEPARTMENT_I18N_KEY } from "../types/departmentArea";

const SORT_OPTIONS = [
  "Anfragedatum",
  "Anfrage-ID",
  "max Preis",
  "Firmenname",
  "Fabrikat",
  "SB",
] as const;

const FAHRZEUGART_OPTIONS = ["", "LKW", "PKW", "Auflieger", "Transporter", "Sonstige"];
const AUFBAU_OPTIONS = ["", "SZM", "Silo", "Kipper", "Koffer", "Viehtransporter", "Betonmischer", "Sonstige"];

const BEARBEITER_FILTER = [
  "",
  "es",
  "tk",
  "sf",
  "la",
];

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

function formatDeDate(iso: string): string {
  const d = Date.parse(iso);
  if (Number.isNaN(d)) return iso;
  return new Date(d).toLocaleDateString("de-DE");
}

export function AnfragenPage({ department }: { department?: DepartmentArea }) {
  const { t } = useLanguage();
  const [db, setDb] = useState(() => loadAnfragenDb());
  const [anfrageId, setAnfrageId] = useState("");
  const [bearbeiter, setBearbeiter] = useState("");
  const [datumVon, setDatumVon] = useState("");
  const [datumBis, setDatumBis] = useState("");
  const [fahrzeugart, setFahrzeugart] = useState("");
  const [aufbauart, setAufbauart] = useState("");
  const [fabrikat, setFabrikat] = useState("");
  const [modellTyp, setModellTyp] = useState("");
  const [extrasFilter, setExtrasFilter] = useState("");
  const [debitorNr, setDebitorNr] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [sortierung, setSortierung] = useState<string>(SORT_OPTIONS[0]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    const q = sessionStorage.getItem("dema-search-q-anfragen");
    if (q) {
      setFirmenname(q);
      sessionStorage.removeItem("dema-search-q-anfragen");
    }
  }, []);

  const suggestions = useMemo(() => {
    const fb = new Set<string>();
    for (const r of db.anfragen) {
      if (r.fabrikat) fb.add(r.fabrikat);
    }
    return {
      fabrikat: [...fb].sort(),
      anfrage_nr: db.anfragen.map((r) => r.anfrage_nr),
    };
  }, [db.anfragen]);

  const filtered = useMemo(() => {
    let list: AnfrageStamm[] = [...db.anfragen];

    if (anfrageId.trim()) {
      const q = anfrageId.trim().toLowerCase();
      list = list.filter((r) => r.anfrage_nr.toLowerCase().includes(q));
    }
    if (bearbeiter) list = list.filter((r) => r.bearbeiter_sb === bearbeiter);

    const dv = parseDeDate(datumVon);
    const db_ = parseDeDate(datumBis);
    if (dv != null) list = list.filter((r) => Date.parse(r.anfrage_datum) >= dv);
    if (db_ != null) list = list.filter((r) => Date.parse(r.anfrage_datum) <= db_);

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
    if (extrasFilter.trim()) {
      const e = extrasFilter.toLowerCase();
      list = list.filter((r) => r.extras.toLowerCase().includes(e));
    }
    if (debitorNr.trim()) list = list.filter((r) => r.debitor_nr.includes(debitorNr.trim()));
    if (firmenname.trim()) {
      const fn = firmenname.toLowerCase();
      list = list.filter((r) => r.firmenname.toLowerCase().includes(fn));
    }

    const cmp = (a: AnfrageStamm, b: AnfrageStamm) => {
      switch (sortierung) {
        case "Anfrage-ID":
          return (parseInt(b.anfrage_nr, 10) || 0) - (parseInt(a.anfrage_nr, 10) || 0);
        case "max Preis":
          return b.max_preis - a.max_preis;
        case "Firmenname":
          return a.firmenname.localeCompare(b.firmenname);
        case "Fabrikat":
          return a.fabrikat.localeCompare(b.fabrikat);
        case "SB":
          return a.bearbeiter_sb.localeCompare(b.bearbeiter_sb);
        default:
          return b.anfrage_datum.localeCompare(a.anfrage_datum);
      }
    };
    list.sort(cmp);
    return list;
  }, [
    db.anfragen,
    anfrageId,
    bearbeiter,
    datumVon,
    datumBis,
    fahrzeugart,
    aufbauart,
    fabrikat,
    modellTyp,
    extrasFilter,
    debitorNr,
    firmenname,
    sortierung,
  ]);

  const showAll = () => {
    setAnfrageId("");
    setBearbeiter("");
    setDatumVon("");
    setDatumBis("");
    setFahrzeugart("");
    setAufbauart("");
    setFabrikat("");
    setModellTyp("");
    setExtrasFilter("");
    setDebitorNr("");
    setFirmenname("");
  };

  const selected = selectedId != null ? db.anfragen.find((r) => r.id === selectedId) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            {t("commonInquiries", "Anfragen")}
          </h1>
          {department ? (
            <p className="mt-0.5 text-sm text-slate-500">
              {t("customersArea", "Area")}:{" "}
              <span className="font-medium text-slate-600">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
              {" · "}
              <span className="text-slate-400">
                Liste und Filter wie ANFRAGEN; Neuanlage wie Maske ANFRAGE.
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-2xl bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/25 transition hover:bg-rose-800"
        >
          <Plus className="h-4 w-4" />
          Neue Anfrage
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
          <span className="text-xs text-slate-400">Filter wirken sofort auf die Tabelle.</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Anfrage-ID</label>
            <SuggestTextInput
              type="text"
              value={anfrageId}
              onChange={(e) => setAnfrageId(e.target.value)}
              suggestions={suggestions.anfrage_nr}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Bearbeiter</label>
            <select
              value={bearbeiter}
              onChange={(e) => setBearbeiter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
            >
              <option value="">Alle</option>
              {BEARBEITER_FILTER.filter(Boolean).map((sb) => (
                <option key={sb} value={sb}>
                  {sb.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">von Anfragedatum</label>
            <input
              type="date"
              value={datumVon}
              onChange={(e) => setDatumVon(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">bis Anfragedatum</label>
            <input
              type="date"
              value={datumBis}
              onChange={(e) => setDatumBis(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fahrzeugart</label>
            <select
              value={fahrzeugart}
              onChange={(e) => setFahrzeugart(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
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
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
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
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
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
            <label className="mb-1 block text-xs font-medium text-slate-500">Extras</label>
            <input
              type="text"
              value={extrasFilter}
              onChange={(e) => setExtrasFilter(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">DebitorNr</label>
            <input
              type="text"
              value={debitorNr}
              onChange={(e) => setDebitorNr(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Firmenname</label>
            <input
              type="text"
              value={firmenname}
              onChange={(e) => setFirmenname(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Sortierung</label>
            <select
              value={sortierung}
              onChange={(e) => setSortierung(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="whitespace-nowrap px-3 py-3">Anfrage</th>
                <th className="whitespace-nowrap px-3 py-3">Anfragedatum</th>
                <th className="whitespace-nowrap px-3 py-3">Fahrzeugart</th>
                <th className="whitespace-nowrap px-3 py-3">AufbauArt</th>
                <th className="whitespace-nowrap px-3 py-3">Fabrikat</th>
                <th className="whitespace-nowrap px-3 py-3">Typ</th>
                <th className="whitespace-nowrap px-3 py-3">Extras</th>
                <th className="whitespace-nowrap px-3 py-3">max Preis</th>
                <th className="whitespace-nowrap px-3 py-3">DebitorNr</th>
                <th className="whitespace-nowrap px-3 py-3">Firmenname</th>
                <th className="whitespace-nowrap px-3 py-3">SB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500">
                    Keine Anfragen. Filter zurücksetzen („alle“) oder neue Anfrage anlegen.
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer transition ${
                      selectedId === row.id
                        ? "bg-slate-800 text-white"
                        : i % 2 === 1
                          ? "bg-slate-50/90 text-slate-800 hover:bg-slate-100"
                          : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums">{row.anfrage_nr}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">
                      {formatDeDate(row.anfrage_datum)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.fahrzeugart}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.aufbauart}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.fabrikat}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{row.typ || "—"}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5" title={row.extras}>
                      {row.extras || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{formatEur(row.max_preis)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums">{row.debitor_nr || "—"}</td>
                    <td className="max-w-[200px] truncate px-3 py-2.5" title={row.firmenname}>
                      {row.firmenname}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium uppercase">{row.bearbeiter_sb}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="shrink-0 border-t border-slate-200 bg-slate-50/90 px-4 py-2.5 text-right text-sm text-slate-600">
          Anzahl: <span className="font-semibold tabular-nums text-slate-800">{filtered.length}</span>
        </div>
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => setSelectedId(null)}
          role="presentation"
        >
          <div
            className="flex h-full w-full max-w-md shrink-0 flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="anfrage-drawer-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Anfrage</p>
                <h2 id="anfrage-drawer-title" className="truncate text-xl font-bold text-slate-800">
                  #{selected.anfrage_nr}
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
              <dl className="space-y-3 text-sm">
                {(
                  [
                    ["Anfragedatum", formatDeDate(selected.anfrage_datum)],
                    ["Fahrzeugart", selected.fahrzeugart],
                    ["Aufbau", selected.aufbauart],
                    ["Extras (Liste)", selected.extras || "—"],
                    ["max. Preis", formatEur(selected.max_preis)],
                    ["DebitorNr", selected.debitor_nr || "—"],
                    ["Firmenname", selected.firmenname],
                    ["SB", selected.bearbeiter_sb.toUpperCase()],
                    ["Bemerkungen", selected.bemerkungen || "—"],
                    ["Kundendaten", selected.kundendaten || "—"],
                    ["Extras (Seitenleiste)", selected.extras_sidebar || "—"],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-slate-100 pb-2">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="max-w-[55%] text-right font-medium text-slate-800">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      )}

      <NewAnfrageModal
        open={showNew}
        onClose={() => setShowNew(false)}
        nextAnfrageNrPreview={previewNextAnfrageNr(db)}
        fabrikatSuggestions={suggestions.fabrikat}
        onSubmit={(payload) => {
          setDb((current) => {
            const next = createAnfrage(current, payload);
            saveAnfragenDb(next);
            return next;
          });
          setShowNew(false);
        }}
      />
    </div>
  );
}
