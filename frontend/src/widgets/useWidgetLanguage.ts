import { useContext, useMemo } from "react";
import { LanguageContext, type LanguageContextType } from "../contexts/LanguageContext";

const WIDGET_I18N_FALLBACK: LanguageContextType = {
  language: "de",
  setLanguage: () => {},
  t: (_key, fallback) => fallback ?? _key,
  localeTag: "de-DE",
  languageOptions: [],
};

/**
 * Dashboard widgets sit under react-grid-layout; use this instead of `useLanguage()` so a missing
 * provider (HMR, duplicate React, or layout edge cases) cannot crash the whole app.
 */
export function useWidgetLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  return useMemo(() => ctx ?? WIDGET_I18N_FALLBACK, [ctx]);
}
