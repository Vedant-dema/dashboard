import { useState, useMemo, useCallback } from "react";
import {
  Search, X, Plus, ChevronDown, ChevronUp,
  Truck, AlertTriangle, CheckCircle2, Clock,
  RefreshCw, Car, Tag, Info, SlidersHorizontal,
  Hash, Calendar, Wrench, MapPin, ArrowUpDown,
} from "lucide-react";
import type { BestandRow } from "../types/bestand";
import { loadBestandDb } from "../store/bestandStore";
import { SuggestTextInput } from "../components/SuggestTextInput";
import type { DepartmentArea } from "../types/departmentArea";

// ─── Constants ────────────────────────────────────────────────────────────────

const FAHRZEUGART_OPTIONS = ["", "LKW", "Auflieger", "Anhänger", "Wechselbrücke", "Sonstige"];
const AUFBAU_OPTIONS = [
  "", "SZM", "Kühlkoffer", "Getränkeaufbau", "Pritsche/Plane",
  "Absetzkipper", "Koffer", "Kipper", "Silo", "Sonstige",
];
const SORT_OPTIONS = [
  "Position", "Kaufdatum", "Fabrikat", "Fahrzeugart", "Firmenname", "Standtage",
] as const;

type FlagKey = keyof Pick<
  BestandRow,
  | "reserviert" | "angezahlt" | "angefragt" | "kein_abholer" | "kein_kaeufer"
  | "bh_check" | "fehlende_kosten" | "keine_erstkontrolle" | "auftrag_erledigt"
  | "reinigung_offen" | "offene_auftraege" | "kein_eingang"
  | "in_mobile" | "in_aufbereitung" | "im_vorfeld"
>;

const FLAG_FILTERS: { key: FlagKey; label: string; color: string }[] = [
  { key: "reserviert",          label: "Reserviert",          color: "blue"   },
  { key: "angezahlt",           label: "Angezahlt",           color: "green"  },
  { key: "angefragt",           label: "Angefragt",           color: "purple" },
  { key: "kein_abholer",        label: "kein Abholer",        color: "amber"  },
  { key: "kein_kaeufer",        label: "kein Käufer",         color: "amber"  },
  { key: "bh_check",            label: "BH Check",            color: "orange" },
  { key: "fehlende_kosten",     label: "Fehlende Kosten",     color: "red"    },
  { key: "keine_erstkontrolle", label: "keine Erstkontrolle", color: "red"    },
  { key: "auftrag_erledigt",    label: "Auftrag erledigt",    color: "green"  },
  { key: "reinigung_offen",     label: "Reinigung offen",     color: "orange" },
  { key: "offene_auftraege",    label: "Offene Aufträge",     color: "red"    },
  { key: "kein_eingang",        label: "kein Eingang",        color: "red"    },
  { key: "in_mobile",           label: "Mobile.de",           color: "teal"   },
  { key: "in_aufbereitung",     label: "In Aufbereitung",     color: "blue"   },
  { key: "im_vorfeld",          label: "Im Vorfeld",          color: "slate"  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("de-DE");
}

function fahrzeugartBadge(art: string) {
  switch (art) {
    case "LKW":           return "bg-blue-100 text-blue-800 ring-blue-200";
    case "Auflieger":     return "bg-purple-100 text-purple-800 ring-purple-200";
    case "Anhänger":      return "bg-orange-100 text-orange-800 ring-orange-200";
    case "Wechselbrücke": return "bg-teal-100 text-teal-800 ring-teal-200";
    default:              return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function fahrzeugartBorder(art: string) {
  switch (art) {
    case "LKW":           return "border-l-blue-400";
    case "Auflieger":     return "border-l-purple-400";
    case "Anhänger":      return "border-l-orange-400";
    case "Wechselbrücke": return "border-l-teal-400";
    default:              return "border-l-slate-200";
  }
}

function flagPill(color: string) {
  switch (color) {
    case "green":  return "bg-emerald-100 text-emerald-800";
    case "blue":   return "bg-blue-100 text-blue-800";
    case "purple": return "bg-purple-100 text-purple-800";
    case "amber":  return "bg-amber-100 text-amber-800";
    case "orange": return "bg-orange-100 text-orange-800";
    case "red":    return "bg-red-100 text-red-800";
    case "teal":   return "bg-teal-100 text-teal-800";
    default:       return "bg-slate-100 text-slate-700";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BestandPage({ department }: { department?: DepartmentArea }) {
  const [db] = useState(() => loadBestandDb());
  const [activeTab,   setActiveTab]   = useState<"haupt" | "ersatz">("haupt");
  const [showFilters, setShowFilters] = useState(true);
  const [showFlags,   setShowFlags]   = useState(false);

  // ── Filters ──
  const [positionsNr,    setPositionsNr]    = useState("");
  const [kaufVon,        setKaufVon]         = useState("");
  const [kaufBis,        setKaufBis]         = useState("");
  const [fahrzeugart,    setFahrzeugart]     = useState("");
  const [aufbauArt,      setAufbauArt]       = useState("");
  const [fabrikat,       setFabrikat]        = useState("");
  const [modellTyp,      setModellTyp]       = useState("");
  const [maxAlterJahre,  setMaxAlterJahre]   = useState("");
  const [fahrgestell,    setFahrgestell]     = useState("");
  const [psVon,          setPsVon]           = useState("");
  const [psBis,          setPsBis]           = useState("");
  const [standtageVon,   setStandtageVon]    = useState("");
  const [standtageBis,   setStandtageBis]    = useState("");
  const [kreditorNr,     setKreditorNr]      = useState("");
  const [firmenname,     setFirmenname]      = useState("");
  const [plz,            setPlz]             = useState("");
  const [ort,            setOrt]             = useState("");
  const [land,           setLand]            = useState("");
  const [beteiligter,    setBeteiligter]     = useState("");
  const [importNr,       setImportNr]        = useState("");
  const [sortierung,     setSortierung]      = useState<string>(SORT_OPTIONS[0]);
  const [flagFilters,    setFlagFilters]     = useState<Partial<Record<FlagKey, boolean>>>({});
  const [selectedId,     setSelectedId]      = useState<number | null>(null);

  const setFlag = useCallback((key: FlagKey, value: boolean) => {
    setFlagFilters((prev) => {
      const next = { ...prev };
      if (!value) delete next[key]; else next[key] = true;
      return next;
    });
  }, []);

  const showAll = () => {
    setPositionsNr(""); setKaufVon(""); setKaufBis(""); setFahrzeugart("");
    setAufbauArt(""); setFabrikat(""); setModellTyp(""); setMaxAlterJahre("");
    setFahrgestell(""); setPsVon(""); setPsBis(""); setStandtageVon("");
    setStandtageBis(""); setKreditorNr(""); setFirmenname(""); setPlz("");
    setOrt(""); setLand(""); setBeteiligter(""); setImportNr(""); setFlagFilters({});
  };

  const activeFilterCount = [
    positionsNr, kaufVon, kaufBis, fahrzeugart, aufbauArt, fabrikat, modellTyp,
    maxAlterJahre, fahrgestell, psVon, psBis, standtageVon, standtageBis,
    kreditorNr, firmenname, plz, ort, land, beteiligter, importNr,
  ].filter(Boolean).length + Object.keys(flagFilters).length;

  // ── Suggestions ──
  const suggestions = useMemo(() => {
    const fab = new Set<string>(), pos = new Set<string>(),
          kred = new Set<string>(), firmen = new Set<string>();
    for (const r of db.rows) {
      if (r.fabrikat)     fab.add(r.fabrikat);
      if (r.positions_nr) pos.add(r.positions_nr);
      if (r.kreditor_nr)  kred.add(r.kreditor_nr);
      if (r.firmenname)   firmen.add(r.firmenname);
    }
    return {
      fabrikat: [...fab].sort(), position: [...pos].sort(),
      kreditor: [...kred].sort(), firmenname: [...firmen].sort(),
    };
  }, [db.rows]);

  // ── Filtered rows ──
  const filtered = useMemo(() => {
    const baseRows = activeTab === "haupt"
      ? db.rows.filter((r) => r.hauptschluessel)
      : db.rows.filter((r) => r.ersatzschluessel);

    let list = [...baseRows];
    if (positionsNr.trim()) list = list.filter((r) => r.positions_nr.includes(positionsNr.trim()));
    if (kaufVon)  list = list.filter((r) => r.kaufdatum >= kaufVon);
    if (kaufBis)  list = list.filter((r) => r.kaufdatum <= kaufBis);
    if (fahrzeugart) list = list.filter((r) => r.fahrzeugart === fahrzeugart);
    if (aufbauArt)   list = list.filter((r) => r.aufbau_art === aufbauArt);
    if (fabrikat.trim()) {
      const f = fabrikat.toLowerCase();
      list = list.filter((r) => r.fabrikat.toLowerCase().includes(f));
    }
    if (modellTyp.trim()) {
      const m = modellTyp.toLowerCase();
      list = list.filter((r) => r.typ.toLowerCase().includes(m));
    }
    if (maxAlterJahre.trim()) {
      const minYear = new Date().getFullYear() - parseInt(maxAlterJahre, 10);
      list = list.filter((r) => {
        if (!r.ez) return true;
        const y = parseInt(r.ez.split("-")[1] ?? "0", 10);
        return y >= minYear;
      });
    }
    if (fahrgestell.trim()) {
      const f = fahrgestell.toLowerCase();
      list = list.filter((r) => r.fahrgestellnummer.toLowerCase().includes(f));
    }
    if (psVon.trim())        list = list.filter((r) => (r.ps ?? 0) >= parseInt(psVon, 10));
    if (psBis.trim())        list = list.filter((r) => (r.ps ?? 9999) <= parseInt(psBis, 10));
    if (standtageVon.trim()) list = list.filter((r) => (r.standtage ?? 0) >= parseInt(standtageVon, 10));
    if (standtageBis.trim()) list = list.filter((r) => (r.standtage ?? 999) <= parseInt(standtageBis, 10));
    if (kreditorNr.trim())   list = list.filter((r) => (r.kreditor_nr ?? "").includes(kreditorNr.trim()));
    if (firmenname.trim()) {
      const fn = firmenname.toLowerCase();
      list = list.filter((r) => (r.firmenname ?? "").toLowerCase().includes(fn));
    }
    if (plz.trim())  list = list.filter((r) => (r.plz ?? "").includes(plz.trim()));
    if (ort.trim())  list = list.filter((r) => (r.ort ?? "").toLowerCase().includes(ort.toLowerCase()));
    if (land.trim()) list = list.filter((r) => (r.land ?? "").toLowerCase().includes(land.toLowerCase()));
    if (beteiligter.trim()) {
      const b = beteiligter.toLowerCase();
      list = list.filter((r) => (r.beteiligter ?? "").toLowerCase().includes(b));
    }
    if (importNr.trim()) list = list.filter((r) => (r.import_nr ?? "").includes(importNr.trim()));

    (Object.entries(flagFilters) as [FlagKey, boolean][]).forEach(([key, on]) => {
      if (on) list = list.filter((r) => r[key] === true);
    });

    list.sort((a, b) => {
      switch (sortierung) {
        case "Kaufdatum":   return b.kaufdatum.localeCompare(a.kaufdatum);
        case "Fabrikat":    return a.fabrikat.localeCompare(b.fabrikat);
        case "Fahrzeugart": return a.fahrzeugart.localeCompare(b.fahrzeugart);
        case "Firmenname":  return (a.firmenname ?? "").localeCompare(b.firmenname ?? "");
        case "Standtage":   return (b.standtage ?? 0) - (a.standtage ?? 0);
        default:            return parseInt(b.positions_nr, 10) - parseInt(a.positions_nr, 10);
      }
    });
    return list;
  }, [
    db.rows, activeTab, positionsNr, kaufVon, kaufBis, fahrzeugart, aufbauArt,
    fabrikat, modellTyp, maxAlterJahre, fahrgestell, psVon, psBis,
    standtageVon, standtageBis, kreditorNr, firmenname, plz, ort, land,
    beteiligter, importNr, flagFilters, sortierung,
  ]);

  // ── Summary stats (whole db, not filtered) ──
  const stats = useMemo(() => ({
    imVorfeld:      db.rows.filter((r) => r.im_vorfeld).length,
    inAufbereitung: db.rows.filter((r) => r.in_aufbereitung).length,
    inMobile:       db.rows.filter((r) => r.in_mobile).length,
    reserviert:     db.rows.filter((r) => r.reserviert).length,
    total:          db.rows.length,
  }), [db.rows]);

  // ── Expired reservations ──
  const expiredReservations = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return db.rows.filter((r) => r.reserviert && r.reserviert_bis && r.reserviert_bis < today);
  }, [db.rows]);

  const selected = selectedId != null ? db.rows.find((r) => r.id === selectedId) : null;

  const inputCls =
    "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20";
  const labelCls = "mb-1 block text-xs font-medium text-slate-500";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-0 flex-1 flex-col p-6 pb-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">
              Bestand
              {department && (
                <span className="ml-2 text-base font-normal capitalize text-slate-400">— {department}</span>
              )}
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">Fahrzeugbestand verwalten und suchen</p>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2">
            <StatPill icon={<Truck className="h-3.5 w-3.5" />}     label="Gesamt"        value={stats.total}          color="slate"  />
            <StatPill icon={<Clock className="h-3.5 w-3.5" />}     label="Im Vorfeld"    value={stats.imVorfeld}      color="amber"  />
            <StatPill icon={<RefreshCw className="h-3.5 w-3.5" />} label="Aufbereitung"  value={stats.inAufbereitung} color="blue"   />
            <StatPill icon={<Tag className="h-3.5 w-3.5" />}       label="Reserviert"    value={stats.reserviert}     color="purple" />
            <StatPill icon={<Car className="h-3.5 w-3.5" />}       label="Mobile.de"     value={stats.inMobile}       color="teal"   />
          </div>
        </div>

        {/* Key cabinet tabs */}
        <div className="mt-4 flex gap-1 border-b border-slate-200">
          {([ ["haupt", "Hauptschlüsselkasten"], ["ersatz", "Ersatzschlüsselkasten"] ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`-mb-px rounded-t-lg border border-b-0 px-5 py-2 text-sm font-semibold transition ${
                activeTab === key
                  ? "border-slate-200 bg-white text-blue-700 shadow-sm"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Expired reservation warning ───────────────────────────────────── */}
      {expiredReservations.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="flex-1 text-sm text-amber-800">
            <span className="font-bold">
              {expiredReservations.length} Reservierung{expiredReservations.length > 1 ? "en" : ""} abgelaufen
            </span>
            {" — "}Bitte prüfen und ggf. freigeben.{" "}
            <button
              type="button"
              onClick={() => setFlag("reserviert", true)}
              className="font-semibold underline hover:text-amber-900"
            >
              Reservierte anzeigen
            </button>
          </p>
        </div>
      )}

      {/* ── Filter card ───────────────────────────────────────────────────── */}
      <div className="glass-card mb-4 overflow-hidden border-slate-200/80 shadow-sm">

        {/* ── Toolbar row ── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="text-sm font-semibold text-slate-600">Filter</span>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 ml-1">
              {positionsNr  && <ActiveChip label={`Nr: ${positionsNr}`}   onClear={() => setPositionsNr("")} />}
              {fahrzeugart  && <ActiveChip label={fahrzeugart}             onClear={() => setFahrzeugart("")} />}
              {aufbauArt    && <ActiveChip label={aufbauArt}               onClear={() => setAufbauArt("")} />}
              {fabrikat     && <ActiveChip label={fabrikat}                onClear={() => setFabrikat("")} />}
              {modellTyp    && <ActiveChip label={modellTyp}               onClear={() => setModellTyp("")} />}
              {firmenname   && <ActiveChip label={firmenname}              onClear={() => setFirmenname("")} />}
              {plz          && <ActiveChip label={`PLZ ${plz}`}           onClear={() => setPlz("")} />}
              {ort          && <ActiveChip label={ort}                     onClear={() => setOrt("")} />}
              {(kaufVon || kaufBis) && (
                <ActiveChip
                  label={`Kauf: ${kaufVon || "…"} – ${kaufBis || "…"}`}
                  onClear={() => { setKaufVon(""); setKaufBis(""); }}
                />
              )}
              {Object.keys(flagFilters).length > 0 && (
                <ActiveChip
                  label={`${Object.keys(flagFilters).length} Status-Flag${Object.keys(flagFilters).length > 1 ? "s" : ""}`}
                  onClear={() => setFlagFilters({})}
                />
              )}
            </div>
          )}

          <div className="flex-1" />

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={showAll}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              Zurücksetzen
            </button>
          )}

          <div className="h-4 w-px bg-slate-200" />

          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortierung}
              onChange={(e) => setSortierung(e.target.value)}
              className="h-7 rounded-lg border-0 bg-transparent pr-6 text-xs font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
            >
              {SORT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200" />

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              showFilters
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {showFilters ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showFilters ? "Einklappen" : "Filter"}
          </button>
        </div>

        {/* ── Filter fields ── */}
        {showFilters && (
          <div className="px-4 py-4 space-y-0 divide-y divide-slate-100">

            {/* Group 1: Identifikation */}
            <div className="pb-4">
              <FilterGroupLabel icon={<Hash className="h-3.5 w-3.5" />} label="Identifikation" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                <FF label="PositionsNr">
                  <SuggestTextInput value={positionsNr} onChange={(e) => setPositionsNr(e.target.value)}
                    suggestions={suggestions.position} type="text" className={inputCls} />
                </FF>
                <FF label="Fahrgestellnummer" className="lg:col-span-2">
                  <input type="text" value={fahrgestell} onChange={(e) => setFahrgestell(e.target.value)} className={inputCls} />
                </FF>
                <FF label="Kaufdatum von">
                  <input type="date" value={kaufVon} onChange={(e) => setKaufVon(e.target.value)} className={inputCls} />
                </FF>
                <FF label="bis">
                  <input type="date" value={kaufBis} onChange={(e) => setKaufBis(e.target.value)} className={inputCls} />
                </FF>
                <FF label="ImportNr">
                  <input type="text" value={importNr} onChange={(e) => setImportNr(e.target.value)} className={inputCls} />
                </FF>
              </div>
            </div>

            {/* Group 2: Fahrzeug */}
            <div className="py-4">
              <FilterGroupLabel icon={<Wrench className="h-3.5 w-3.5" />} label="Fahrzeug" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                <FF label="Fahrzeugart">
                  <select value={fahrzeugart} onChange={(e) => setFahrzeugart(e.target.value)} className={inputCls}>
                    {FAHRZEUGART_OPTIONS.map((o) => <option key={o || "_"} value={o}>{o || "Alle"}</option>)}
                  </select>
                </FF>
                <FF label="AufbauArt">
                  <select value={aufbauArt} onChange={(e) => setAufbauArt(e.target.value)} className={inputCls}>
                    {AUFBAU_OPTIONS.map((o) => <option key={o || "_"} value={o}>{o || "Alle"}</option>)}
                  </select>
                </FF>
                <FF label="Fabrikat">
                  <SuggestTextInput value={fabrikat} onChange={(e) => setFabrikat(e.target.value)}
                    suggestions={suggestions.fabrikat} type="text" className={inputCls} />
                </FF>
                <FF label="Modell / Typ">
                  <input type="text" value={modellTyp} onChange={(e) => setModellTyp(e.target.value)} className={inputCls} />
                </FF>
                <FF label="Max. Alter (J.)">
                  <input type="number" value={maxAlterJahre} onChange={(e) => setMaxAlterJahre(e.target.value)}
                    placeholder="z. B. 10" className={inputCls} />
                </FF>
                <FF label="PS von / bis">
                  <div className="flex gap-1.5">
                    <input type="number" value={psVon} onChange={(e) => setPsVon(e.target.value)}
                      placeholder="min" className={inputCls} />
                    <input type="number" value={psBis} onChange={(e) => setPsBis(e.target.value)}
                      placeholder="max" className={inputCls} />
                  </div>
                </FF>
              </div>
            </div>

            {/* Group 3: Standort */}
            <div className="py-4">
              <FilterGroupLabel icon={<MapPin className="h-3.5 w-3.5" />} label="Standort &amp; Kreditor" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                <FF label="KreditorNr">
                  <SuggestTextInput value={kreditorNr} onChange={(e) => setKreditorNr(e.target.value)}
                    suggestions={suggestions.kreditor} type="text" className={inputCls} />
                </FF>
                <FF label="Firmenname" className="lg:col-span-2">
                  <SuggestTextInput value={firmenname} onChange={(e) => setFirmenname(e.target.value)}
                    suggestions={suggestions.firmenname} type="text" className={inputCls} />
                </FF>
                <FF label="PLZ">
                  <input type="text" value={plz} onChange={(e) => setPlz(e.target.value)} className={inputCls} />
                </FF>
                <FF label="Ort">
                  <input type="text" value={ort} onChange={(e) => setOrt(e.target.value)} className={inputCls} />
                </FF>
                <FF label="Land">
                  <input type="text" value={land} onChange={(e) => setLand(e.target.value)} className={inputCls} />
                </FF>
              </div>
            </div>

            {/* Group 4: Sonstige + Standtage */}
            <div className="py-4">
              <FilterGroupLabel icon={<Calendar className="h-3.5 w-3.5" />} label="Sonstige" />
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-8">
                <FF label="Standtage von">
                  <input type="number" value={standtageVon} onChange={(e) => setStandtageVon(e.target.value)}
                    placeholder="min" className={inputCls} />
                </FF>
                <FF label="bis">
                  <input type="number" value={standtageBis} onChange={(e) => setStandtageBis(e.target.value)}
                    placeholder="max" className={inputCls} />
                </FF>
                <FF label="Beteiligter">
                  <input type="text" value={beteiligter} onChange={(e) => setBeteiligter(e.target.value)} className={inputCls} />
                </FF>
              </div>
            </div>

            {/* Group 5: Status flags */}
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setShowFlags((v) => !v)}
                className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600"
              >
                <Tag className="h-3.5 w-3.5" />
                Status-Flags
                {Object.keys(flagFilters).length > 0 && (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">
                    {Object.keys(flagFilters).length}
                  </span>
                )}
                {showFlags ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {showFlags && (
                <div className="flex flex-wrap gap-2">
                  {FLAG_FILTERS.map(({ key, label, color }) => {
                    const active = Boolean(flagFilters[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFlag(key, !active)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                          active
                            ? `${flagPill(color)} border-transparent shadow-sm`
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                        }`}
                      >
                        {active && <X className="h-3 w-3 opacity-70" />}
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── Table card ────────────────────────────────────────────────────── */}
      <div className="glass-card flex min-h-0 flex-1 flex-col overflow-hidden border-blue-100/60 shadow-blue-900/5">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
              <tr>
                {[
                  "Pos.", "Kaufdatum", "Fahrzeugart", "AufbauArt",
                  "Fabrikat", "Typ", "EZ", "Fahrgestellnummer",
                  "PLZ", "Ort", "Firmenname", "Status",
                ].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-slate-300" />
                      <p className="font-medium text-slate-500">Keine Fahrzeuge gefunden</p>
                      <p className="text-xs text-slate-400">Filter anpassen oder „Alle" klicken.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
                    className={`group cursor-pointer border-l-4 transition ${fahrzeugartBorder(row.fahrzeugart)} ${
                      selectedId === row.id
                        ? "bg-blue-50"
                        : i % 2 === 1
                          ? "bg-slate-50/50 hover:bg-blue-50/30"
                          : "hover:bg-blue-50/20"
                    }`}
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-bold tabular-nums text-slate-700">
                      {row.positions_nr}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-500">
                      {fmt(row.kaufdatum)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${fahrzeugartBadge(row.fahrzeugart)}`}>
                        {row.fahrzeugart}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{row.aufbau_art}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-slate-700">{row.fabrikat}</td>
                    <td className="max-w-[140px] truncate px-3 py-2.5 text-slate-600" title={row.typ}>{row.typ}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-500">{row.ez ?? "—"}</td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 font-mono text-xs text-slate-400" title={row.fahrgestellnummer}>
                      {row.fahrgestellnummer}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 tabular-nums text-slate-500">{row.plz ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{row.ort ?? "—"}</td>
                    <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-600" title={row.firmenname}>
                      {row.firmenname ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {row.reserviert      && <StatusChip label="Reserviert"   color="blue"   />}
                        {row.angezahlt       && <StatusChip label="Angezahlt"    color="green"  />}
                        {row.angefragt       && <StatusChip label="Angefragt"    color="purple" />}
                        {row.fehlende_kosten && <StatusChip label="Kosten fehlen" color="red"   />}
                        {row.reinigung_offen && <StatusChip label="Reinigung"    color="orange" />}
                        {row.in_aufbereitung && <StatusChip label="Aufbereitung" color="blue"   />}
                        {row.im_vorfeld      && <StatusChip label="Im Vorfeld"   color="slate"  />}
                        {row.offene_auftraege && <StatusChip label="Off. Aufträge" color="red"  />}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer stats */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex flex-wrap gap-5">
              <span>
                <span className="font-bold tabular-nums text-amber-700">{stats.imVorfeld}</span>
                {" "}× Im Vorfeld
              </span>
              <span>
                <span className="font-bold tabular-nums text-blue-700">{stats.inAufbereitung}</span>
                {" "}× In der Aufbereitung
              </span>
              <span>
                <span className="font-bold tabular-nums text-teal-700">{stats.inMobile}</span>
                {" "}× in Mobile.de insertiert
              </span>
            </div>
            <span>
              Angezeigte Fahrzeuge:{" "}
              <span className="font-bold tabular-nums text-slate-700">{filtered.length}</span>
              {" / "}{db.rows.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Add vehicle button (floating) ─────────────────────────────────── */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Neues Fahrzeug erfassen
        </button>
      </div>

      {/* ── Detail drawer ─────────────────────────────────────────────────── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="flex h-full w-full max-w-lg shrink-0 flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${fahrzeugartBadge(selected.fahrzeugart)}`}>
                    {selected.fahrzeugart}
                  </span>
                  <span className="text-sm text-slate-400">Pos. {selected.positions_nr}</span>
                </div>
                <h2 className="mt-2 text-xl font-bold text-slate-800">
                  {selected.fabrikat} {selected.typ}
                </h2>
                <p className="mt-0.5 font-mono text-xs text-slate-400">{selected.fahrgestellnummer}</p>
              </div>
              <button type="button" onClick={() => setSelectedId(null)}
                className="shrink-0 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-4">

              <div className="grid grid-cols-2 gap-3">
                {([
                  ["Kaufdatum",  fmt(selected.kaufdatum)],
                  ["EZ",         selected.ez ?? "—"],
                  ["AufbauArt",  selected.aufbau_art],
                  ["PS",         selected.ps ? `${selected.ps} PS` : "—"],
                  ["KM-Stand",   selected.km_stand ? `${selected.km_stand.toLocaleString("de-DE")} km` : "—"],
                  ["Standtage",  selected.standtage != null ? `${selected.standtage} Tage` : "—"],
                  ["Letzte KZ",  selected.letzte_kz ?? "—"],
                  ["Einkäufer",  selected.einkaeufer ?? "—"],
                ] as const).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                    <p className="mt-0.5 font-semibold text-slate-700">{v}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-100 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Kreditor / Standort</p>
                <p className="font-semibold text-slate-700">{selected.firmenname ?? "—"}</p>
                {selected.plz && <p className="text-sm text-slate-500">{selected.plz} {selected.ort}</p>}
                {selected.land && <p className="text-xs text-slate-400">{selected.land}</p>}
                {selected.kreditor_nr && <p className="mt-0.5 text-xs text-slate-400">KreditorNr: {selected.kreditor_nr}</p>}
              </div>

              {selected.reserviert && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    <CheckCircle2 className="h-3 w-3" />Reserviert
                  </p>
                  <p className="font-semibold text-slate-700">{selected.reserviert_name ?? "—"}</p>
                  {selected.reserviert_bis && <p className="text-sm text-slate-500">bis {fmt(selected.reserviert_bis)}</p>}
                  {selected.reserviert_preis != null && (
                    <p className="mt-1 font-mono text-sm font-bold text-blue-700">
                      {selected.reserviert_preis.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}
                    </p>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Status-Flags</p>
                <div className="flex flex-wrap gap-1.5">
                  {FLAG_FILTERS.filter(({ key }) => selected[key]).map(({ label, color }) => (
                    <span key={label} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${flagPill(color)}`}>
                      {label}
                    </span>
                  ))}
                  {!FLAG_FILTERS.some(({ key }) => selected[key]) && (
                    <span className="text-xs text-slate-400">Keine aktiven Flags</span>
                  )}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-100 px-6 py-4 flex gap-2">
              <button type="button"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
                <Info className="h-4 w-4" />Bearbeiten
              </button>
              <button type="button" onClick={() => setSelectedId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatPill({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number;
  color: "slate" | "amber" | "blue" | "purple" | "teal";
}) {
  const cls = { slate: "bg-slate-100 text-slate-700", amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800", purple: "bg-purple-100 text-purple-800",
    teal: "bg-teal-100 text-teal-800" }[color];
  return (
    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${cls}`}>
      {icon}
      <span className="tabular-nums font-bold">{value}</span>
      <span className="font-normal opacity-75">{label}</span>
    </div>
  );
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${flagPill(color)}`}>
      {label}
    </span>
  );
}

/** Small dismissable chip shown in the toolbar for each active filter. */
function ActiveChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-blue-700">
      {label}
      <button type="button" onClick={onClear} className="rounded-full p-0.5 hover:bg-blue-200">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

/** Labelled section header inside the filter panel. */
function FilterGroupLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs font-semibold text-slate-500"
        dangerouslySetInnerHTML={{ __html: label }} />
      <span className="flex-1 border-t border-slate-100" />
    </div>
  );
}

/** Single labelled field wrapper. */
function FF({
  label, children, className = "",
}: {
  label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}
