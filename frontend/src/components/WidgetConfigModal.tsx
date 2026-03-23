import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, X } from "lucide-react";
import type { WidgetInstance, WidgetType } from "../types/dashboard";
import { useLanguage } from "../contexts/LanguageContext";
import { getWidgetMeta } from "../widgets/registry";
import {
  DEFAULT_FINANCE_BARS,
  DEFAULT_INVENTORY_PIE,
  DEFAULT_KPI_ITEMS,
  DEFAULT_SALES_CHART,
  DEFAULT_TABLE_ROWS,
} from "../widgets/defaultWidgetData";
import {
  CHART_SOURCE_KUNDEN,
  KUNDEN_CATEGORY_COLUMNS,
  KUNDEN_VALUE_COLUMNS,
} from "../widgets/chartDataFromDb";
import { NOTES_PRESETS } from "../widgets/widgetListPresets";

const DEFAULT_SALES_FOOTER = [
  { label: "Gesamtumsatz", value: "€ 320K" },
  { label: "Abgeschlossene Deals", value: "30" },
  { label: "Gewinn", value: "€ 58K" },
];

const DEFAULT_FINANCE_SUMMARY = [
  { label: "Einnahmen", value: "€120K", color: "emerald" as const },
  { label: "Ausgaben", value: "€85K", color: "red" as const },
  { label: "Gewinn", value: "€35K", color: "blue" as const },
];

const DEFAULT_QUICK_ACTIONS = [
  { label: "Kunde anlegen", color: "blue" },
  { label: "Fahrzeug erfassen", color: "emerald" },
  { label: "Angebot erstellen", color: "violet" },
  { label: "Rechnung erstellen", color: "amber" },
];

function buildDraft(type: WidgetType, c: Record<string, unknown>): Record<string, string> {
  const str = (k: string, d = "") => (typeof c[k] === "string" ? (c[k] as string) : d);
  const json = (k: string, fallback: unknown) =>
    c[k] != null ? JSON.stringify(c[k], null, 2) : JSON.stringify(fallback, null, 2);

  switch (type) {
    case "welcome":
      return {};
    case "kpi":
      return { kpiJson: json("kpiItems", DEFAULT_KPI_ITEMS) };
    case "sales":
      return {
        customTitle: str("customTitle"),
        salesPeriod: str("salesPeriod"),
        salesChartJson: json("salesChart", DEFAULT_SALES_CHART),
        salesFooterJson: json("salesFooter", DEFAULT_SALES_FOOTER),
      };
    case "inventory":
      return {
        customTitle: str("customTitle"),
        inventoryPieJson: json("inventoryPie", DEFAULT_INVENTORY_PIE),
      };
    case "finances":
      return {
        customTitle: str("customTitle"),
        financeBarsJson: json("financeBars", DEFAULT_FINANCE_BARS),
        financeSummaryJson: json("financeSummary", DEFAULT_FINANCE_SUMMARY),
      };
    case "notes":
      return {
        customTitle: str("customTitle"),
        notesPresetId: str("notesPresetId") || "empty",
      };
    case "picture":
      return {
        customTitle: str("customTitle"),
        imageUrl: str("imageUrl", "https://picsum.photos/seed/dema-dashboard/800/450"),
        imageCaption: str("imageCaption"),
      };
    case "todo-list":
      return {
        customTitle: str("customTitle"),
      };
    case "table":
      return {
        customTitle: str("customTitle"),
        tableHeaders: str("tableHeaders", "Kunde,Status,Betrag"),
        tableRows:
          str("tableRows") ||
          DEFAULT_TABLE_ROWS.map((r) => `${r.kunde}|${r.status}|${r.betrag}`).join("\n"),
      };
    case "tasks":
      return {
        customTitle: str("customTitle"),
        newTaskLabel: str("newTaskLabel"),
      };
    case "appointments":
      return {
        customTitle: str("customTitle"),
        newButtonLabel: str("newButtonLabel"),
      };
    case "meetings":
      return {
        customTitle: str("customTitle"),
        newMeetingLabel: str("newMeetingLabel"),
      };
    case "calendar":
      return {
        customTitle: str("customTitle"),
        monthLabel: str("monthLabel", "April 2025"),
      };
    case "quick-actions":
      return { quickActionsJson: json("quickActions", DEFAULT_QUICK_ACTIONS) };
    case "user-card":
    case "profile":
      return { customTitle: str("customTitle"), profileFootnote: str("profileFootnote") };
    case "graph-line":
    case "graph-bar":
    case "graph-pie":
    case "graph-area":
      return {
        customTitle: str("customTitle"),
        chartSource: str("chartSource", CHART_SOURCE_KUNDEN),
        xColumn: str("xColumn", "branche"),
        yColumn: str("yColumn", "__count__"),
        chartJson: (() => {
          const cd = c.chartData;
          if (cd != null) return JSON.stringify(cd, null, 2);
          return "";
        })(),
      };
    default:
      return {};
  }
}

function buildPatch(type: WidgetType, draft: Record<string, string>): Record<string, unknown> {
  const parseArr = (s: string | undefined): unknown => {
    const t = (s ?? "").trim();
    if (!t) return undefined;
    return JSON.parse(t) as unknown;
  };

  try {
    switch (type) {
      case "welcome":
        return {};
      case "kpi": {
        const raw = (draft.kpiJson ?? "").trim();
        const kpiItems = raw ? (JSON.parse(raw) as unknown) : DEFAULT_KPI_ITEMS;
        if (!Array.isArray(kpiItems)) throw new Error("KPI: JSON muss ein Array sein.");
        return { kpiItems };
      }
      case "sales": {
        const salesChart = parseArr(draft.salesChartJson);
        const salesFooter = parseArr(draft.salesFooterJson);
        if (salesChart != null && !Array.isArray(salesChart)) throw new Error("Verkauf: Diagramm muss ein Array sein.");
        if (salesFooter != null && !Array.isArray(salesFooter)) throw new Error("Verkauf: Kennzahlen müssen ein Array sein.");
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          salesPeriod: draft.salesPeriod?.trim() || undefined,
          salesChart,
          salesFooter,
        };
      }
      case "inventory": {
        const inventoryPie = parseArr(draft.inventoryPieJson);
        if (inventoryPie != null && !Array.isArray(inventoryPie)) throw new Error("Bestand: Daten müssen ein Array sein.");
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          inventoryPie,
        };
      }
      case "finances": {
        const financeBars = parseArr(draft.financeBarsJson);
        const financeSummary = parseArr(draft.financeSummaryJson);
        if (financeBars != null && !Array.isArray(financeBars)) throw new Error("Finanzen: Balken müssen ein Array sein.");
        if (financeSummary != null && !Array.isArray(financeSummary)) {
          throw new Error("Finanzen: Legende muss ein Array sein.");
        }
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          financeBars,
          financeSummary,
        };
      }
      case "notes":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          notesPresetId: draft.notesPresetId?.trim() || "empty",
          notesBody: undefined,
        };
      case "picture":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          imageUrl: draft.imageUrl?.trim() || undefined,
          imageCaption: draft.imageCaption?.trim() || undefined,
        };
      case "todo-list":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
        };
      case "table":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          tableHeaders: draft.tableHeaders?.trim() || undefined,
          tableRows: draft.tableRows ?? "",
        };
      case "tasks":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          newTaskLabel: draft.newTaskLabel?.trim() || undefined,
        };
      case "appointments":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          newButtonLabel: draft.newButtonLabel?.trim() || undefined,
        };
      case "meetings":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          newMeetingLabel: draft.newMeetingLabel?.trim() || undefined,
        };
      case "calendar":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          monthLabel: draft.monthLabel?.trim() || undefined,
        };
      case "quick-actions": {
        const qa = parseArr(draft.quickActionsJson);
        if (qa != null && !Array.isArray(qa)) throw new Error("Schnellaktionen: JSON muss ein Array sein.");
        return { quickActions: qa };
      }
      case "user-card":
      case "profile":
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          profileFootnote: draft.profileFootnote?.trim() || undefined,
        };
      case "graph-line":
      case "graph-bar":
      case "graph-pie":
      case "graph-area": {
        const chartData = parseArr(draft.chartJson);
        if (chartData != null && !Array.isArray(chartData)) {
          throw new Error("Diagramm: JSON muss ein Array sein.");
        }
        return {
          customTitle: draft.customTitle?.trim() || undefined,
          chartSource: draft.chartSource?.trim() || CHART_SOURCE_KUNDEN,
          xColumn: draft.xColumn?.trim() || "branche",
          yColumn: draft.yColumn?.trim() || "__count__",
          chartData,
        };
      }
      default:
        return {};
    }
  } catch (e) {
    throw e;
  }
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const selectClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200";
const labelClass = "block text-sm font-medium text-slate-700";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="pt-2">
      <h3 className="mb-3 border-b border-slate-100 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function AdvancedJsonBlock({ summary, hint, children }: { summary: string; hint: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-slate-50/60">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="border-t border-slate-200 px-3 pb-3 pt-2">
        <p className="mb-2 text-xs leading-relaxed text-slate-500">{hint}</p>
        {children}
      </div>
    </details>
  );
}

type Props = {
  open: boolean;
  widget: WidgetInstance | null;
  onClose: () => void;
  onSave: (patch: Record<string, unknown>) => void;
};

export function WidgetConfigModal({ open, widget, onClose, onSave }: Props) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !widget) return;
    setError(null);
    setDraft(buildDraft(widget.type, widget.config ?? {}));
  }, [open, widget]);

  const title = useMemo(() => {
    if (!widget) return "";
    const m = getWidgetMeta(widget.type);
    return t(m.titleKey ?? `widgetTitle_${widget.type}`, m.title);
  }, [widget, t]);

  if (!open || !widget) return null;

  const set = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const handleSave = () => {
    setError(null);
    try {
      const patch = buildPatch(widget.type, draft);
      onSave(patch);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("widgetConfigInvalid", "Ungültige Eingabe."));
    }
  };

  const ta = `${inputClass} min-h-[120px] resize-y font-mono text-xs leading-relaxed`;
  const jsonHint = t(
    "widgetConfigJsonHint",
    "Nur bei Bedarf ändern. Ungültige Einträge werden beim Speichern abgelehnt. Ohne Anpassung bleibt die Standardansicht aktiv."
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="widget-config-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(92vh,760px)] w-full max-w-xl overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_25px_50px_-12px_rgba(15,23,42,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <div className="min-w-0 border-l-[3px] border-blue-600 pl-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t("widgetConfigKicker", "Modul-Einstellungen")}
            </p>
            <h2 id="widget-config-title" className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {t(
                "widgetConfigIntro",
                "Legen Sie fest, welche Texte und Daten in diesem Bereich erscheinen. Die Einstellungen gelten nur in diesem Browser auf diesem Gerät."
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
            aria-label={t("commonClose", "Schließen")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[min(60vh,480px)] overflow-y-auto px-5 py-4">
          {widget.type === "kpi" && (
            <Section title={t("widgetConfigSectionKpi", "KPI-Karten")}>
              <p className="text-sm text-slate-600">
                {t(
                  "widgetConfigKpiIntro",
                  "Die vier Kennzahlenkarten werden über eine technische Datenliste gesteuert. Für die meisten Nutzer genügt die Voreinstellung — öffnen Sie den erweiterten Bereich nur bei gezielten Anpassungen."
                )}
              </p>
              <AdvancedJsonBlock
                summary={t("widgetConfigAdvancedKpi", "Erweitert: KPI-Definition (JSON)")}
                hint={jsonHint}
              >
                <textarea className={ta} value={draft.kpiJson ?? ""} onChange={(e) => set("kpiJson", e.target.value)} spellCheck={false} />
              </AdvancedJsonBlock>
            </Section>
          )}

          {(widget.type === "sales" || widget.type === "inventory" || widget.type === "finances") && (
            <Section title={t("widgetConfigSectionDisplay", "Anzeige")}>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Modultitel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} placeholder={t("widgetConfigPlaceholderDefault", "Leer lassen für Standardtitel")} />
              </div>
            </Section>
          )}

          {widget.type === "sales" && (
            <Section title={t("widgetConfigSectionSales", "Verkaufsdiagramm")}>
              <div>
                <label className={labelClass}>{t("widgetConfigPeriod", "Hinweis neben dem Titel (z. B. Zeitraum)")}</label>
                <input className={inputClass} value={draft.salesPeriod ?? ""} onChange={(e) => set("salesPeriod", e.target.value)} />
              </div>
              <AdvancedJsonBlock summary={t("widgetConfigAdvancedChart", "Erweitert: Kurven- und Kennzahlendaten")} hint={jsonHint}>
                <p className="mb-2 text-xs font-medium text-slate-600">{t("widgetConfigChartSeries", "Datenpunkte der Linie (JSON-Array)")}</p>
                <textarea className={ta} value={draft.salesChartJson ?? ""} onChange={(e) => set("salesChartJson", e.target.value)} spellCheck={false} />
                <p className="mb-2 mt-3 text-xs font-medium text-slate-600">{t("widgetConfigFooterStats", "Kennzahlen unter dem Diagramm (JSON-Array)")}</p>
                <textarea className={ta} value={draft.salesFooterJson ?? ""} onChange={(e) => set("salesFooterJson", e.target.value)} spellCheck={false} />
              </AdvancedJsonBlock>
            </Section>
          )}

          {widget.type === "inventory" && (
            <Section title={t("widgetConfigSectionChart", "Diagrammdaten")}>
              <AdvancedJsonBlock summary={t("widgetConfigAdvancedPie", "Erweitert: Verteilung (JSON)")} hint={jsonHint}>
                <textarea className={ta} value={draft.inventoryPieJson ?? ""} onChange={(e) => set("inventoryPieJson", e.target.value)} spellCheck={false} />
              </AdvancedJsonBlock>
            </Section>
          )}

          {widget.type === "finances" && (
            <Section title={t("widgetConfigSectionFinances", "Finanzdiagramm")}>
              <AdvancedJsonBlock summary={t("widgetConfigAdvancedFinance", "Erweitert: Balken und Legende")} hint={jsonHint}>
                <p className="mb-2 text-xs font-medium text-slate-600">{t("widgetConfigFinanceBars", "Balkenwerte (JSON)")}</p>
                <textarea className={ta} value={draft.financeBarsJson ?? ""} onChange={(e) => set("financeBarsJson", e.target.value)} spellCheck={false} />
                <p className="mb-2 mt-3 text-xs font-medium text-slate-600">{t("widgetConfigFinanceLegend", "Legende unter dem Diagramm (JSON)")}</p>
                <textarea className={ta} value={draft.financeSummaryJson ?? ""} onChange={(e) => set("financeSummaryJson", e.target.value)} spellCheck={false} />
              </AdvancedJsonBlock>
            </Section>
          )}

          {widget.type === "notes" && (
            <Section title={t("widgetConfigSectionContent", "Inhalt")}>
              <p className="text-sm text-slate-600">
                {t("widgetConfigNotesPresetHint", "Notiz-Inhalte wählen Sie als Vorlage auf der Kachel oder hier. Es ist keine freie Eingabe nötig.")}
              </p>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("notesPresetLabel", "Notiz-Vorlage")}</label>
                <select
                  className={selectClass}
                  value={draft.notesPresetId ?? "empty"}
                  onChange={(e) => set("notesPresetId", e.target.value)}
                >
                  {NOTES_PRESETS.map((p) => {
                    const byId: Record<(typeof NOTES_PRESETS)[number]["id"], string> = {
                      empty: t("notesPresetEmpty", "Leer"),
                      calls: t("notesPresetCalls", "Anrufe / Rückrufe"),
                      orders: t("notesPresetOrders", "Aufträge / Angebote"),
                      wash: t("notesPresetWash", "Waschanlage"),
                    };
                    return (
                      <option key={p.id} value={p.id}>
                        {byId[p.id]}
                      </option>
                    );
                  })}
                </select>
              </div>
            </Section>
          )}

          {widget.type === "picture" && (
            <Section title={t("widgetConfigSectionContent", "Inhalt")}>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigImageUrl", "Adresse des Bildes (URL)")}</label>
                <input className={inputClass} value={draft.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigImageCaption", "Bildunterschrift")}</label>
                <input className={inputClass} value={draft.imageCaption ?? ""} onChange={(e) => set("imageCaption", e.target.value)} />
              </div>
            </Section>
          )}

          {widget.type === "todo-list" && (
            <Section title={t("widgetConfigSectionList", "Aufgabenliste")}>
              <p className="text-sm text-slate-600">
                {t(
                  "widgetConfigTodoTileHint",
                  "Einträge fügen Sie auf der Kachel hinzu (Vorlagen per Auswahl). Erledigt-Status und Löschen erfolgen ebenfalls dort."
                )}
              </p>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
            </Section>
          )}

          {widget.type === "table" && (
            <Section title={t("widgetConfigSectionTable", "Tabelle")}>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigTableColumns", "Spaltenüberschriften (Komma-getrennt)")}</label>
                <input className={inputClass} value={draft.tableHeaders ?? ""} onChange={(e) => set("tableHeaders", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigTableRows", "Datenzeilen (Spalten mit | trennen)")}</label>
                <textarea className={ta} value={draft.tableRows ?? ""} onChange={(e) => set("tableRows", e.target.value)} />
              </div>
            </Section>
          )}

          {widget.type === "tasks" && (
            <Section title={t("widgetConfigSectionTasks", "Aufgaben")}>
              <p className="text-sm text-slate-600">
                {t(
                  "widgetConfigTasksTileHint",
                  "Aufgaben bearbeiten Sie direkt auf der Kachel (Vorlage und Priorität per Auswahl)."
                )}
              </p>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigTasksAddLabel", "Button „Hinzufügen“ (optional)")}</label>
                <input className={inputClass} value={draft.newTaskLabel ?? ""} onChange={(e) => set("newTaskLabel", e.target.value)} placeholder={t("tasksAdd", "Aufgabe hinzufügen")} />
              </div>
            </Section>
          )}

          {widget.type === "appointments" && (
            <Section title={t("widgetConfigSectionAppointments", "Termine")}>
              <p className="text-sm text-slate-600">
                {t(
                  "widgetConfigApptTileHint",
                  "Termine legen Sie auf der Kachel an: Uhrzeit, Art und Kunde aus den Stammdaten — kein Freitext nötig."
                )}
              </p>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigApptButton", "Beschriftung des Buttons unten (optional)")}</label>
                <input className={inputClass} value={draft.newButtonLabel ?? ""} onChange={(e) => set("newButtonLabel", e.target.value)} />
              </div>
            </Section>
          )}

          {widget.type === "meetings" && (
            <Section title={t("widgetConfigSectionMeetings", "Meetings")}>
              <p className="text-sm text-slate-600">
                {t(
                  "widgetConfigMeetingsTileHint",
                  "Meetings fügen und bearbeiten Sie auf der Kachel (Uhrzeit, Thema und Ort per Auswahl)."
                )}
              </p>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigMeetingsAddLabel", "Button „Hinzufügen“ (optional)")}</label>
                <input className={inputClass} value={draft.newMeetingLabel ?? ""} onChange={(e) => set("newMeetingLabel", e.target.value)} placeholder="Neues Meeting" />
              </div>
            </Section>
          )}

          {widget.type === "calendar" && (
            <Section title={t("widgetConfigSectionCalendar", "Kalender")}>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigMonthLabel", "Angezeigter Monat / Jahr")}</label>
                <input className={inputClass} value={draft.monthLabel ?? ""} onChange={(e) => set("monthLabel", e.target.value)} />
              </div>
            </Section>
          )}

          {widget.type === "quick-actions" && (
            <Section title={t("widgetConfigSectionQuickActions", "Schnellaktionen")}>
              <p className="text-sm text-slate-600">
                {t(
                  "widgetConfigQuickActionsIntro",
                  "Die Schaltflächen können über eine strukturierte Liste angepasst werden. Farben: blue, emerald, violet, amber."
                )}
              </p>
              <AdvancedJsonBlock summary={t("widgetConfigAdvancedActions", "Aktionen bearbeiten (JSON)")} hint={jsonHint}>
                <textarea className={ta} value={draft.quickActionsJson ?? ""} onChange={(e) => set("quickActionsJson", e.target.value)} spellCheck={false} />
              </AdvancedJsonBlock>
            </Section>
          )}

          {(widget.type === "profile" || widget.type === "user-card") && (
            <Section title={t("widgetConfigSectionProfile", "Profilkarte")}>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Zusätzliche Überschrift (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigProfileFootnote", "Hinweistext unter den Details (optional)")}</label>
                <input className={inputClass} value={draft.profileFootnote ?? ""} onChange={(e) => set("profileFootnote", e.target.value)} />
              </div>
            </Section>
          )}

          {(widget.type === "graph-line" ||
            widget.type === "graph-bar" ||
            widget.type === "graph-pie" ||
            widget.type === "graph-area") && (
            <Section title={t("widgetConfigSectionChartWidget", "Diagramm")}>
              <div>
                <label className={labelClass}>{t("widgetConfigModuleTitle", "Eigener Titel (optional)")}</label>
                <input className={inputClass} value={draft.customTitle ?? ""} onChange={(e) => set("customTitle", e.target.value)} />
              </div>
              <p className="text-sm text-slate-600">
                {t(
                  "widgetConfigChartDbExplain",
                  "Standardmäßig werden Daten aus der lokalen Kunden-Stammdatenbank aggregiert (gleiche Datenbasis wie im Kundenbereich). Wählen Sie die Spalten für die Gruppierung (X) und den Wert (Y)."
                )}
              </p>
              <div>
                <label className={labelClass}>{t("widgetConfigChartSource", "Datenquelle")}</label>
                <select
                  className={selectClass}
                  value={draft.chartSource ?? CHART_SOURCE_KUNDEN}
                  onChange={(e) => set("chartSource", e.target.value)}
                >
                  <option value={CHART_SOURCE_KUNDEN}>{t("widgetConfigSourceKunden", "Kunden-Stamm (lokal)")}</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigXAxis", "X-Achse / Kategorie (Datenbankfeld)")}</label>
                <select className={selectClass} value={draft.xColumn ?? "branche"} onChange={(e) => set("xColumn", e.target.value)}>
                  {KUNDEN_CATEGORY_COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.labelDe} ({col.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>{t("widgetConfigYAxis", "Y-Achse / Wert")}</label>
                <select className={selectClass} value={draft.yColumn ?? "__count__"} onChange={(e) => set("yColumn", e.target.value)}>
                  {KUNDEN_VALUE_COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.labelDe}
                    </option>
                  ))}
                </select>
              </div>
              <AdvancedJsonBlock
                summary={t("widgetConfigAdvancedSeries", "Erweitert: Eigene Datenreihe (JSON)")}
                hint={t(
                  "widgetConfigChartManualHint",
                  "Wenn ausgefüllt, ersetzt dies die Datenbank-Auswertung vollständig. Leer lassen für die Auswahl oben."
                )}
              >
                <textarea className={ta} value={draft.chartJson ?? ""} onChange={(e) => set("chartJson", e.target.value)} spellCheck={false} />
              </AdvancedJsonBlock>
            </Section>
          )}
        </div>

        {error && (
          <div className="border-t border-red-100 bg-red-50/80 px-5 py-3">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <p className="hidden text-xs text-slate-500 sm:block">{t("widgetConfigFooterNote", "Nur lokal in diesem Browser gespeichert.")}</p>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {t("commonCancel", "Abbrechen")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {t("widgetConfigApply", "Übernehmen")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
