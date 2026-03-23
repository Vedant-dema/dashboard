import { useEffect, useState, useCallback } from "react";
import { X, Droplets } from "lucide-react";
import type { NewKundeInput, KundenWashUpsertFields } from "../store/kundenStore";
import type { CustomerFieldSuggestions } from "../store/customerFieldSuggestions";
import { SuggestTextInput } from "./SuggestTextInput";
import type { DepartmentArea } from "../types/departmentArea";

type TabId = "kunde" | "adresse" | "art" | "waschanlage";

const ZUSTAENDIGE_OPTIONS = [
  "nicht zugeordnet",
  "Liciu Ana-Maria",
  "Mitsos Deligiannis",
  "Anna Schmidt",
  "Team Verkauf",
];

const LAND_OPTIONS: { code: string; label: string }[] = [
  { code: "DE", label: "Deutschland" },
  { code: "AT", label: "Österreich" },
  { code: "CH", label: "Schweiz" },
  { code: "NL", label: "Niederlande" },
  { code: "PL", label: "Polen" },
  { code: "OTHER", label: "Sonstiges" },
];

const ART_LAND_OPTIONS = ["IL", "EU", "Drittland", "Inland", "—"];

const FAHRZEUG_TYPEN = ["", "PKW", "LKW", "Transporter", "Bus", "Sonstiges"];

const WASCH_PROGRAMME = [
  "",
  "Standard",
  "Premium",
  "Unterboden",
  "Komplett",
  "Lkw-Wäsche",
  "Nach Vereinbarung",
];

function emptyToUndef(s: string): string | undefined {
  const t = s.trim();
  if (!t || t === "—") return undefined;
  return t;
}

function initialForm() {
  return {
    branche: "",
    fzgHandel: "" as "" | "ja" | "nein",
    juristische_person: false,
    natuerliche_person: false,
    gesellschaftsform: "",
    ansprache: "",
    firmenvorsatz: "",
    firmenname: "",
    bemerkungen: "",
    zustaendige_person_name: "nicht zugeordnet",
    strasse: "",
    plz: "",
    ort: "",
    land_code: "DE",
    art_land_code: "IL",
    ust_id_nr: "",
    steuer_nr: "",
    branchen_nr: "",
    ansprechpartner: "",
    telefonnummer: "",
    faxnummer: "",
    email: "",
    internet_adr: "",
    bemerkungen_kontakt: "",
    faxen_flag: false,
    art_kunde: "",
    buchungskonto_haupt: "",
    includeWashProfile: false,
    wash_bukto: "",
    wash_limit: "0",
    wash_rechnung_zusatz: "",
    wash_rechnung_plz: "",
    wash_rechnung_ort: "",
    wash_rechnung_strasse: "",
    wash_kunde_gesperrt: false,
    wash_kennzeichen: "",
    wasch_fahrzeug_typ: "",
    wasch_programm: "",
    wasch_intervall: "",
    wash_bankname: "",
    wash_bic: "",
    wash_iban: "",
    wash_wichtige_infos: "",
    wash_bemerkungen: "",
    wash_lastschrift: false,
  };
}

type FormState = ReturnType<typeof initialForm>;

function formToPayload(form: FormState): NewKundeInput {
  const fzg_haendler =
    form.fzgHandel === "ja" ? true : form.fzgHandel === "nein" ? false : undefined;
  const z = form.zustaendige_person_name.trim();
  const zustaendige_person_name =
    z && z !== "nicht zugeordnet" ? z : undefined;

  return {
    firmenname: form.firmenname.trim(),
    branche: emptyToUndef(form.branche),
    fzg_haendler,
    juristische_person: form.juristische_person,
    natuerliche_person: form.natuerliche_person,
    gesellschaftsform: emptyToUndef(form.gesellschaftsform),
    ansprache: emptyToUndef(form.ansprache),
    firmenvorsatz: emptyToUndef(form.firmenvorsatz),
    bemerkungen: emptyToUndef(form.bemerkungen),
    zustaendige_person_name,
    strasse: emptyToUndef(form.strasse),
    plz: emptyToUndef(form.plz),
    ort: emptyToUndef(form.ort),
    land_code: form.land_code,
    art_land_code: emptyToUndef(form.art_land_code),
    ust_id_nr: emptyToUndef(form.ust_id_nr),
    steuer_nr: emptyToUndef(form.steuer_nr),
    branchen_nr: emptyToUndef(form.branchen_nr),
    ansprechpartner: emptyToUndef(form.ansprechpartner),
    telefonnummer: emptyToUndef(form.telefonnummer),
    faxnummer: emptyToUndef(form.faxnummer),
    email: emptyToUndef(form.email),
    internet_adr: emptyToUndef(form.internet_adr),
    bemerkungen_kontakt: emptyToUndef(form.bemerkungen_kontakt),
    faxen_flag: form.faxen_flag,
    art_kunde: emptyToUndef(form.art_kunde),
    buchungskonto_haupt: emptyToUndef(form.buchungskonto_haupt),
  };
}

function washFormToPayload(form: FormState): KundenWashUpsertFields {
  const limit = Math.max(0, Number(form.wash_limit) || 0);
  return {
    bukto: emptyToUndef(form.wash_bukto),
    limit_betrag: limit,
    rechnung_zusatz: emptyToUndef(form.wash_rechnung_zusatz),
    rechnung_plz: emptyToUndef(form.wash_rechnung_plz),
    rechnung_ort: emptyToUndef(form.wash_rechnung_ort),
    rechnung_strasse: emptyToUndef(form.wash_rechnung_strasse),
    kunde_gesperrt: form.wash_kunde_gesperrt,
    bankname: emptyToUndef(form.wash_bankname),
    bic: emptyToUndef(form.wash_bic),
    iban: emptyToUndef(form.wash_iban),
    wichtige_infos: emptyToUndef(form.wash_wichtige_infos),
    bemerkungen: emptyToUndef(form.wash_bemerkungen),
    lastschrift: form.wash_lastschrift,
    kennzeichen: emptyToUndef(form.wash_kennzeichen),
    wasch_fahrzeug_typ: emptyToUndef(form.wasch_fahrzeug_typ),
    wasch_programm: emptyToUndef(form.wasch_programm),
    wasch_intervall: emptyToUndef(form.wasch_intervall),
  };
}

const tabLabels: Record<TabId, string> = {
  kunde: "Kunde",
  adresse: "Adresse (Tel/Fax)",
  art: "Art / Buchungskonto",
  waschanlage: "Waschanlage",
};

const inputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none ring-slate-200/50 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

type Props = {
  open: boolean;
  onClose: () => void;
  department?: DepartmentArea;
  /** Vorschau der nächsten automatischen KundenNr. (wird beim Speichern vergeben). */
  nextKundenNrPreview: string;
  /** Vorschläge aus bestehenden Kunden/Wash (<datalist>, kein Browser-Autofill). */
  fieldSuggestions: CustomerFieldSuggestions;
  /** `wash` gesetzt → nach createKunde wird upsertKundenWash aufgerufen (wie beim Bearbeiten). */
  onSubmit: (data: NewKundeInput, wash: KundenWashUpsertFields | null) => void;
};

export function NewCustomerModal({
  open,
  onClose,
  department,
  nextKundenNrPreview,
  fieldSuggestions,
  onSubmit,
}: Props) {
  const [tab, setTab] = useState<TabId>("kunde");
  const [form, setForm] = useState<FormState>(initialForm);
  const [aufnahmePreview, setAufnahmePreview] = useState("");

  useEffect(() => {
    if (open) {
      setForm({
        ...initialForm(),
        includeWashProfile: department === "waschanlage",
      });
      setTab("kunde");
      setAufnahmePreview(
        new Date().toLocaleString("de-DE", { dateStyle: "short", timeStyle: "medium" })
      );
    }
  }, [open, department]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const handleSave = () => {
    if (!form.firmenname.trim()) {
      alert("Bitte geben Sie einen Firmennamen ein.");
      setTab("kunde");
      return;
    }
    const wash = form.includeWashProfile ? washFormToPayload(form) : null;
    onSubmit(formToPayload(form), wash);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-[2px] sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-kunde-title"
      >
        {/* Title bar — inspired by legacy DEMA header */}
        <div className="relative flex shrink-0 flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 pr-14 text-white sm:flex-nowrap sm:px-6 sm:pr-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 id="new-kunde-title" className="text-lg font-bold tracking-tight sm:text-xl">
                Kundendaten
              </h2>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-blue-100">
                (Neu)
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              DEMA Management · <code className="rounded bg-black/20 px-1">kunden</code>
              {", optional "}
              <code className="rounded bg-black/20 px-1">kunden_wash</code> (Tab Waschanlage)
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Aufnahme
            </p>
            <p className="text-sm font-semibold tabular-nums text-white">{aufnahmePreview}</p>
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

        {/* Tabs */}
        <div className="flex shrink-0 gap-0 border-b border-slate-200 bg-slate-50/90 px-4 pt-2 sm:px-5">
          {(Object.keys(tabLabels) as TabId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                tab === id
                  ? id === "waschanlage"
                    ? "border-cyan-600 text-cyan-800"
                    : "border-blue-600 text-blue-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {id === "waschanlage" ? (
                <Droplets className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
              ) : null}
              {tabLabels[id]}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/40 px-4 py-5 sm:px-6">
          {tab === "kunde" && (
            <div className="mx-auto max-w-4xl space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>KundenNr. (automatisch)</label>
                  <div
                    className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 font-mono text-sm font-semibold text-slate-800"
                    title="Wird beim Speichern vergeben"
                  >
                    {nextKundenNrPreview}
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500">
                    Fortlaufende Nummer — keine Eingabe nötig.
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Branche</label>
                  <SuggestTextInput
                    type="text"
                    value={form.branche}
                    onChange={(e) => set("branche", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.branche}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
              </div>

              <div>
                <span className={labelClass}>FZG-Händler</span>
                <div className="mt-1 flex flex-wrap gap-3">
                  {(["ja", "nein"] as const).map((v) => (
                    <label
                      key={v}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                        form.fzgHandel === v
                          ? "border-blue-500 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fzg"
                        checked={form.fzgHandel === v}
                        onChange={() => set("fzgHandel", v)}
                        className="border-slate-300 text-blue-600"
                      />
                      {v.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.juristische_person}
                    onChange={(e) => set("juristische_person", e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  Juristische Person / Personengesellschaft
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.natuerliche_person}
                    onChange={(e) => set("natuerliche_person", e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  Natürliche Person
                </label>
              </div>

              <div>
                <label className={labelClass}>Gesellschaftsform</label>
                <SuggestTextInput
                  type="text"
                  value={form.gesellschaftsform}
                  onChange={(e) => set("gesellschaftsform", e.target.value)}
                  placeholder="z. B. GmbH, AG"
                  className={inputClass}
                  suggestions={fieldSuggestions.gesellschaftsform}
                  title="Vorschläge aus gespeicherten Kunden"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Ansprache</label>
                  <SuggestTextInput
                    type="text"
                    value={form.ansprache}
                    onChange={(e) => set("ansprache", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.ansprache}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div>
                  <label className={labelClass}>Firmenvorsatz</label>
                  <SuggestTextInput
                    type="text"
                    value={form.firmenvorsatz}
                    onChange={(e) => set("firmenvorsatz", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.firmenvorsatz}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Firmenname <span className="text-red-500">*</span>
                </label>
                <SuggestTextInput
                  type="text"
                  value={form.firmenname}
                  onChange={(e) => set("firmenname", e.target.value)}
                  className={inputClass}
                  suggestions={fieldSuggestions.firmenname}
                  title="Vorschläge aus gespeicherten Kunden"
                />
              </div>

              <div>
                <label className={labelClass}>Bemerkungen</label>
                <textarea
                  value={form.bemerkungen}
                  onChange={(e) => set("bemerkungen", e.target.value)}
                  rows={4}
                  className={`${inputClass} min-h-[100px] resize-y py-2`}
                />
              </div>

              <div>
                <label className={labelClass}>Zuständige Person für Kunden</label>
                <select
                  value={form.zustaendige_person_name}
                  onChange={(e) => set("zustaendige_person_name", e.target.value)}
                  className={inputClass}
                >
                  {ZUSTAENDIGE_OPTIONS.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {tab === "adresse" && (
            <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Adresse
                </p>
                <div>
                  <label className={labelClass}>Strasse</label>
                  <SuggestTextInput
                    type="text"
                    value={form.strasse}
                    onChange={(e) => set("strasse", e.target.value)}
                    placeholder="nicht bekannt"
                    className={inputClass}
                    suggestions={fieldSuggestions.strasse}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>PLZ</label>
                    <SuggestTextInput
                      type="text"
                      value={form.plz}
                      onChange={(e) => set("plz", e.target.value)}
                      className={inputClass}
                      suggestions={fieldSuggestions.plz}
                      title="Vorschläge aus gespeicherten Kunden"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ort</label>
                    <SuggestTextInput
                      type="text"
                      value={form.ort}
                      onChange={(e) => set("ort", e.target.value)}
                      className={inputClass}
                      suggestions={fieldSuggestions.ort}
                      title="Vorschläge aus gespeicherten Kunden"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Land</label>
                  <select
                    value={form.land_code}
                    onChange={(e) => set("land_code", e.target.value)}
                    className={inputClass}
                  >
                    {LAND_OPTIONS.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Art_Land</label>
                  <select
                    value={form.art_land_code}
                    onChange={(e) => set("art_land_code", e.target.value)}
                    className={inputClass}
                  >
                    {ART_LAND_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>UST-ID-Nr.</label>
                  <SuggestTextInput
                    type="text"
                    value={form.ust_id_nr}
                    onChange={(e) => set("ust_id_nr", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.ust_id_nr}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div>
                  <label className={labelClass}>Steuer-Nr.</label>
                  <SuggestTextInput
                    type="text"
                    value={form.steuer_nr}
                    onChange={(e) => set("steuer_nr", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.steuer_nr}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div>
                  <label className={labelClass}>Branchen-Nr.</label>
                  <SuggestTextInput
                    type="text"
                    value={form.branchen_nr}
                    onChange={(e) => set("branchen_nr", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.branchen_nr}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Kontakt
                </p>
                <div>
                  <label className={labelClass}>Ansprechpartner</label>
                  <SuggestTextInput
                    type="text"
                    value={form.ansprechpartner}
                    onChange={(e) => set("ansprechpartner", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.ansprechpartner}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div>
                  <label className={labelClass}>Telefonnummer</label>
                  <SuggestTextInput
                    type="text"
                    value={form.telefonnummer}
                    onChange={(e) => set("telefonnummer", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.telefonnummer}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div>
                  <label className={labelClass}>Faxnummer</label>
                  <SuggestTextInput
                    type="text"
                    value={form.faxnummer}
                    onChange={(e) => set("faxnummer", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.faxnummer}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div>
                  <label className={labelClass}>E-Mail</label>
                  <SuggestTextInput
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputClass}
                    suggestions={fieldSuggestions.email}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div>
                  <label className={labelClass}>Internet Adr.</label>
                  <SuggestTextInput
                    type="url"
                    value={form.internet_adr}
                    onChange={(e) => set("internet_adr", e.target.value)}
                    placeholder="https://…"
                    className={inputClass}
                    suggestions={fieldSuggestions.internet_adr}
                    title="Vorschläge aus gespeicherten Kunden"
                  />
                </div>
                <div>
                  <label className={labelClass}>Bemerkungen (Kontakt)</label>
                  <textarea
                    value={form.bemerkungen_kontakt}
                    onChange={(e) => set("bemerkungen_kontakt", e.target.value)}
                    rows={3}
                    className={`${inputClass} min-h-[80px] resize-y py-2`}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.faxen_flag}
                    onChange={(e) => set("faxen_flag", e.target.checked)}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  faxen
                </label>
              </div>
            </div>
          )}

          {tab === "art" && (
            <div className="mx-auto max-w-4xl space-y-4">
              <div>
                <label className={labelClass}>Art (Kunde)</label>
                <SuggestTextInput
                  type="text"
                  value={form.art_kunde}
                  onChange={(e) => set("art_kunde", e.target.value)}
                  className={inputClass}
                  suggestions={fieldSuggestions.art_kunde}
                  title="Vorschläge aus gespeicherten Kunden"
                />
              </div>
              <div>
                <label className={labelClass}>Buchungskonto (Haupt)</label>
                <SuggestTextInput
                  type="text"
                  value={form.buchungskonto_haupt}
                  onChange={(e) => set("buchungskonto_haupt", e.target.value)}
                  className={inputClass}
                  suggestions={fieldSuggestions.buchungskonto_haupt}
                  title="Vorschläge aus gespeicherten Kunden"
                />
              </div>
              <p className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600">
                Waschdaten (<code className="text-[10px]">kunden_wash</code>) erfassen Sie im Tab{" "}
                <strong>Waschanlage</strong> — gleiches Modell wie beim Bearbeiten eines Kunden.
              </p>
            </div>
          )}

          {tab === "waschanlage" && (
            <div className="mx-auto max-w-4xl space-y-5">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-cyan-200/80 bg-cyan-50/50 p-4 text-sm text-slate-800 shadow-sm">
                <input
                  type="checkbox"
                  checked={form.includeWashProfile}
                  onChange={(e) => set("includeWashProfile", e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-cyan-600"
                />
                <span>
                  <span className="font-semibold text-cyan-900">Waschprofil anlegen</span>
                  <span className="mt-1 block text-xs font-normal text-slate-600">
                    Speichert Zusatzdaten in <code className="text-[10px]">kunden_wash</code> (1:1 zur
                    Kunden-ID). Unter Waschanlage standardmäßig aktiv.
                  </span>
                </span>
              </label>

              {!form.includeWashProfile ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                  Aktivieren Sie „Waschprofil anlegen“, um BUKto, Limit, Rechnungsadresse, Bank und
                  Wasch-Infos zu speichern.
                </p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                      Konto &amp; Rechnung
                    </p>
                    <div>
                      <label className={labelClass}>BUKto</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_bukto}
                        onChange={(e) => set("wash_bukto", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_bukto}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Limit (€)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={form.wash_limit}
                        onChange={(e) => set("wash_limit", e.target.value)}
                        className={inputClass}
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        Limit ist nur dann aktiv, wenn Betrag &gt; 0 ist.
                      </p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.wash_kunde_gesperrt}
                        onChange={(e) => set("wash_kunde_gesperrt", e.target.checked)}
                        className="rounded border-slate-300 text-cyan-600"
                      />
                      Kunde gesperrt
                    </label>
                    <p className="border-t border-slate-100 pt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Rechnungsadresse
                    </p>
                    <div>
                      <label className={labelClass}>Rechnung-Zusatz</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_rechnung_zusatz}
                        onChange={(e) => set("wash_rechnung_zusatz", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_rechnung_zusatz}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className={labelClass}>PLZ</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_rechnung_plz}
                          onChange={(e) => set("wash_rechnung_plz", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.wash_rechnung_plz}
                          title="Vorschläge aus Waschprofilen"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className={labelClass}>Ort</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_rechnung_ort}
                          onChange={(e) => set("wash_rechnung_ort", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.wash_rechnung_ort}
                          title="Vorschläge aus Waschprofilen"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Strasse</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_rechnung_strasse}
                        onChange={(e) => set("wash_rechnung_strasse", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_rechnung_strasse}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-800">
                      Bank &amp; Wasch-Infos
                    </p>
                    <div>
                      <label className={labelClass}>Bankname</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_bankname}
                        onChange={(e) => set("wash_bankname", e.target.value)}
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_bankname}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>BIC</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_bic}
                          onChange={(e) => set("wash_bic", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.wash_bic}
                          title="Vorschläge aus Waschprofilen"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>IBAN</label>
                        <SuggestTextInput
                          type="text"
                          value={form.wash_iban}
                          onChange={(e) => set("wash_iban", e.target.value)}
                          className={inputClass}
                          suggestions={fieldSuggestions.wash_iban}
                          title="Vorschläge aus Waschprofilen"
                        />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Kennzeichen</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wash_kennzeichen}
                        onChange={(e) => set("wash_kennzeichen", e.target.value)}
                        placeholder="z. B. HH-AB 1234"
                        className={inputClass}
                        suggestions={fieldSuggestions.wash_kennzeichen}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Fahrzeugtyp</label>
                      <select
                        value={form.wasch_fahrzeug_typ}
                        onChange={(e) => set("wasch_fahrzeug_typ", e.target.value)}
                        className={inputClass}
                      >
                        {FAHRZEUG_TYPEN.map((v) => (
                          <option key={v || "—"} value={v}>
                            {v || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Waschprogramm / Tarif</label>
                      <select
                        value={form.wasch_programm}
                        onChange={(e) => set("wasch_programm", e.target.value)}
                        className={inputClass}
                      >
                        {WASCH_PROGRAMME.map((v) => (
                          <option key={v || "—"} value={v}>
                            {v || "—"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Intervall / Rhythmus</label>
                      <SuggestTextInput
                        type="text"
                        value={form.wasch_intervall}
                        onChange={(e) => set("wasch_intervall", e.target.value)}
                        placeholder="z. B. wöchentlich"
                        className={inputClass}
                        suggestions={fieldSuggestions.wasch_intervall}
                        title="Vorschläge aus Waschprofilen"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Wichtige Infos</label>
                      <textarea
                        value={form.wash_wichtige_infos}
                        onChange={(e) => set("wash_wichtige_infos", e.target.value)}
                        rows={2}
                        className={`${inputClass} min-h-[64px] resize-y py-2`}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Bemerkungen (Waschanlage)</label>
                      <textarea
                        value={form.wash_bemerkungen}
                        onChange={(e) => set("wash_bemerkungen", e.target.value)}
                        rows={3}
                        className={`${inputClass} min-h-[80px] resize-y py-2`}
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.wash_lastschrift}
                        onChange={(e) => set("wash_lastschrift", e.target.checked)}
                        className="rounded border-slate-300 text-cyan-600"
                      />
                      Lastschrift
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-5xl justify-end gap-2">
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
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
