import { useEffect, useState } from "react";

const STORAGE_KEY = "dema-profile-settings";
export const PROFILE_EXTRA_SETTINGS_CHANGED = "dema-profile-extra-settings-changed";

export type ProfileExtraSettings = {
  name: string;
  location: string;
  phone: string;
  jobTitle: string;
  /** When set, extra name/location/etc. apply only for this session email (avoids stale data across accounts). */
  boundEmail: string;
};

function readRaw(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as unknown;
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function getProfileExtraSettings(): ProfileExtraSettings {
  const o = readRaw();
  return {
    name: typeof o.name === "string" ? o.name : "",
    location: typeof o.location === "string" ? o.location : "",
    phone: typeof o.phone === "string" ? o.phone : "",
    jobTitle: typeof o.jobTitle === "string" ? o.jobTitle : "",
    boundEmail: typeof o.boundEmail === "string" ? o.boundEmail : "",
  };
}

/** Merges into existing JSON so legacy keys (e.g. mfaEnabled) stay intact. */
export function mergeProfileExtraSettings(updates: Partial<ProfileExtraSettings>) {
  const prev = readRaw();
  const next = { ...prev, ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(PROFILE_EXTRA_SETTINGS_CHANGED));
}

export function useProfileExtraSettings(): ProfileExtraSettings {
  const [snap, setSnap] = useState(() => getProfileExtraSettings());

  useEffect(() => {
    const sync = () => setSnap(getProfileExtraSettings());
    window.addEventListener(PROFILE_EXTRA_SETTINGS_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROFILE_EXTRA_SETTINGS_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return snap;
}

export function resolveDisplayName(
  sessionEmail: string | undefined,
  authName: string | undefined,
  extra: Pick<ProfileExtraSettings, "name" | "boundEmail">
): string {
  const em = sessionEmail?.trim().toLowerCase() ?? "";
  const bound = extra.boundEmail.trim().toLowerCase();
  if (em && bound === em && extra.name.trim()) return extra.name.trim();
  return authName?.trim() || "";
}

export function profileExtraMatchesSession(
  sessionEmail: string | undefined,
  extra: Pick<ProfileExtraSettings, "boundEmail">
): boolean {
  const em = sessionEmail?.trim().toLowerCase() ?? "";
  const bound = extra.boundEmail.trim().toLowerCase();
  return Boolean(em && bound && bound === em);
}
