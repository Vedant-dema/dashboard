import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { loadKundenDb } from "../store/kundenStore";
import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgString } from "./widgetConfigHelpers";
import { getAppointmentsFromConfig, type AppointmentStored } from "./dynamicWidgetLists";
import {
  APPOINTMENT_ACTIVITIES,
  appointmentTitle,
  customerOptionsFromDb,
  timeSlotOptions,
} from "./widgetListPresets";

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20";

function displayTitle(row: AppointmentStored, kunden: ReturnType<typeof loadKundenDb>["kunden"]): string {
  if (row.legacyTitle) return row.legacyTitle;
  return appointmentTitle(row.activityId, row.customerNr, kunden);
}

export function AppointmentsWidget({ config, onUpdateConfig }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("appointmentsTitle", "Heutige Termine"));
  const newLabel = cfgString(config, "newButtonLabel", t("appointmentsNew", "Neuer Termin"));

  const [dbTick, setDbTick] = useState(0);
  useEffect(() => {
    const h = () => setDbTick((n) => n + 1);
    window.addEventListener("dema-kunden-db-changed", h);
    return () => window.removeEventListener("dema-kunden-db-changed", h);
  }, []);

  const kunden = useMemo(() => loadKundenDb().kunden, [dbTick]);
  const customerOpts = useMemo(() => customerOptionsFromDb(kunden), [kunden]);
  const slots = useMemo(() => timeSlotOptions(), []);

  const list = useMemo(() => {
    const raw = getAppointmentsFromConfig(config);
    return [...raw].sort((a, b) => a.time.localeCompare(b.time));
  }, [config]);

  const persist = (next: AppointmentStored[]) => {
    onUpdateConfig?.({
      appointments: next,
      appointmentLines: undefined,
    });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formTime, setFormTime] = useState("09:00");
  const [formActivity, setFormActivity] = useState("consult");
  const [formCustomer, setFormCustomer] = useState("");

  const openAdd = () => {
    setEditingId(null);
    setFormTime("09:00");
    setFormActivity("consult");
    setFormCustomer(customerOpts[0]?.value ?? "");
    setAdding(true);
  };

  const openEdit = (row: AppointmentStored) => {
    setAdding(false);
    setEditingId(row.id);
    setFormTime(row.time);
    setFormActivity(row.activityId);
    setFormCustomer(row.customerNr);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingId(null);
  };

  const saveForm = () => {
    const next: AppointmentStored = {
      id: editingId ?? `a-${Date.now()}`,
      time: formTime,
      activityId: formActivity,
      customerNr: formCustomer,
    };
    let nextList: AppointmentStored[];
    if (editingId) {
      nextList = list.map((x) => (x.id === editingId ? { ...next, legacyTitle: undefined } : x));
    } else {
      nextList = [...list, next];
    }
    persist(nextList);
    cancelForm();
  };

  const remove = (id: string) => {
    persist(list.filter((x) => x.id !== id));
    if (editingId === id) cancelForm();
  };

  const canEdit = Boolean(onUpdateConfig);

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-4">
      <h2 className="mb-3 text-lg font-bold text-slate-800">{title}</h2>

      <ul className="relative flex-1 space-y-3 overflow-auto pl-1 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-8px)] before:w-px before:bg-slate-200">
        {list.map((ap) => (
          <li key={ap.id} className="relative flex gap-3 pl-7">
            <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow ring-2 ring-blue-100" />
            <div className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
              <p className="text-xs font-semibold text-blue-600">{ap.time}</p>
              <p className="text-sm font-medium text-slate-700">{displayTitle(ap, kunden)}</p>
            </div>
            {canEdit && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(ap)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-blue-600"
                  title={t("appointmentsEdit", "Bearbeiten")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(ap.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  title={t("appointmentsRemove", "Entfernen")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {(adding || editingId) && canEdit && (
        <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
          <p className="text-xs font-semibold text-slate-600">
            {editingId ? t("appointmentsFormEdit", "Termin bearbeiten") : t("appointmentsFormNew", "Neuer Termin")}
          </p>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">{t("appointmentsTime", "Uhrzeit")}</label>
            <select className={selectCls} value={formTime} onChange={(e) => setFormTime(e.target.value)}>
              {slots.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">{t("appointmentsActivity", "Art")}</label>
            <select className={selectCls} value={formActivity} onChange={(e) => setFormActivity(e.target.value)}>
              {APPOINTMENT_ACTIVITIES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">
              {t("appointmentsCustomer", "Kunde (Stammdaten)")}
            </label>
            <select className={selectCls} value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)}>
              <option value="">{t("appointmentsNoCustomer", "— ohne Kundenbezug —")}</option>
              {customerOpts.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={saveForm}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {t("commonSave", "Speichern")}
            </button>
            <button type="button" onClick={cancelForm} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-white">
              {t("commonCancel", "Abbrechen")}
            </button>
          </div>
        </div>
      )}

      {canEdit && !adding && !editingId && (
        <button
          type="button"
          onClick={openAdd}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50/50"
        >
          <Plus className="h-4 w-4" />
          {newLabel}
        </button>
      )}
    </div>
  );
}
