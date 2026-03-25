/**
 * TaskContextFields
 * Renders preset-specific structured fields with live DB-backed suggestions.
 * Each preset shows 2-3 focused fields; selecting a customer auto-fills related values.
 */
import { useMemo } from "react";
import { SuggestTextInput } from "../components/SuggestTextInput";
import { loadKundenDb } from "../store/kundenStore";
import { loadAngeboteDb } from "../store/angeboteStore";
import { loadRechnungenDb } from "../store/rechnungenStore";
import { loadAbholauftraegeDb } from "../store/abholauftraegeStore";
import { useLanguage } from "../contexts/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContextData = Record<string, string>;

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  suggestions: string[];
  /** If set, when this field matches a record, auto-fill these other keys. */
  autoFill?: (value: string, db: AllDbs) => Partial<ContextData>;
  required?: boolean;
}

interface AllDbs {
  kunden: ReturnType<typeof loadKundenDb>;
  angebote: ReturnType<typeof loadAngeboteDb>;
  rechnungen: ReturnType<typeof loadRechnungenDb>;
  abholauftraege: ReturnType<typeof loadAbholauftraegeDb>;
}

// ─── Unique sorted helper ─────────────────────────────────────────────────────

function uniq(arr: (string | undefined | null)[]): string[] {
  const s = new Set<string>();
  for (const v of arr) {
    const t = v?.trim();
    if (t) s.add(t);
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

// ─── Per-preset field definitions (built lazily from dbs) ────────────────────

type TFn = (key: string, fallback?: string) => string;

function buildFields(preset: string, dbs: AllDbs, t: TFn): FieldDef[] {
  const k = dbs.kunden.kunden;
  const w = dbs.kunden.kundenWash;
  const a = dbs.angebote.angebote;
  const r = dbs.rechnungen.rows;
  const ab = dbs.abholauftraege.rows;

  const firmennamen = uniq(k.map((x) => x.firmenname));
  const kundenNrs = uniq(k.map((x) => x.kunden_nr));

  switch (preset) {
    // ── Angebot nachfassen ─────────────────────────────────────────────────
    case "offer":
      return [
        {
          key: "firmenname",
          label: t("ctxLabelCustomerName", "Customer name"),
          placeholder: t("ctxPhCustomerName", "Enter company name or customer no…"),
          suggestions: uniq([...firmennamen, ...kundenNrs]),
          autoFill: (val, dbs) => {
            const match =
              dbs.kunden.kunden.find(
                (x) =>
                  x.firmenname.toLowerCase() === val.toLowerCase() ||
                  x.kunden_nr.toLowerCase() === val.toLowerCase()
              );
            if (!match) return {};
            return {
              firmenname: match.firmenname,
              kunden_nr: match.kunden_nr,
            };
          },
          required: true,
        },
        {
          key: "kunden_nr",
          label: t("ctxLabelCustomerNr", "Customer no."),
          placeholder: t("ctxPhCustomerNr", "e.g. KU-0001"),
          suggestions: kundenNrs,
          autoFill: (val, dbs) => {
            const match = dbs.kunden.kunden.find(
              (x) => x.kunden_nr.toLowerCase() === val.toLowerCase()
            );
            return match ? { firmenname: match.firmenname } : {};
          },
        },
        {
          key: "angebot_nr",
          label: t("ctxLabelOfferNr", "Offer no."),
          placeholder: t("ctxPhOfferNr", "e.g. A-2025-001"),
          suggestions: uniq(a.map((x) => x.angebot_nr)),
          autoFill: (val, dbs) => {
            const match = dbs.angebote.angebote.find(
              (x) => x.angebot_nr.toLowerCase() === val.toLowerCase()
            );
            return match ? { firmenname: match.firmenname } : {};
          },
        },
      ];

    // ── Fahrzeug-Übergabe vorbereiten ──────────────────────────────────────
    case "handover":
      return [
        {
          key: "firmenname",
          label: t("ctxLabelCustomerName", "Customer name"),
          placeholder: t("ctxPhCustomerName", "Enter company name or customer no…"),
          suggestions: firmennamen,
          required: true,
        },
        {
          key: "fabrikat",
          label: t("ctxLabelBrand", "Brand / Make"),
          placeholder: t("ctxPhBrand", "e.g. Mercedes, BMW…"),
          suggestions: uniq([
            ...a.map((x) => x.fabrikat),
            ...ab.map((x) => x.fabrikat),
          ]),
        },
        {
          key: "typ",
          label: t("ctxLabelType", "Type / Model"),
          placeholder: t("ctxPhType", "e.g. Sprinter 316, X3…"),
          suggestions: uniq([
            ...a.map((x) => x.typ),
            ...ab.map((x) => x.typ),
          ]),
        },
        {
          key: "fahrgestellnummer",
          label: t("ctxLabelVin", "Chassis no."),
          placeholder: t("ctxPhVin", "VIN / chassis no. (optional)"),
          suggestions: uniq([
            ...a.map((x) => x.fahrgestellnummer),
            ...ab.map((x) => x.fahrgestellnummer),
          ]),
        },
      ];

    // ── Rechnung prüfen ────────────────────────────────────────────────────
    case "invoice":
      return [
        {
          key: "rechn_nr",
          label: t("ctxLabelInvoiceNr", "Invoice no."),
          placeholder: t("ctxPhInvoiceNr", "e.g. R-2025-0042"),
          suggestions: uniq(r.map((x) => x.rechn_nr)),
          autoFill: (val, dbs) => {
            const match = dbs.rechnungen.rows.find(
              (x) => x.rechn_nr.toLowerCase() === val.toLowerCase()
            );
            return match
              ? { firmenname: match.firmenname, kunden_nr: match.kunden_nr }
              : {};
          },
          required: true,
        },
        {
          key: "firmenname",
          label: t("ctxLabelCustomer", "Customer"),
          placeholder: t("ctxPhCustomerAuto", "Auto-filled or manual"),
          suggestions: uniq([...r.map((x) => x.firmenname), ...firmennamen]),
        },
        {
          key: "kunden_nr",
          label: t("ctxLabelCustomerNr", "Customer no."),
          placeholder: t("ctxPhCustomerNr", "e.g. KU-0001"),
          suggestions: uniq([...r.map((x) => x.kunden_nr), ...kundenNrs]),
        },
      ];

    // ── Waschtermin bestätigen ─────────────────────────────────────────────
    case "wash":
      return [
        {
          key: "firmenname",
          label: t("ctxLabelCustomerName", "Customer name"),
          placeholder: t("ctxPhCustomerName", "Enter company name or customer no…"),
          suggestions: firmennamen,
          autoFill: (val, dbs) => {
            const kd = dbs.kunden.kunden.find(
              (x) => x.firmenname.toLowerCase() === val.toLowerCase()
            );
            if (!kd) return {};
            const wash = dbs.kunden.kundenWash.find((w) => w.kunden_id === kd.id);
            return {
              kunden_nr: kd.kunden_nr,
              kennzeichen: wash?.kennzeichen ?? "",
              wasch_programm: wash?.wasch_programm ?? "",
            };
          },
          required: true,
        },
        {
          key: "kennzeichen",
          label: t("ctxLabelLicensePlate", "License plate"),
          placeholder: t("ctxPhLicensePlate", "e.g. DO-AB 123"),
          suggestions: uniq(w.map((x) => x.kennzeichen)),
          autoFill: (val, dbs) => {
            const wash = dbs.kunden.kundenWash.find(
              (w) => w.kennzeichen?.toLowerCase() === val.toLowerCase()
            );
            if (!wash) return {};
            const kd = dbs.kunden.kunden.find((k) => k.id === wash.kunden_id);
            return {
              firmenname: kd?.firmenname ?? "",
              wasch_programm: wash.wasch_programm ?? "",
            };
          },
        },
        {
          key: "wasch_programm",
          label: t("ctxLabelWashProgram", "Wash program"),
          placeholder: t("ctxPhWashProgram", "e.g. Basic, Premium…"),
          suggestions: uniq(w.map((x) => x.wasch_programm)),
        },
      ];

    // ── Kunde zurückrufen ──────────────────────────────────────────────────
    case "callback":
      return [
        {
          key: "firmenname",
          label: t("ctxLabelCustomerName", "Customer name"),
          placeholder: t("ctxPhCustomerName", "Enter company name or customer no…"),
          suggestions: firmennamen,
          autoFill: (val, dbs) => {
            const match = dbs.kunden.kunden.find(
              (x) => x.firmenname.toLowerCase() === val.toLowerCase()
            );
            return match
              ? {
                  kunden_nr: match.kunden_nr,
                  telefonnummer: match.telefonnummer ?? "",
                  ansprechpartner: match.ansprechpartner ?? "",
                }
              : {};
          },
          required: true,
        },
        {
          key: "telefonnummer",
          label: t("ctxLabelPhone", "Phone"),
          placeholder: t("ctxPhPhone", "e.g. 0231-123456"),
          suggestions: uniq(k.map((x) => x.telefonnummer)),
        },
        {
          key: "ansprechpartner",
          label: t("ctxLabelContact", "Contact person"),
          placeholder: t("ctxPhContact", "e.g. Mr. Müller"),
          suggestions: uniq(k.map((x) => x.ansprechpartner)),
        },
      ];

    // ── Ersatzteil bestellen ───────────────────────────────────────────────
    case "parts":
      return [
        {
          key: "part_name",
          label: t("ctxLabelPartName", "Spare part / Article"),
          placeholder: t("ctxPhPartName", "e.g. brake disc front, filter…"),
          suggestions: [],
          required: true,
        },
        {
          key: "fabrikat",
          label: t("ctxLabelVehicle", "Vehicle / Brand"),
          placeholder: t("ctxPhVehicle", "e.g. Mercedes Sprinter"),
          suggestions: uniq([
            ...a.map((x) => `${x.fabrikat} ${x.typ}`.trim()),
            ...ab.map((x) => `${x.fabrikat} ${x.typ}`.trim()),
          ]),
        },
        {
          key: "firmenname",
          label: t("ctxLabelSupplier", "Supplier / Customer"),
          placeholder: t("ctxPhSupplier", "Optional — company name"),
          suggestions: firmennamen,
        },
      ];

    default:
      return [];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TaskContextFieldsProps {
  preset: string;
  contextData: ContextData;
  onChange: (next: ContextData) => void;
  inputCls: string;
  labelCls: string;
}

export function TaskContextFields({
  preset,
  contextData,
  onChange,
  inputCls,
  labelCls,
}: TaskContextFieldsProps) {
  const { t } = useLanguage();

  // Load all DBs once
  const dbs = useMemo<AllDbs>(
    () => ({
      kunden: loadKundenDb(),
      angebote: loadAngeboteDb(),
      rechnungen: loadRechnungenDb(),
      abholauftraege: loadAbholauftraegeDb(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preset]
  );

  const fields = useMemo(() => buildFields(preset, dbs, t), [preset, dbs, t]);

  if (fields.length === 0) return null;

  const handleChange = (field: FieldDef, value: string) => {
    const next: ContextData = { ...contextData, [field.key]: value };
    if (value.trim() && field.autoFill) {
      const fills = field.autoFill(value, dbs);
      for (const [k, v] of Object.entries(fills)) {
        if (v !== undefined && !next[k]) {
          next[k] = v;
        }
      }
    }
    onChange(next);
  };

  const [first, ...rest] = fields;

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {t("taskDetailsLabel", "Task details")}
      </p>

      {/* First field always full-width */}
      {first && (
        <ContextField
          field={first}
          value={contextData[first.key] ?? ""}
          onChange={(v) => handleChange(first, v)}
          inputCls={inputCls}
          labelCls={labelCls}
        />
      )}

      {/* Remaining fields in a 2-column grid */}
      {rest.length > 0 && (
        <div className={`grid gap-2 ${rest.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
          {rest.map((field) => (
            <ContextField
              key={field.key}
              field={field}
              value={contextData[field.key] ?? ""}
              onChange={(v) => handleChange(field, v)}
              inputCls={inputCls}
              labelCls={labelCls}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single field ─────────────────────────────────────────────────────────────

interface ContextFieldProps {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
  inputCls: string;
  labelCls: string;
}

function ContextField({ field, value, onChange, inputCls, labelCls }: ContextFieldProps) {
  return (
    <div>
      <label className={labelCls}>
        {field.label}
        {field.required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <SuggestTextInput
        type="text"
        className={inputCls}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        suggestions={field.suggestions}
      />
    </div>
  );
}
