import { useEffect, useState, useCallback } from "react";
import { X, Search, ClipboardList, MessageSquare, Car } from "lucide-react";
import type { NewAnfragePayload } from "../types/anfragen";
import { SuggestTextInput } from "./SuggestTextInput";

type TabId = "suchprofil" | "kunde" | "verknuepfung";

const tabLabels: Record<TabId, string> = {
  suchprofil: "Suchkriterien",
  kunde: "Kunde & Notizen",
  verknuepfung: "Bestand & Angebote",
};

const FAHRZEUGART_OPTIONS = ["LKW", "PKW", "Auflieger", "Transporter", "Sonstige"];
const AUFBAU_OPTIONS = [
  "SZM",
  "Silo",
  "Kipper",
  "Koffer",
  "Viehtransporter",
  "Betonmischer",
  "Pritsche",
  "Sonstige",
];

const BEARBEITER_OPTIONS = [
  { sb: "es", label: "ES — Erika Schmidt" },
  { sb: "tk", label: "TK — Thomas Klein" },
  { sb: "sf", label: "SF — Sophie Fischer" },
  { sb: "la", label: "LA — Liciu Ana-Maria" },
];

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none ring-slate-200/50 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  if (!t) return undefined;
  return t;
}

type FormState = {
  anfrage_datum: string;
  fahrzeugart: string;
  aufbauart: string;
  fabrikat: string;
  typ: string;
  zul_gg_von: string;
  zul_gg_bis: string;
  ez_von: string;
  ez_bis: string;
  max_alter: string;
  ps_von: string;
  ps_bis: string;
  max_kilometer: string;
  preis_von: string;
  preis_bis: string;
  extras_liste: string;
  debitor_text: string;
  debitor_nr: string;
  firmenname: string;
  bearbeiter_sb: string;
  bemerkungen: string;
  kundendaten: string;
  extras_sidebar: string;
};

function initialForm(): FormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    anfrage_datum: today,
    fahrzeugart: "LKW",
    aufbauart: "SZM",
    fabrikat: "",
    typ: "",
    zul_gg_von: "",
    zul_gg_bis: "",
    ez_von: "",
    ez_bis: "",
    max_alter: "",
    ps_von: "",
    ps_bis: "",
    max_kilometer: "",
    preis_von: "",
    preis_bis: "",
    extras_liste: "",
    debitor_text: "",
    debitor_nr: "",
    firmenname: "",
    bearbeiter_sb: "es",
    bemerkungen: "",
    kundendaten: "",
    extras_sidebar: "",
  };
}

function formToPayload(f: FormState): NewAnfragePayload {
  const firmenname = f.firmenname.trim() || f.debitor_text.trim();
  const bearbeiter_name =
    BEARBEITER_OPTIONS.find((b) => b.sb === f.bearbeiter_sb)?.label.split(" — ")[1] ?? undefined;
  return {
    anfrage_datum: f.anfrage_datum,
    fahrzeugart: f.fahrzeugart,
    aufbauart: f.aufbauart,
    fabrikat: f.fabrikat.trim(),
    typ: f.typ.trim(),
    extras: f.extras_liste.trim(),
    max_preis: 0,
    debitor_nr: f.debitor_nr.trim(),
    firmenname,
    bearbeiter_sb: f.bearbeiter_sb,
    debitor_anzeige: emptyToUndef(f.debitor_text),
    bearbeiter_name,
    bemerkungen: emptyToUndef(f.bemerkungen),
    kundendaten: emptyToUndef(f.kundendaten),
    extras_sidebar: emptyToUndef(f.extras_sidebar),
    zul_gg_von: emptyToUndef(f.zul_gg_von),
    zul_gg_bis: emptyToUndef(f.zul_gg_bis),
    ez_von: emptyToUndef(f.ez_von),
    ez_bis: emptyToUndef(f.ez_bis),
    max_alter: emptyToUndef(f.max_alter),
    ps_von: emptyToUndef(f.ps_von),
    ps_bis: emptyToUndef(f.ps_bis),
    max_kilometer: emptyToUndef(f.max_kilometer),
    preis_von: emptyToUndef(f.preis_von),
    preis_bis: emptyToUndef(f.preis_bis),
  };
}

type Props = {
  open: boolean;
  onClose: () => void;
  nextAnfrageNrPreview: string;
  fabrikatSuggestions: readonly string[];
  onSubmit: (payload: NewAnfragePayload) => void;
};

export function NewAnfrageModal({
  open,
  onClose,
  nextAnfrageNrPreview,
  fabrikatSuggestions,
  onSubmit,
}: Props) {
  const [tab, setTab] = useState<TabId>("suchprofil");
  const [form, setForm] = useState<FormState>(initialForm);
  const [extrasLocked, setExtrasLocked] = useState(true);

  useEffect(() => {
    if (open) {
      setForm(initialForm());
      setTab("suchprofil");
      setExtrasLocked(true);
    }
  }, [open]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((s) => ({ ...s, [key]: value }));
  }, []);

  const handleSave = () => {
    if (!form.fabrikat.trim()) {
      alert("Bitte Fabrikat ausfüllen.");
      setTab("suchprofil");
      return;
    }
    const name = form.firmenname.trim() || form.debitor_text.trim();
    if (!name) {
      alert("Bitte Firmenname oder Debitor ausfüllen.");
      setTab("kunde");
      return;
    }
    onSubmit(formToPayload(form));
  };

  const handleReset = () => {
    if (!confirm("Anfrage-Formular wirklich leeren?")) return;
    setForm(initialForm());
  };

  const stub = (msg: string) => alert(`${msg} — Anbindung folgt.`);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-2 backdrop-blur-[2px] sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(96vh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-anfrage-title"
      >
        <div className="relative flex shrink-0 flex-wrap items-start justify-between gap-3 bg-gradient-to-r from-rose-900 to-slate-900 px-4 py-3 pr-14 text-white sm:px-6 sm:pr-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => stub("Suchen")}
              className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <Search className="h-4 w-4" />
              Suchen
            </button>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-baseline justify-center gap-2 sm:justify-start">
              <h2 id="new-anfrage-title" className="text-lg font-bold tracking-tight sm:text-xl">
                Anfrage
              </h2>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-rose-100">
                (Neu)
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-300">
              Nächste ID <code className="rounded bg-black/25 px-1">{nextAnfrageNrPreview}</code>
            </p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Anfragedatum</p>
            <p className="text-sm font-semibold tabular-nums">
              {new Date(form.anfrage_datum).toLocaleDateString("de-DE")}
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

        <div className="flex shrink-0 gap-0 border-b border-slate-200 bg-slate-50/90 px-3 pt-2 sm:px-5">
          {(Object.keys(tabLabels) as TabId[]).map((id) => {
            const Icon = id === "suchprofil" ? Car : id === "kunde" ? MessageSquare : ClipboardList;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  tab === id
                    ? "border-rose-600 text-rose-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {tabLabels[id]}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-3 py-4 sm:px-6 sm:py-5">
          {tab === "suchprofil" && (
            <div className="mx-auto max-w-5xl space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Fahrzeug-Suchprofil</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className={labelClass}>Anfrage-ID (automatisch)</label>
                    <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-semibold">
                      {nextAnfrageNrPreview}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Anfragedatum</label>
                    <input
                      type="date"
                      value={form.anfrage_datum}
                      onChange={(e) => set("anfrage_datum", e.target.value)}
                      className={inputClass}
                    />
                  </div>
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
                    <label className={labelClass}>Aufbauart</label>
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
                  <div className="sm:col-span-2">
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
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className={labelClass}>Modell, Typ</label>
                    <input
                      type="text"
                      value={form.typ}
                      onChange={(e) => set("typ", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Zul. GG von (kg)</label>
                    <input
                      type="text"
                      value={form.zul_gg_von}
                      onChange={(e) => set("zul_gg_von", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Zul. GG bis (kg)</label>
                    <input
                      type="text"
                      value={form.zul_gg_bis}
                      onChange={(e) => set("zul_gg_bis", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>EZ von</label>
                    <input
                      type="month"
                      value={form.ez_von}
                      onChange={(e) => set("ez_von", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>EZ bis</label>
                    <input
                      type="month"
                      value={form.ez_bis}
                      onChange={(e) => set("ez_bis", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>max. Alter (Jahre)</label>
                    <input
                      type="text"
                      value={form.max_alter}
                      onChange={(e) => set("max_alter", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>PS von</label>
                    <input
                      type="text"
                      value={form.ps_von}
                      onChange={(e) => set("ps_von", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>PS bis</label>
                    <input
                      type="text"
                      value={form.ps_bis}
                      onChange={(e) => set("ps_bis", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>max. Kilometer</label>
                    <input
                      type="text"
                      value={form.max_kilometer}
                      onChange={(e) => set("max_kilometer", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Preis von (€)</label>
                    <input
                      type="text"
                      value={form.preis_von}
                      onChange={(e) => set("preis_von", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Preis bis (€)</label>
                    <input
                      type="text"
                      value={form.preis_bis}
                      onChange={(e) => set("preis_bis", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className={labelClass}>Extras, mit „;“ getrennt</label>
                  <textarea
                    value={form.extras_liste}
                    onChange={(e) => set("extras_liste", e.target.value)}
                    rows={4}
                    placeholder="z. B. Kran; Euro 6; Silo"
                    className={`${inputClass} min-h-[88px] resize-y py-2`}
                  />
                </div>
              </div>
            </div>
          )}

          {tab === "kunde" && (
            <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-3">
              <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Kunde &amp; Vorgang</p>
                <div>
                  <label className={labelClass}>Debitor (Anzeige)</label>
                  <input
                    type="text"
                    value={form.debitor_text}
                    onChange={(e) => set("debitor_text", e.target.value)}
                    className={inputClass}
                    placeholder="Name wie im Legacy-Feld „Debitor“"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      Firmenname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.firmenname}
                      onChange={(e) => set("firmenname", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>DebitorNr</label>
                    <input
                      type="text"
                      value={form.debitor_nr}
                      onChange={(e) => set("debitor_nr", e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Bearbeiter</label>
                  <select
                    value={form.bearbeiter_sb}
                    onChange={(e) => set("bearbeiter_sb", e.target.value)}
                    className={inputClass}
                  >
                    {BEARBEITER_OPTIONS.map((b) => (
                      <option key={b.sb} value={b.sb}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Bemerkungen</label>
                  <input
                    type="text"
                    value={form.bemerkungen}
                    onChange={(e) => set("bemerkungen", e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Kundendaten</label>
                  <textarea
                    value={form.kundendaten}
                    onChange={(e) => set("kundendaten", e.target.value)}
                    rows={8}
                    className={`${inputClass} min-h-[160px] resize-y py-2`}
                    placeholder="Freitext-Kundendaten (Legacy-Feld)"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/40 p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-rose-900">Extras</p>
                  <button
                    type="button"
                    onClick={() => setExtrasLocked((x) => !x)}
                    className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-900 hover:bg-rose-50"
                  >
                    {extrasLocked ? "Bearbeiten" : "Sperren"}
                  </button>
                </div>
                <textarea
                  value={form.extras_sidebar}
                  onChange={(e) => set("extras_sidebar", e.target.value)}
                  readOnly={extrasLocked}
                  rows={12}
                  className={`${inputClass} min-h-[220px] resize-y py-2 ${
                    extrasLocked ? "cursor-default bg-white/80 text-slate-600" : ""
                  }`}
                  placeholder="Zusätzliche Extras (rechte Spalte)"
                />
              </div>
            </div>
          )}

          {tab === "verknuepfung" && (
            <div className="mx-auto max-w-5xl space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Bestand</p>
                <div className="min-h-[100px] overflow-x-auto rounded-lg border border-dashed border-slate-200 bg-slate-50/80">
                  <table className="w-full min-w-[640px] text-left text-xs text-slate-500">
                    <thead className="border-b border-slate-200 bg-slate-100/80 text-[10px] font-semibold uppercase">
                      <tr>
                        <th className="px-2 py-2">Fzg</th>
                        <th className="px-2 py-2">FIN</th>
                        <th className="px-2 py-2">Typ</th>
                        <th className="px-2 py-2">Preis</th>
                        <th className="px-2 py-2">Standort</th>
                      </tr>
                    </thead>
                    <tbody />
                  </table>
                </div>
                <p className="mt-2 text-right text-xs text-slate-600">
                  Anzahl: <span className="font-semibold tabular-nums">0</span>
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Angebote</p>
                <div className="min-h-[100px] overflow-x-auto rounded-lg border border-dashed border-slate-200 bg-slate-50/80">
                  <table className="w-full min-w-[640px] text-left text-xs text-slate-500">
                    <thead className="border-b border-slate-200 bg-slate-100/80 text-[10px] font-semibold uppercase">
                      <tr>
                        <th className="px-2 py-2">Angebot</th>
                        <th className="px-2 py-2">Datum</th>
                        <th className="px-2 py-2">Fabrikat</th>
                        <th className="px-2 py-2">Preis</th>
                        <th className="px-2 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody />
                  </table>
                </div>
                <p className="mt-2 text-right text-xs text-slate-600">
                  Anzahl: <span className="font-semibold tabular-nums">0</span>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-slate-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleReset}
              className="mr-auto rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Anfrage löschen
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
              className="rounded-xl bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/25 hover:bg-rose-800"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
