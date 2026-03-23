import { useWidgetLanguage } from "./useWidgetLanguage";

export function WelcomeWidget() {
  const { t } = useWidgetLanguage();
  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">
        {t("welcomeTitle", "Willkommen im DEMA Management System")}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {t("welcomeSubtitle", "Hier ist Ihre Übersicht — Sales, Purchase und Waschanlage auf einen Blick.")}
      </p>
    </div>
  );
}
