import { UserPlus, Truck, FileText, Receipt } from "lucide-react";
import { useWidgetLanguage } from "./useWidgetLanguage";

export function QuickActionsWidget() {
  const { t } = useWidgetLanguage();
  const actions = [
    { label: t("quickActionCustomer", "Kunde anlegen"), icon: UserPlus, color: "bg-blue-500" },
    { label: t("quickActionVehicle", "Fahrzeug erfassen"), icon: Truck, color: "bg-emerald-500" },
    { label: t("quickActionOffer", "Angebot erstellen"), icon: FileText, color: "bg-violet-500" },
    { label: t("quickActionInvoice", "Rechnung erstellen"), icon: Receipt, color: "bg-amber-500" },
  ];

  return (
    <div className="glass-card flex h-full flex-col p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{t("quickActionsTitle", "Schnelle Aktionen")}</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left transition hover:border-blue-200 hover:bg-white hover:shadow-md"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${a.color}`}>
              <a.icon className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-slate-700">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
