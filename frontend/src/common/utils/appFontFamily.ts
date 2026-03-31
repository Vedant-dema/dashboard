const SETTINGS_KEY = "dema-app-settings";

export const FONT_FAMILY_PRESET_IDS = ["inter", "system", "serif", "mono"] as const;

export type FontFamilyPresetId = (typeof FONT_FAMILY_PRESET_IDS)[number];

/** Full stacks for `font-family` (applied to `--dema-font-stack` on `html`). Loaded faces: Inter, Source Serif 4, JetBrains Mono (see `index.html`). */
export const FONT_FAMILY_STACKS: Record<FontFamilyPresetId, string> = {
  inter: 'Inter, ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  system:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  serif:
    '"Source Serif 4", "Noto Serif", Georgia, Cambria, "Times New Roman", Times, serif',
  mono:
    '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

export const DEFAULT_FONT_FAMILY_PRESET: FontFamilyPresetId = "inter";

export function clampFontFamilyPreset(raw: unknown): FontFamilyPresetId {
  if (typeof raw === "string" && FONT_FAMILY_PRESET_IDS.includes(raw as FontFamilyPresetId)) {
    return raw as FontFamilyPresetId;
  }
  return DEFAULT_FONT_FAMILY_PRESET;
}

export function applyFontFamilyPreset(id: FontFamilyPresetId): void {
  const htmlEl = document.documentElement;
  const stack = FONT_FAMILY_STACKS[id];
  htmlEl.setAttribute("data-dema-font-preset", id);
  htmlEl.style.setProperty("--dema-font-stack", stack);
  /* React mounts inside #root; mirror the variable here so descendants always resolve it after Tailwind layer order. */
  const mount = document.getElementById("root");
  if (mount) {
    mount.style.setProperty("--dema-font-stack", stack);
  }
}

export function readFontFamilyPresetFromStorage(): FontFamilyPresetId {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_FONT_FAMILY_PRESET;
    const s = JSON.parse(raw) as { fontFamilyPreset?: unknown };
    return clampFontFamilyPreset(s.fontFamilyPreset);
  } catch {
    return DEFAULT_FONT_FAMILY_PRESET;
  }
}

export function hydrateAppFontFamilyFromStorage(): void {
  applyFontFamilyPreset(readFontFamilyPresetFromStorage());
}
