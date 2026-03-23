import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { loadKundenDb } from "../store/kundenStore";
import { useLanguage } from "../contexts/LanguageContext";
import type { DepartmentArea } from "../types/departmentArea";
import { DEPARTMENT_I18N_KEY } from "../types/departmentArea";

/** Wie Legacy: PositionsNr, KZ, Herkunftstabelle (z. B. verkaufter Bestand). */
type KennzeichenTreffer = {
  id: string;
  positions_nr: string;
  kz: string;
  tabelle: string;
};

const TABELLE_VERKAUFTER_BESTAND = "verkaufter Bestand";
const TABELLE_WASCHANLAGE = "Kunden / Waschanlage";
const TABELLE_BESTAND = "Bestand";

/** Demo-Treffer im Stil des Legacy-Dialogs (KZ mit Länderzusätzen, Quelle verkaufter Bestand). */
const DEMO_TREFFER: KennzeichenTreffer[] = [
  { id: "d-4256", positions_nr: "4256", kz: "D - KF 44 (F)", tabelle: TABELLE_VERKAUFTER_BESTAND },
  { id: "d-8259", positions_nr: "8259", kz: "DA 6336 (D)", tabelle: TABELLE_VERKAUFTER_BESTAND },
  { id: "d-9310", positions_nr: "9310", kz: "DA-024-RE (FR)", tabelle: TABELLE_VERKAUFTER_BESTAND },
  { id: "d-5122", positions_nr: "5122", kz: "RAB-D 9002 (DK)", tabelle: TABELLE_VERKAUFTER_BESTAND },
  { id: "d-3301", positions_nr: "3301", kz: "HH-G 7700", tabelle: TABELLE_VERKAUFTER_BESTAND },
  { id: "d-7104", positions_nr: "7104", kz: "B-DEMA 101 (D)", tabelle: TABELLE_BESTAND },
  { id: "d-2888", positions_nr: "2888", kz: "SLS-AA 7 (D)", tabelle: TABELLE_VERKAUFTER_BESTAND },
];

function normalizeKennzeichen(s: string): string {
  return s.replace(/\s+/g, "").toUpperCase();
}

/** Legacy: * als Platzhalter; Suche über KZ inkl. Klammerzusätzen. */
function kennzeichenWildcardMatch(pattern: string, kz: string): boolean {
  const p = pattern.trim();
  if (!p) return true;
  const full = kz.trim();
  const needle = normalizeKennzeichen(full.split("(")[0].trim());
  const raw = p.replace(/\s+/g, "");
  if (!raw.includes("*")) {
    const compact = normalizeKennzeichen(p);
    return (
      normalizeKennzeichen(full).includes(compact) ||
      full.toLowerCase().includes(p.toLowerCase()) ||
      needle.includes(compact)
    );
  }
  const escaped = normalizeKennzeichen(raw)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(normalizeKennzeichen(full));
}

function trefferFromKundenDb(): KennzeichenTreffer[] {
  const db = loadKundenDb();
  const out: KennzeichenTreffer[] = [];
  for (const w of db.kundenWash) {
    const plate = (w.kennzeichen || "").trim();
    if (!plate) continue;
    out.push({
      id: `wash-${w.id}`,
      positions_nr: String(6000 + w.id),
      kz: `${plate} (D)`,
      tabelle: TABELLE_WASCHANLAGE,
    });
  }
  return out;
}

export function KennzeichenSuchePage({ department }: { department?: DepartmentArea }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");

  const basisListe = useMemo(() => {
    const fromDb = trefferFromKundenDb();
    const seen = new Set(fromDb.map((x) => normalizeKennzeichen(x.kz.split("(")[0].trim())));
    const merged = [...fromDb];
    for (const d of DEMO_TREFFER) {
      const key = normalizeKennzeichen(d.kz.split("(")[0].trim());
      if (!seen.has(key)) {
        merged.push(d);
        seen.add(key);
      }
    }
    merged.sort((a, b) => parseInt(b.positions_nr, 10) - parseInt(a.positions_nr, 10));
    return merged;
  }, []);

  const treffer = useMemo(() => {
    if (!query.trim()) return basisListe;
    return basisListe.filter((row) => kennzeichenWildcardMatch(query, row.kz));
  }, [basisListe, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">
          {t("kennzeichenPageTitle", "Kennzeichensuche")}
        </h1>
        {department ? (
          <p className="mt-0.5 text-sm text-slate-500">
            {t("customersArea", "Area")}:{" "}
            <span className="font-medium text-slate-600">{t(DEPARTMENT_I18N_KEY[department], department)}</span>
          </p>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-sky-200/80 bg-gradient-to-b from-sky-50 to-white p-6 shadow-lg shadow-sky-900/10">
        <div className="border-b border-sky-100 pb-3">
          <h2 className="text-center text-sm font-bold uppercase tracking-wide text-sky-900">
            {t("kennzeichenSearchHeader", "Suche für Kennzeichen")}
          </h2>
        </div>
        <div className="mt-5">
          <label
            htmlFor="kennzeichen-query"
            className="mb-2 block text-sm font-semibold text-slate-800"
          >
            {t("kennzeichenSearchLabel", "Kennzeichen suchen:")}
          </label>
          <div className="flex flex-wrap items-stretch gap-2 sm:flex-nowrap">
            <input
              id="kennzeichen-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="z. B. D oder DE*MA*101"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/25"
              autoComplete="off"
            />
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-sky-600/25 hover:bg-sky-700"
            >
              <Search className="h-4 w-4" />
              {t("kennzeichenSearchButton", "Suchen")}
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            {t(
              "kennzeichenWildcardHint",
              "bei der Suche mit * arbeiten um bessere Treffer zu erzielen: Beispiel: DE*MA*101"
            )}
          </p>
        </div>
      </div>

      <div className="glass-card mx-auto mt-8 w-full max-w-5xl flex-1 overflow-hidden border-sky-100/80 shadow-sky-900/5">
        <div className="overflow-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-sky-50 font-semibold text-sky-950">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">{t("kennzeichenColPosition", "PositionsNr")}</th>
                <th className="px-4 py-3">{t("kennzeichenColKz", "KZ")}</th>
                <th className="px-4 py-3">{t("kennzeichenColTable", "Tabelle")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {treffer.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-14 text-center text-sm text-slate-500">
                    {query.trim()
                      ? t("kennzeichenNoHits", "Keine Treffer für diese Suche.")
                      : t("kennzeichenEnterQuery", "Geben Sie ein Kennzeichen ein oder nutzen Sie * als Platzhalter.")}
                  </td>
                </tr>
              ) : (
                treffer.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 1 ? "bg-sky-50/40" : ""}>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums font-medium text-slate-900">
                      {row.positions_nr}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-900">{row.kz}</td>
                    <td className="px-4 py-2.5 text-slate-700">{row.tabelle}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-sky-100 bg-sky-50/90 px-4 py-2 text-right text-sm text-slate-600">
          {t("kennzeichenHitCount", "Treffer:")}{" "}
          <span className="font-semibold tabular-nums text-sky-900">{treffer.length}</span>
        </div>
      </div>
    </div>
  );
}
