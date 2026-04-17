import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgString } from "./widgetConfigHelpers";
import { DEFAULT_WELCOME_SUBTITLE, DEFAULT_WELCOME_TITLE } from "./defaultWidgetData";
import { WELCOME_PRESETS } from "./widgetListPresets";

export function WelcomeWidget({ config }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const pid = typeof config.welcomePresetId === "string" ? config.welcomePresetId : null;
  const preset = pid ? WELCOME_PRESETS.find((p) => p.id === pid) : undefined;

  const title = preset
    ? preset.title
    : cfgString(config, "welcomeTitle", t("welcomeTitle", DEFAULT_WELCOME_TITLE));
  const subtitle = preset
    ? preset.subtitle
    : cfgString(config, "welcomeSubtitle", t("welcomeSubtitle", DEFAULT_WELCOME_SUBTITLE));
  const showSubtitle = subtitle.trim().length > 0;

  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
      {showSubtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
  );
}
