import { useEffect, useState } from "react";

const AVATAR_STORAGE_KEY = "dema-user-avatar";
export const PROFILE_AVATAR_CHANGED = "dema-profile-avatar-changed";

/** Max decoded image size before base64 (~1.2MB raw → ~1.6MB stored) */
const MAX_FILE_BYTES = 1_200_000;

export function getStoredProfileAvatarDataUrl(): string | null {
  try {
    const v = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (typeof v === "string" && v.startsWith("data:image/")) return v;
  } catch {
    // ignore
  }
  return null;
}

export function setStoredProfileAvatarDataUrl(dataUrl: string | null) {
  try {
    if (dataUrl) localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
    else localStorage.removeItem(AVATAR_STORAGE_KEY);
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
  const [url, setUrl] = useState<string | null>(() => getStoredProfileAvatarDataUrl());

  useEffect(() => {
    const sync = () => setUrl(getStoredProfileAvatarDataUrl());
    window.addEventListener(PROFILE_AVATAR_CHANGED, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(PROFILE_AVATAR_CHANGED, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return url;
}
