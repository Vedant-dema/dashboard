import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgString } from "./widgetConfigHelpers";
import { getTasksFromConfig, taskDisplay, type TaskStored } from "./dynamicWidgetLists";
import { TASK_PRIORITIES, TASK_TITLE_PRESETS } from "./widgetListPresets";

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20";

export function TasksWidget({ config, onUpdateConfig }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("tasksTitle", "Aufgaben & Erinnerungen"));
  const newLabel = cfgString(config, "newTaskLabel", t("tasksAdd", "Aufgabe hinzufügen"));

  const fallback = useMemo(
    () => [
      {
        title: t("tasksItem1", "Angebot für Kunde Schmidt"),
        tag: t("tasksHigh", "Hoch"),
        tagClass: "bg-red-100 text-red-700",
      },
      {
        title: t("tasksItem2", "Fahrzeug-Übergabe morgen 10:00"),
        tag: t("tasksMedium", "Mittel"),
        tagClass: "bg-amber-100 text-amber-800",
      },
      {
        title: t("tasksItem3", "Rechnung #2847 prüfen"),
        tag: t("tasksNew", "Neu"),
        tagClass: "bg-blue-100 text-blue-700",
      },
      {
        title: t("tasksItem4", "Waschtermin bestätigen"),
        tag: t("tasksMedium", "Mittel"),
        tagClass: "bg-amber-100 text-amber-800",
      },
    ],
    [t]
  );

  const list = useMemo(() => getTasksFromConfig(config, fallback), [config, fallback]);

  const persist = (next: TaskStored[]) => {
    onUpdateConfig?.({
      taskItems: next,
      taskLines: undefined,
    });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formPreset, setFormPreset] = useState<string>(TASK_TITLE_PRESETS[0]!.id);
  const [formPriority, setFormPriority] = useState<"high" | "medium" | "new">("medium");

  const openAdd = () => {
    setEditingId(null);
    setFormPreset(TASK_TITLE_PRESETS[0]!.id);
    setFormPriority("medium");
    setAdding(true);
  };

  const openEdit = (row: TaskStored) => {
    setAdding(false);
    setEditingId(row.id);
    setFormPreset(row.titlePresetId);
    setFormPriority(row.priority);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingId(null);
  };

  const saveForm = () => {
    const row: TaskStored = {
      id: editingId ?? `t-${Date.now()}`,
      titlePresetId: formPreset,
      priority: formPriority,
    };
    const nextList = editingId ? list.map((x) => (x.id === editingId ? row : x)) : [...list, row];
    persist(nextList);
    cancelForm();
  };

  const remove = (id: string) => {
    persist(list.filter((x) => x.id !== id));
    if (editingId === id) cancelForm();
  };

  const canEdit = Boolean(onUpdateConfig);

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      <ul className="min-h-0 flex-1 space-y-3 overflow-auto">
        {list.map((task) => {
          const d = taskDisplay(task);
          return (
            <li
              key={task.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
            >
              <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{d.title}</span>
              <div className="flex shrink-0 items-center gap-1">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${d.tagClass}`}>{d.tag}</span>
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-blue-600"
                      title={t("commonEdit", "Bearbeiten")}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(task.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title={t("commonRemove", "Entfernen")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {(adding || editingId) && canEdit && (
        <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
          <p className="text-xs font-semibold text-slate-600">
            {editingId ? t("tasksFormEdit", "Aufgabe bearbeiten") : t("tasksFormNew", "Neue Aufgabe")}
          </p>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">
              {t("tasksFieldTitle", "Art der Aufgabe")}
            </label>
            <select className={selectCls} value={formPreset} onChange={(e) => setFormPreset(e.target.value)}>
              {TASK_TITLE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">
              {t("tasksFieldPriority", "Priorität")}
            </label>
            <select
              className={selectCls}
              value={formPriority}
              onChange={(e) => setFormPriority(e.target.value as "high" | "medium" | "new")}
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
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
            <button
              type="button"
              onClick={cancelForm}
              className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
            >
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
