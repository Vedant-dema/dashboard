import { StickyNote } from "lucide-react";
import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgString } from "./widgetConfigHelpers";
import { NOTES_PRESETS } from "./widgetListPresets";

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20";

const LEGACY_VALUE = "__legacy__";

export function NotesWidget({ config, onUpdateConfig }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("widgetTitleNotes", "Notizen"));
  const legacyBody = cfgString(config, "notesBody", "");
  const storedPreset = typeof config.notesPresetId === "string" ? config.notesPresetId : null;
  const legacyMode = !storedPreset && legacyBody.length > 0;
  const selectValue = legacyMode ? LEGACY_VALUE : (storedPreset ?? "empty");
  const preset = NOTES_PRESETS.find((p) => p.id === selectValue);
  const body = legacyMode ? legacyBody : (preset?.body ?? "");

  const setPreset = (id: string) => {
    if (!onUpdateConfig) return;
    if (id === LEGACY_VALUE) return;
    onUpdateConfig({
      notesPresetId: id,
      notesBody: undefined,
    });
  };

  const presetLabel = (id: string) => {
    if (id === "empty") return t("notesPresetEmpty", "Leer");
    if (id === "calls") return t("notesPresetCalls", "Anrufe / Rückrufe");
    if (id === "orders") return t("notesPresetOrders", "Aufträge / Angebote");
    if (id === "wash") return t("notesPresetWash", "Waschanlage");
    return id;
  };

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      {onUpdateConfig && (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-600">
            {t("notesPresetLabel", "Notiz-Vorlage")}
          </label>
          <select className={selectCls} value={selectValue} onChange={(e) => setPreset(e.target.value)}>
            {legacyMode && (
              <option value={LEGACY_VALUE}>{t("notesPresetPrevious", "Bisheriger Text")}</option>
            )}
            {NOTES_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {presetLabel(p.id)}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 overflow-auto">
        {body ? (
          <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-700">
            {body}
          </p>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/30 p-3 text-sm text-slate-500">
            {t("notesEmptyTile", "Keine Vorlage ausgewählt oder leer — wählen Sie oben eine Vorlage.")}
          </p>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50/80 p-3">
          <StickyNote className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-slate-600">
            {t("notesWidgetHintSelect", "Inhalt und Titel können Sie unter „Anpassen“ und direkt hier per Vorlage steuern.")}
          </p>
        </div>
      </div>
    </div>
  );
}
