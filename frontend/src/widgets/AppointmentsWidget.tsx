import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Clock, Pencil, Plus, Trash2, User, FileText } from "lucide-react";
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

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoAddDays(base: string, n: number): string {
  const d = new Date(base + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function formatDayHeader(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}
function parseHour(time: string): number {
  return parseInt(time.split(":")[0] ?? "9", 10);
}
function parseMinute(time: string): number {
  return parseInt(time.split(":")[1] ?? "0", 10);
}

// ─── Activity colour config ───────────────────────────────────────────────────

const ACTIVITY_STYLE: Record<string, { dot: string; bar: string; bg: string; text: string; badge: string }> = {
  consult:  { dot: "bg-blue-500",    bar: "bg-blue-400",   bg: "bg-blue-50/80 border-blue-200",    text: "text-blue-700",   badge: "bg-blue-100 text-blue-700"   },
  pickup:   { dot: "bg-emerald-500", bar: "bg-emerald-400",bg: "bg-emerald-50/80 border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  delivery: { dot: "bg-amber-500",   bar: "bg-amber-400",  bg: "bg-amber-50/80 border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700"  },
  internal: { dot: "bg-violet-500",  bar: "bg-violet-400", bg: "bg-violet-50/80 border-violet-200",text: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
  call:     { dot: "bg-cyan-500",    bar: "bg-cyan-400",   bg: "bg-cyan-50/80 border-cyan-200",    text: "text-cyan-700",   badge: "bg-cyan-100 text-cyan-700"    },
  workshop: { dot: "bg-orange-500",  bar: "bg-orange-400", bg: "bg-orange-50/80 border-orange-200",text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
};

const DEFAULT_STYLE = { dot: "bg-slate-400", bar: "bg-slate-300", bg: "bg-slate-50 border-slate-200", text: "text-slate-600", badge: "bg-slate-100 text-slate-600" };

function activityStyle(id: string) {
  return ACTIVITY_STYLE[id] ?? DEFAULT_STYLE;
}

function activityLabel(id: string): string {
  return APPOINTMENT_ACTIVITIES.find((a) => a.id === id)?.label ?? "Termin";
}

// ─── Form CSS helpers ─────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

const labelCls = "mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500";

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentsWidget({ config, onUpdateConfig }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const widgetTitle = cfgString(config, "customTitle", t("appointmentsTitle", "Termine"));

  // ── Kunden DB ──
  const [dbTick, setDbTick] = useState(0);
  useEffect(() => {
    const h = () => setDbTick((n) => n + 1);
    window.addEventListener("dema-kunden-db-changed", h);
    return () => window.removeEventListener("dema-kunden-db-changed", h);
  }, []);
  const kunden = useMemo(() => loadKundenDb().kunden, [dbTick]);
  const customerOpts = useMemo(() => customerOptionsFromDb(kunden), [kunden]);
  const slots = useMemo(() => timeSlotOptions(), []);

  // ── All appointments sorted ──
  const allList = useMemo(() => {
    const today = isoToday();
    const raw = getAppointmentsFromConfig(config);
    return [...raw]
      .map((a) => ({ ...a, date: a.date ?? today }))
      .sort((a, b) => {
        const dc = (a.date ?? "").localeCompare(b.date ?? "");
        return dc !== 0 ? dc : a.time.localeCompare(b.time);
      });
  }, [config]);

  // ── View date navigation ──
  const [viewDate, setViewDate] = useState(isoToday);
  const isToday = viewDate === isoToday();

  const dayList = useMemo(
    () => allList.filter((a) => (a.date ?? isoToday()) === viewDate),
    [allList, viewDate]
  );

  // ── Persist ──
  const persist = (next: AppointmentStored[]) => {
    onUpdateConfig?.({ appointments: next, appointmentLines: undefined });
  };

  // ── Form state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formDate, setFormDate] = useState(isoToday);
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState(60);
  const [formActivity, setFormActivity] = useState("consult");
  const [formCustomer, setFormCustomer] = useState("");
  const [formNote, setFormNote] = useState("");

  const openAdd = () => {
    setEditingId(null);
    setFormDate(viewDate);
    setFormTime("09:00");
    setFormDuration(60);
    setFormActivity("consult");
    setFormCustomer(customerOpts[0]?.value ?? "");
    setFormNote("");
    setAdding(true);
  };

  const openEdit = (row: AppointmentStored) => {
    setAdding(false);
    setEditingId(row.id);
    setFormDate(row.date ?? viewDate);
    setFormTime(row.time);
    setFormDuration(row.duration ?? 60);
    setFormActivity(row.activityId);
    setFormCustomer(row.customerNr);
    setFormNote(row.note ?? "");
  };

  const cancelForm = () => { setAdding(false); setEditingId(null); };

  const saveForm = () => {
    const next: AppointmentStored = {
      id: editingId ?? `a-${Date.now()}`,
      date: formDate,
      time: formTime,
      duration: formDuration,
      activityId: formActivity,
      customerNr: formCustomer,
      note: formNote.trim() || undefined,
    };
    const nextList = editingId
      ? allList.map((x) => (x.id === editingId ? next : x))
      : [...allList, next];
    persist(nextList);
    cancelForm();
  };

  const remove = (id: string) => {
    persist(allList.filter((x) => x.id !== id));
    if (editingId === id) cancelForm();
  };

  const canEdit = Boolean(onUpdateConfig);
  const isFormOpen = adding || !!editingId;

  // ── Timeline hour range ──
  const { startHour, endHour } = useMemo(() => {
    if (dayList.length === 0) return { startHour: 8, endHour: 17 };
    const hours = dayList.map((a) => parseHour(a.time));
    return {
      startHour: Math.max(7, Math.min(...hours) - 1),
      endHour: Math.min(20, Math.max(...hours) + 2),
    };
  }, [dayList]);

  const hours = useMemo(() => {
    const arr: number[] = [];
    for (let h = startHour; h <= endHour; h++) arr.push(h);
    return arr;
  }, [startHour, endHour]);

  // ── Build display name ──
  const displayName = (row: AppointmentStored) => {
    if (row.legacyTitle) return row.legacyTitle;
    return appointmentTitle(row.activityId, row.customerNr, kunden);
  };

  const customerName = (nr: string) => {
    if (!nr) return null;
    return kunden.find((k) => k.kunden_nr === nr)?.firmenname ?? nr;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-bold text-slate-800">{widgetTitle}</h2>
        <div className="flex items-center gap-1">
          {!isToday && (
            <button
              type="button"
              onClick={() => setViewDate(isoToday())}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"
            >
              Heute
            </button>
          )}
          <button
            type="button"
            onClick={() => setViewDate((d) => isoAddDays(d, -1))}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Vorheriger Tag"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className={`text-xs font-semibold ${isToday ? "text-blue-600" : "text-slate-700"}`}>
            {formatDayHeader(viewDate)}
          </span>
          <button
            type="button"
            onClick={() => setViewDate((d) => isoAddDays(d, 1))}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Nächster Tag"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Timeline body ── */}
      <div className="relative min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {dayList.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Keine Termine</p>
            <p className="text-xs text-slate-400">
              {isToday ? "Heute sind keine Termine eingetragen." : "Für diesen Tag sind keine Termine eingetragen."}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical guide line */}
            <div className="absolute left-[42px] top-0 h-full w-px bg-slate-100" />

            {hours.map((hour) => {
              const hStr = String(hour).padStart(2, "0");
              const appts = dayList.filter((a) => parseHour(a.time) === hour);

              return (
                <div key={hour} className="group/hour relative flex min-h-[52px] gap-3">
                  {/* Hour label */}
                  <div className="w-10 shrink-0 pt-0.5 text-right">
                    <span className="text-[10px] font-semibold text-slate-400">{hStr}:00</span>
                  </div>

                  {/* Appointments in this hour */}
                  <div className="flex flex-1 flex-col gap-1.5 pb-1 pl-4 pt-0.5">
                    {appts.length === 0 ? (
                      // Empty hour slot — subtle tick
                      <div className="mt-2 h-px w-full bg-slate-100" />
                    ) : (
                      appts.map((ap) => {
                        const st = activityStyle(ap.activityId);
                        const min = parseMinute(ap.time);
                        const dur = ap.duration ?? 60;
                        const name = customerName(ap.customerNr);
                        const isEditing = editingId === ap.id;

                        return (
                          <div
                            key={ap.id}
                            className={`group/appt relative rounded-xl border px-3 py-2 transition-shadow hover:shadow-md ${st.bg} ${isEditing ? "ring-2 ring-blue-400" : ""}`}
                          >
                            {/* Left colour bar */}
                            <div className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full ${st.bar}`} />

                            <div className="flex items-start justify-between gap-2 pl-1">
                              <div className="min-w-0 flex-1">
                                {/* Time + duration */}
                                <div className="mb-0.5 flex items-center gap-1.5">
                                  <span className={`text-[11px] font-bold ${st.text}`}>
                                    {ap.time}
                                    {min > 0 && ""}
                                  </span>
                                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${st.badge}`}>
                                    {activityLabel(ap.activityId)}
                                  </span>
                                  <span className="text-[9px] text-slate-400">{dur} Min.</span>
                                </div>

                                {/* Customer / title */}
                                <p className="truncate text-xs font-semibold text-slate-700">
                                  {displayName(ap)}
                                </p>

                                {/* Customer detail */}
                                {name && !ap.legacyTitle && (
                                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                                    <User className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">{name}</span>
                                  </p>
                                )}

                                {/* Note */}
                                {ap.note && (
                                  <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-400 italic">
                                    <FileText className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">{ap.note}</span>
                                  </p>
                                )}
                              </div>

                              {/* Edit / Delete */}
                              {canEdit && (
                                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/appt:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(ap)}
                                    className="rounded-lg p-1 text-slate-400 hover:bg-white/70 hover:text-blue-600"
                                    title={t("appointmentsEdit", "Bearbeiten")}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => remove(ap.id)}
                                    className="rounded-lg p-1 text-slate-400 hover:bg-white/70 hover:text-red-600"
                                    title={t("appointmentsRemove", "Entfernen")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Form ── */}
      {isFormOpen && canEdit && (
        <div className="shrink-0 border-t border-blue-100 bg-gradient-to-b from-blue-50/60 to-slate-50/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-bold text-slate-700">
            {editingId ? t("appointmentsFormEdit", "Termin bearbeiten") : t("appointmentsFormNew", "Neuer Termin")}
          </p>

          <div className="space-y-2">
            {/* Row 1: Date + Time */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>{t("appointmentsDate", "Datum")}</label>
                <input
                  type="date"
                  className={inputCls}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>{t("appointmentsTime", "Uhrzeit")}</label>
                <select className={inputCls} value={formTime} onChange={(e) => setFormTime(e.target.value)}>
                  {slots.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Activity + Duration */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>{t("appointmentsActivity", "Art")}</label>
                <select className={inputCls} value={formActivity} onChange={(e) => setFormActivity(e.target.value)}>
                  {APPOINTMENT_ACTIVITIES.map((a) => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("appointmentsDuration", "Dauer (Min.)")}</label>
                <select className={inputCls} value={formDuration} onChange={(e) => setFormDuration(Number(e.target.value))}>
                  {[15, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                    <option key={m} value={m}>{m} Min.</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Customer */}
            <div>
              <label className={labelCls}>{t("appointmentsCustomer", "Kunde")}</label>
              <select className={inputCls} value={formCustomer} onChange={(e) => setFormCustomer(e.target.value)}>
                <option value="">{t("appointmentsNoCustomer", "— ohne Kundenbezug —")}</option>
                {customerOpts.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Row 4: Note */}
            <div>
              <label className={labelCls}>
                {t("appointmentsNote", "Notiz")}{" "}
                <span className="font-normal normal-case text-slate-400">(optional)</span>
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder={t("appointmentsNotePlaceholder", "z. B. Bitte Unterlagen mitbringen…")}
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={saveForm}
                className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                {t("commonSave", "Speichern")}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {t("commonCancel", "Abbrechen")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add button ── */}
      {canEdit && !isFormOpen && (
        <div className="shrink-0 border-t border-slate-100 px-4 py-2">
          <button
            type="button"
            onClick={openAdd}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50/50"
          >
            <Plus className="h-3.5 w-3.5" />
            {t("appointmentsNew", "Neuer Termin")}
          </button>
        </div>
      )}
    </div>
  );
}
