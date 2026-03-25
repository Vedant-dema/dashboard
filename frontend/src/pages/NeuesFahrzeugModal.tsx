/**
 * NeuesFahrzeugModal
 * Professional "Neues Fahrzeug" entry form — matches the legacy E_Bestand form fields
 * but with a modern, clean UI. Renders via React Portal.
 */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, Truck, Printer, FileText, Image, Tag,
  Users, MessageSquare, ChevronRight, Bookmark,
  Wrench, MapPin, Hash, Calendar, CheckCircle2, Plus, Trash2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = "stammdaten" | "bilder" | "preise" | "beteiligte" | "anfragen";

interface AnfrageRow {
  id: number;
  datum: string;
  name: string;
  reserviert_bis: string;
  erreichbarkeit: string;
  preis_dema: string;
  preis_kunde: string;
  anzahlung: string;
  erstellt_von: string;
}

interface FormState {
  // Grunddaten
  positions_nr: string;
  kreditor: string;
  mobile_id: string;
  kaufdatum: string;
  fahrzeugart: string;
  aufbau_art: string;
  fabrikat: string;
  modellreihe: string;
  typ: string;
  fahrgestellnummer: string;
  // Technische Daten
  kw: string;
  ps: string;
  km_gesamt: string;
  km_atm: string;
  bereifung_pct: string;
  allgemeiner_zustand: string;
  leergewicht: string;
  zul_gesamtgewicht: string;
  erstzulassung: string;
  letzte_kz: string;
  einkaeufer: string;
  eingabe_durch: string;
  // Reservation
  reserviert: boolean;
  reserviert_name: string;
  reserviert_bis: string;
  reserviert_preis: string;
  // Preise
  preis_einkauf: string;
  preis_verkauf: string;
  preis_mindest: string;
  mwst_satz: string;
  // Bemerkungen
  bem_verkauf: string;
  bem_einkauf: string;
  bem_buchhaltung: string;
  bem_werkstatt: string;
}

const FAHRZEUGART_OPTIONS = ["LKW", "Auflieger", "Anhänger", "Wechselbrücke", "Sonstige"];
const AUFBAU_OPTIONS = [
  "SZM", "Kühlkoffer", "Getränkeaufbau", "Pritsche/Plane",
  "Absetzkipper", "Koffer", "Kipper", "Silo", "Sonstige",
];
const ZUSTAND_OPTIONS = ["sehr gut", "gut", "befriedigend", "ausreichend", "mangelhaft"];
const EINKAEUFER_OPTIONS = ["TK", "MS", "AT", "GR", "JK", "SB"];

function initialForm(): FormState {
  return {
    positions_nr: "", kreditor: "", mobile_id: "",
    kaufdatum: new Date().toISOString().slice(0, 10),
    fahrzeugart: "LKW", aufbau_art: "SZM",
    fabrikat: "", modellreihe: "", typ: "", fahrgestellnummer: "",
    kw: "", ps: "", km_gesamt: "", km_atm: "", bereifung_pct: "",
    allgemeiner_zustand: "gut", leergewicht: "", zul_gesamtgewicht: "",
    erstzulassung: "", letzte_kz: "", einkaeufer: "", eingabe_durch: "",
    reserviert: false, reserviert_name: "", reserviert_bis: "", reserviert_preis: "",
    preis_einkauf: "", preis_verkauf: "", preis_mindest: "", mwst_satz: "19",
    bem_verkauf: "", bem_einkauf: "", bem_buchhaltung: "", bem_werkstatt: "",
  };
}

const TAB_CONFIG: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "stammdaten", label: "Bestandsdetail",     icon: <Truck className="h-4 w-4" /> },
  { id: "bilder",     label: "Bilder & Dokumente", icon: <Image className="h-4 w-4" /> },
  { id: "preise",     label: "Preise",              icon: <Tag className="h-4 w-4" /> },
  { id: "beteiligte", label: "Beteiligte",          icon: <Users className="h-4 w-4" /> },
  { id: "anfragen",   label: "Anfragenverlauf",     icon: <MessageSquare className="h-4 w-4" /> },
];

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputCls =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20 placeholder:text-slate-400";
const labelCls = "mb-1 block text-xs font-medium text-slate-500";
const sectionTitle = "mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NeuesFahrzeugModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<TabId>("stammdaten");
  const [form, setForm] = useState<FormState>(initialForm);
  const [anfragen, setAnfragen] = useState<AnfrageRow[]>([
    { id: 1, datum: "2024-02-01", name: "777", reserviert_bis: "", erreichbarkeit: "01794742215",
      preis_dema: "34.500,00 €", preis_kunde: "0,00 €", anzahlung: "", erstellt_von: "IF" },
    { id: 2, datum: "2023-07-24", name: "Andres", reserviert_bis: "2023-07-25", erreichbarkeit: "+34 675 09 41 35",
      preis_dema: "33.900,00 €", preis_kunde: "33.900,00 €", anzahlung: "", erstellt_von: "IK" },
    { id: 3, datum: "2023-05-31", name: "Gregory", reserviert_bis: "2023-06-23", erreichbarkeit: "0163386343",
      preis_dema: "18.000,00 €", preis_kunde: "18.000,00 €", anzahlung: "500,00 €", erstellt_von: "IF" },
  ]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Reset on open
  useEffect(() => {
    if (open) { setForm(initialForm()); setTab("stammdaten"); }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Truck className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Neues Fahrzeug</h2>
                  {form.positions_nr && (
                    <span className="rounded-lg bg-white/20 px-2.5 py-0.5 font-mono text-sm font-semibold text-white">
                      #{form.positions_nr}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">BESTAND — Fahrzeugerfassung</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Print actions */}
              {(["FZ-Etikett", "FZ-Datenkarte", "Aufnahmeblatt"] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20"
                >
                  <Printer className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
              <div className="ml-2 h-5 w-px bg-white/20" />
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* MobileID bar */}
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2">
            <span className="text-xs font-medium text-slate-300">Mobile ID:</span>
            <input
              type="text"
              value={form.mobile_id}
              onChange={(e) => set("mobile_id", e.target.value)}
              placeholder="—"
              className="h-7 w-48 rounded-lg border-0 bg-white/20 px-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-white/30"
            />
            <span className="ml-1 rounded bg-emerald-500/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">M</span>
          </div>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex border-b border-slate-200 bg-slate-50 px-4">
          {TAB_CONFIG.map(({ id, label, icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition ${
                tab === id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab content ────────────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 p-6">

          {/* ── STAMMDATEN ──────────────────────────────────────────────── */}
          {tab === "stammdaten" && (
            <div className="space-y-5">

              {/* Two-column main grid */}
              <div className="grid gap-5 lg:grid-cols-2">

                {/* Left — Grunddaten */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className={sectionTitle}>
                    <Hash className="h-3.5 w-3.5" />
                    Grunddaten
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>PositionsNr</label>
                        <input type="text" value={form.positions_nr}
                          onChange={(e) => set("positions_nr", e.target.value)}
                          className={inputCls} placeholder="automatisch" />
                      </div>
                      <div>
                        <label className={labelCls}>Kaufdatum</label>
                        <input type="date" value={form.kaufdatum}
                          onChange={(e) => set("kaufdatum", e.target.value)}
                          className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Kreditor</label>
                      <input type="text" value={form.kreditor}
                        onChange={(e) => set("kreditor", e.target.value)}
                        placeholder="Kreditor suchen…" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Fahrzeugart</label>
                        <select value={form.fahrzeugart}
                          onChange={(e) => set("fahrzeugart", e.target.value)} className={inputCls}>
                          {FAHRZEUGART_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>AufbauArt</label>
                        <select value={form.aufbau_art}
                          onChange={(e) => set("aufbau_art", e.target.value)} className={inputCls}>
                          {AUFBAU_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Fabrikat</label>
                      <input type="text" value={form.fabrikat}
                        onChange={(e) => set("fabrikat", e.target.value)}
                        placeholder="z. B. MAN, MB, DAF…" className={inputCls} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Modellreihe</label>
                        <input type="text" value={form.modellreihe}
                          onChange={(e) => set("modellreihe", e.target.value)}
                          placeholder="z. B. TGX, Actros…" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Typ</label>
                        <input type="text" value={form.typ}
                          onChange={(e) => set("typ", e.target.value)}
                          placeholder="z. B. 18.470" className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Fahrgestellnummer</label>
                      <input type="text" value={form.fahrgestellnummer}
                        onChange={(e) => set("fahrgestellnummer", e.target.value)}
                        placeholder="17-stellige FIN" className={`${inputCls} font-mono`} />
                    </div>
                  </div>
                </div>

                {/* Right — Technische Daten */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className={sectionTitle}>
                    <Wrench className="h-3.5 w-3.5" />
                    Technische Daten
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>KW</label>
                        <input type="number" value={form.kw}
                          onChange={(e) => set("kw", e.target.value)}
                          placeholder="kW" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>PS</label>
                        <input type="number" value={form.ps}
                          onChange={(e) => set("ps", e.target.value)}
                          placeholder="PS" className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>KM-Stand Gesamt</label>
                        <input type="number" value={form.km_gesamt}
                          onChange={(e) => set("km_gesamt", e.target.value)}
                          placeholder="km" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>KM-Stand ATM</label>
                        <input type="number" value={form.km_atm}
                          onChange={(e) => set("km_atm", e.target.value)}
                          placeholder="km" className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Bereifung (%)</label>
                        <input type="number" value={form.bereifung_pct}
                          onChange={(e) => set("bereifung_pct", e.target.value)}
                          placeholder="0–100" min="0" max="100" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Allgemeiner Zustand</label>
                        <select value={form.allgemeiner_zustand}
                          onChange={(e) => set("allgemeiner_zustand", e.target.value)} className={inputCls}>
                          {ZUSTAND_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Leergewicht (kg)</label>
                        <input type="number" value={form.leergewicht}
                          onChange={(e) => set("leergewicht", e.target.value)}
                          placeholder="kg" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Zul. Gesamtgewicht (kg)</label>
                        <input type="number" value={form.zul_gesamtgewicht}
                          onChange={(e) => set("zul_gesamtgewicht", e.target.value)}
                          placeholder="kg" className={inputCls} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Erstzulassung</label>
                        <input type="month" value={form.erstzulassung}
                          onChange={(e) => set("erstzulassung", e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Letzte amtl. KZ</label>
                        <input type="text" value={form.letzte_kz}
                          onChange={(e) => set("letzte_kz", e.target.value)}
                          placeholder="z. B. VS-AB 123" className={`${inputCls} uppercase`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Einkäufer</label>
                        <select value={form.einkaeufer}
                          onChange={(e) => set("einkaeufer", e.target.value)} className={inputCls}>
                          <option value="">—</option>
                          {EINKAEUFER_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Eingabe durch</label>
                        <input type="text" value={form.eingabe_durch}
                          onChange={(e) => set("eingabe_durch", e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reservation */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className={sectionTitle}>
                    <Bookmark className="h-3.5 w-3.5" />
                    Reservierung
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50">
                    <input
                      type="checkbox"
                      checked={form.reserviert}
                      onChange={(e) => set("reserviert", e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    Fahrzeug reservieren
                  </label>
                </div>

                {form.reserviert ? (
                  <div className="grid grid-cols-3 gap-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                    <div>
                      <label className={labelCls}>Name / Firma</label>
                      <input type="text" value={form.reserviert_name}
                        onChange={(e) => set("reserviert_name", e.target.value)}
                        placeholder="Reserviert für…" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Bis zum</label>
                      <input type="date" value={form.reserviert_bis}
                        onChange={(e) => set("reserviert_bis", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Zum Preis (€)</label>
                      <input type="number" value={form.reserviert_preis}
                        onChange={(e) => set("reserviert_preis", e.target.value)}
                        placeholder="0,00" className={inputCls} />
                    </div>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                    Kein aktive Reservierung
                  </p>
                )}
              </div>

              {/* Remarks — 2×2 grid */}
              <div className="grid grid-cols-2 gap-4">
                {([
                  ["bem_verkauf",      "Verkauf",      "blue"],
                  ["bem_einkauf",      "Einkauf",      "slate"],
                  ["bem_buchhaltung",  "Buchhaltung",  "slate"],
                  ["bem_werkstatt",    "Werkstatt",    "red"],
                ] as const).map(([key, label, color]) => (
                  <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${
                      color === "blue" ? "text-blue-600" : color === "red" ? "text-red-500" : "text-slate-400"
                    }`}>
                      <MessageSquare className="h-3.5 w-3.5" />
                      Bemerkungen — Abteilung {label}
                    </p>
                    <textarea
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      rows={3}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20"
                      placeholder={`Bemerkungen für Abteilung ${label}…`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BILDER & DOKUMENTE ──────────────────────────────────────── */}
          {tab === "bilder" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className={sectionTitle}><Image className="h-3.5 w-3.5" />Bilder &amp; Dokumente</p>
              <div className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center transition hover:border-blue-300 hover:bg-blue-50/30">
                <Image className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-semibold text-slate-500">Bilder hochladen</p>
                <p className="mt-1 text-xs text-slate-400">PNG, JPG, PDF — per Drag &amp; Drop oder Klick</p>
                <button type="button" className="mt-4 rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Dateien auswählen
                </button>
              </div>
            </div>
          )}

          {/* ── PREISE ──────────────────────────────────────────────────── */}
          {tab === "preise" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className={sectionTitle}><Tag className="h-3.5 w-3.5" />Preise</p>
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                {([
                  ["preis_einkauf",  "Einkaufspreis (€)",  "Tatsächlicher EK"],
                  ["preis_verkauf",  "Verkaufspreis (€)",  "Angezeigter VK"],
                  ["preis_mindest",  "Mindestpreis (€)",   "Untergrenze VK"],
                  ["mwst_satz",      "MwSt-Satz (%)",      "Standard 19 %"],
                ] as const).map(([key, label, hint]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input
                      type="number"
                      value={form[key]}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder="0,00"
                      className={inputCls}
                    />
                    <p className="mt-1 text-[10px] text-slate-400">{hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── BETEILIGTE ──────────────────────────────────────────────── */}
          {tab === "beteiligte" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className={sectionTitle}><Users className="h-3.5 w-3.5" />Beteiligte</p>
              <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
                Keine Beteiligten erfasst.
              </p>
            </div>
          )}

          {/* ── ANFRAGENVERLAUF ─────────────────────────────────────────── */}
          {tab === "anfragen" && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className={`${sectionTitle} mb-0`}>
                  <MessageSquare className="h-3.5 w-3.5" />
                  Anfragenverlauf
                </p>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Neue Anfrage
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-400">
                    <tr>
                      {["Datum", "Name", "Reserviert bis", "Erreichbarkeit",
                        "Preis DEMA", "Preis Kunde", "Anzahlung", "Erstellt von", ""].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {anfragen.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500">
                          {row.datum}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{row.name}</td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-500">
                          {row.reserviert_bis || "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                          {row.erreichbarkeit}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">
                          {row.preis_dema}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-emerald-700">
                          {row.preis_kunde}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-slate-500">
                          {row.anzahlung || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {row.erstellt_von}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setAnfragen((prev) => prev.filter((r) => r.id !== row.id))}
                            className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* ── Footer actions ──────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex gap-2">
            <button type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <Users className="h-4 w-4" />
              Kreditor auswählen
            </button>
            <button type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <FileText className="h-4 w-4" />
              Abholauftrag erstellen
            </button>
            <button type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <MapPin className="h-4 w-4" />
              Kundendaten zeigen
            </button>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Abbrechen
            </button>
            <button type="button"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
              <CheckCircle2 className="h-4 w-4" />
              Fahrzeug speichern
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
