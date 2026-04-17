import { Loader2 } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

/** Shown while lazy route chunks load after navigation (inside LanguageProvider). */
export function AppRouteFallback() {
  const { t } = useLanguage();
  return (
    <div
      className="flex min-h-[40vh] flex-1 flex-col items-center justify-center gap-3 text-sm text-slate-500"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 shrink-0 animate-spin text-teal-600" aria-hidden />
      <span>{t("customersLoading", "Loading…")}</span>
    </div>
  );
}
