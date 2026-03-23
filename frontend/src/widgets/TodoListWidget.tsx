import { useMemo, useState } from "react";
import { Check, Circle, Plus, Trash2 } from "lucide-react";
import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgString } from "./widgetConfigHelpers";
import { getTodosFromConfig, todoDisplay, type TodoStored } from "./dynamicWidgetLists";
import { TODO_PRESETS } from "./widgetListPresets";

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20";

export function TodoListWidget({ config, onUpdateConfig }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("widgetTitleTodoList", "To-do Liste"));
  const list = useMemo(() => getTodosFromConfig(config), [config]);

  const persist = (next: TodoStored[]) => {
    onUpdateConfig?.({
      todoItems: next,
      todoLines: undefined,
    });
  };

  const toggle = (id: string) => {
    persist(list.map((it) => (it.id === id ? { ...it, done: !it.done } : it)));
  };

  const remove = (id: string) => {
    persist(list.filter((it) => it.id !== id));
  };

  const [adding, setAdding] = useState(false);
  const [formTemplate, setFormTemplate] = useState<string>(TODO_PRESETS[0]!.id);

  const addPreset = () => {
    const next: TodoStored = {
      id: `d-${Date.now()}`,
      templateId: formTemplate,
      done: false,
    };
    persist([...list, next]);
    setAdding(false);
  };

  const canEdit = Boolean(onUpdateConfig);

  return (
    <div className="flex h-full flex-col">
      <h2 className="mb-3 text-lg font-bold text-slate-800">{title}</h2>
      <ul className="min-h-0 flex-1 space-y-2 overflow-auto">
        {list.map((it) => (
          <li key={it.id} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => canEdit && toggle(it.id)}
              disabled={!canEdit}
              className="flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-left transition hover:border-blue-200 hover:bg-white disabled:pointer-events-none disabled:opacity-90"
            >
              <span className="mt-0.5 shrink-0 text-blue-600">
                {it.done ? <Check className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </span>
              <span
                className={`text-sm font-medium ${it.done ? "text-slate-400 line-through" : "text-slate-800"}`}
              >
                {todoDisplay(it)}
              </span>
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={() => remove(it.id)}
                className="mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title={t("commonRemove", "Entfernen")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {canEdit && adding && (
        <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
          <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">
            {t("todoPickTemplate", "Vorlage wählen")}
          </label>
          <select className={selectCls} value={formTemplate} onChange={(e) => setFormTemplate(e.target.value)}>
            {TODO_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={addPreset}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {t("commonAdd", "Hinzufügen")}
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
            >
              {t("commonCancel", "Abbrechen")}
            </button>
          </div>
        </div>
      )}

      {canEdit && !adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50/50"
        >
          <Plus className="h-4 w-4" />
          {t("todoAddEntry", "Eintrag hinzufügen")}
        </button>
      )}
    </div>
  );
}
