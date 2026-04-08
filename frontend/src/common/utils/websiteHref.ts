/**
 * Build a safe http(s) URL for linking from user-typed website text.
 * Does not mutate the stored value — use only for href resolution.
 */
export function safeWebsiteHref(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (/^[a-z][a-z0-9+.-]*:/i.test(t)) {
    if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
      return null;
    }
  }
  const candidate =
    lower.startsWith("http://") || lower.startsWith("https://") ? t : `https://${t}`;
  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return null;
    }
    return u.href;
  } catch {
    return null;
  }
}
