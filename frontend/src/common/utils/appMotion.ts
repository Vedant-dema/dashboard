/**
 * Resolved tier on `<html>` (`data-dema-motion`).
 * - OS `prefers-reduced-motion: reduce` → **minimal** (lets existing global `@media` rules reduce motion).
 * - Otherwise → **full** for all stored intents (including in-app “Minimal”): we do not strip animations
 *   in CSS when the OS still allows motion — users reported “Minimal” felt like everything stopped.
 * Stored `motionIntent` remains for Settings UI / future tuning; tier is OS-driven for reduction only.
 */
export type MotionIntent = "system" | "full" | "balanced" | "minimal";

export type MotionTier = "full" | "minimal";

const SETTINGS_KEY = "dema-app-settings";

export const DEFAULT_MOTION_INTENT: MotionIntent = "system";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function clampMotionIntent(raw: unknown): MotionIntent {
  if (raw === "full" || raw === "balanced" || raw === "minimal" || raw === "system") return raw;
  return DEFAULT_MOTION_INTENT;
}

export function readMotionIntentFromStorage(): MotionIntent {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_MOTION_INTENT;
    const s = JSON.parse(raw) as { motionIntent?: unknown };
    return clampMotionIntent(s.motionIntent);
  } catch {
    return DEFAULT_MOTION_INTENT;
  }
}

export function resolveMotionTier(_intent: MotionIntent): MotionTier {
  if (prefersReducedMotion()) return "minimal";
  return "full";
}

/** Optional hint for CSS/UX (`data-dema-device-tier`) so costly ambient effects can simplify on modest PCs. */
function applyDeviceTierHint(): void {
  if (typeof document === "undefined" || typeof navigator === "undefined") return;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const modest = cores <= 4 || (typeof mem === "number" && mem <= 4);
  document.documentElement.dataset.demaDeviceTier = modest ? "modest" : "capable";
}

export function applyMotionTierToDocument(tier: MotionTier): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.demaMotion = tier;
  applyDeviceTierHint();
}

export function applyMotionFromIntent(intent: MotionIntent): MotionTier {
  const tier = resolveMotionTier(intent);
  applyMotionTierToDocument(tier);
  return tier;
}

/** Call before React mounts so the first paint matches saved + OS policy. */
export function hydrateMotionFromStorage(): void {
  const intent = readMotionIntentFromStorage();
  applyMotionFromIntent(intent);
}

/** Subscribe when intent is "system" so OS changes update the resolved tier. */
export function subscribeSystemMotionPreference(onTierChange: (tier: MotionTier) => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => {
    const intent = readMotionIntentFromStorage();
    if (intent !== "system") return;
    onTierChange(applyMotionFromIntent(intent));
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
