import { FileText, Receipt, Truck, UserPlus, type LucideIcon } from "lucide-react";
import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgArray, cfgString } from "./widgetConfigHelpers";

const ICONS: LucideIcon[] = [UserPlus, Truck, FileText, Receipt];

const COLOR_CLASS: Record<string, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  violet: "bg-violet-500",
  amber: "bg-amber-500",
  slate: "bg-slate-500",
};

export function QuickActionsWidget({ config }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const title = cfgString(config, "customTitle", t("quickActionsTitle", "Schnelle Aktionen"));
  const raw = cfgArray<{ label?: string; color?: string }>(config, "quickActions", []);
  const actions =
    raw.length > 0
      ? raw.map((a, i) => ({
          label: a.label ?? `Aktion ${i + 1}`,
          color: a.color ?? "slate",
          icon: ICONS[i % ICONS.length],
        }))
      : [
          { label: t("quickActionCustomer", "Kunde anlegen"), color: "blue", icon: UserPlus },
          { label: t("quickActionVehicle", "Fahrzeug erfassen"), color: "emerald", icon: Truck },
          { label: t("quickActionOffer", "Angebot erstellen"), color: "violet", icon: FileText },
          { label: t("quickActionInvoice", "Rechnung erstellen"), color: "amber", icon: Receipt },
        ];

  return (
    <div className="glass-card flex h-full flex-col p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left transition hover:border-blue-200 hover:bg-white hover:shadow-md"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${COLOR_CLASS[a.color] ?? "bg-slate-500"}`}
            >
              <a.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
