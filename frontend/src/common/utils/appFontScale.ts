/**
 * Adjusts Tailwind text utilities only (`text-xs` … `text-9xl` via theme), via `--dema-font-scale`.
 * Spacing, icons, and layout rem values stay unchanged — avoids a full-page “zoom” feel.
 */
export const FONT_SIZE_STEP_MULTIPLIERS = [0.88, 0.94, 1, 1.08, 1.14, 1.2, 1.26] as const;

export const DEFAULT_FONT_SIZE_STEP_INDEX = 2;

const SETTINGS_KEY = "dema-app-settings";

export function clampFontSizeStepIndex(raw: number): number {
  const max = FONT_SIZE_STEP_MULTIPLIERS.length - 1;
  if (!Number.isFinite(raw)) return DEFAULT_FONT_SIZE_STEP_INDEX;
  return Math.max(0, Math.min(max, Math.round(raw)));
}

export function applyFontSizeStepIndex(stepIndex: number): void {
  const i = clampFontSizeStepIndex(stepIndex);
  const root = document.documentElement;
  root.style.removeProperty("font-size");
  root.style.setProperty("--dema-font-scale", String(FONT_SIZE_STEP_MULTIPLIERS[i]));
}

export function readFontSizeStepIndexFromStorage(): number {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_FONT_SIZE_STEP_INDEX;
    const s = JSON.parse(raw) as { fontSizeStepIndex?: unknown };
    if (typeof s.fontSizeStepIndex === "number") {
      return clampFontSizeStepIndex(s.fontSizeStepIndex);
    }
  } catch {
    // ignore
  }
  return DEFAULT_FONT_SIZE_STEP_INDEX;
}

/** Rounded percent for UI labels (100 = default). */
export function fontSizeStepLabelPercent(stepIndex: number): number {
  const i = clampFontSizeStepIndex(stepIndex);
  return Math.round(FONT_SIZE_STEP_MULTIPLIERS[i] * 100);
}

/** Call before React mounts so the first paint matches saved settings. */
export function hydrateAppFontScaleFromStorage(): void {
  applyFontSizeStepIndex(readFontSizeStepIndexFromStorage());
}
