import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";

/** Legacy: one global avatar for all users (caused every account to show the same photo). */
const LEGACY_AVATAR_KEY = "dema-user-avatar";
const AVATAR_KEY_PREFIX = "dema-user-avatar:";

export const PROFILE_AVATAR_CHANGED = "dema-profile-avatar-changed";

/** Max decoded image size before base64 (~1.2MB raw → ~1.6MB stored) */
const MAX_FILE_BYTES = 1_200_000;

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLowerCase() ?? "";
}

function keyForUser(email: string): string {
  return `${AVATAR_KEY_PREFIX}${normalizeEmail(email)}`;
}

function readValidDataUrl(raw: string | null): string | null {
  if (typeof raw === "string" && raw.startsWith("data:image/")) return raw;
  return null;
}

export function getStoredProfileAvatarDataUrl(userEmail?: string | null): string | null {
  const em = normalizeEmail(userEmail ?? undefined);
  try {
    if (em) {
      const keyed = readValidDataUrl(localStorage.getItem(keyForUser(em)));
      if (keyed) return keyed;
      const legacy = readValidDataUrl(localStorage.getItem(LEGACY_AVATAR_KEY));
      if (legacy) {
        try {
          localStorage.setItem(keyForUser(em), legacy);
          localStorage.removeItem(LEGACY_AVATAR_KEY);
        } catch {
          // quota / private mode — still return legacy for this read
        }
        return legacy;
      }
      return null;
    }
    return readValidDataUrl(localStorage.getItem(LEGACY_AVATAR_KEY));
  } catch {
    return null;
  }
}

export function setStoredProfileAvatarDataUrl(dataUrl: string | null, userEmail?: string | null) {
  const em = normalizeEmail(userEmail ?? undefined);
  try {
    if (em) {
      const key = keyForUser(em);
      if (dataUrl) localStorage.setItem(key, dataUrl);
      else localStorage.removeItem(key);
    }
    localStorage.removeItem(LEGACY_AVATAR_KEY);
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new Event(PROFILE_AVATAR_CHANGED));
}

export function readImageFileAsDataUrl(file: File): Promise<{ ok: true; dataUrl: string } | { ok: false; error: "type" | "size" }> {
  if (!file.type.startsWith("image/")) return Promise.resolve({ ok: false, error: "type" });
  if (file.size > MAX_FILE_BYTES) return Promise.resolve({ ok: false, error: "size" });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:image/")) resolve({ ok: true, dataUrl: result });
      else resolve({ ok: false, error: "type" });
    };
    reader.onerror = () => resolve({ ok: false, error: "type" });
    reader.readAsDataURL(file);
  });
}

export function useProfileAvatarDataUrl(): string | null {
  const { user } = useAuth();
  const email = normalizeEmail(user?.email);

  const [url, setUrl] = useState<string | null>(() => getStoredProfileAvatarDataUrl(user?.email));

  useEffect(() => {
    setUrl(getStoredProfileAvatarDataUrl(email || null));
  }, [email]);

  useEffect(() => {
    const sync = () => setUrl(getStoredProfileAvatarDataUrl(email || null));
    window.addEventListener(PROFILE_AVATAR_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, [email]);

  return url;
}
