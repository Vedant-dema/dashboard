/**
 * Optional Latin/English spelling variants for names (OpenAI-compatible API on the backend).
 * Local dev: Vite proxies /api → backend; production: set VITE_API_BASE_URL.
 */
function withApiOrigin(path: string): string {
  const base = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

/** True when the backend has an OpenAI-compatible API key (optional extra suggestions). */
export async function fetchNameVariantsAiEnabled(): Promise<boolean> {
  try {
    const r = await fetch(withApiOrigin("/api/v1/name-variants/status"));
    if (!r.ok) return false;
    const j = (await r.json()) as { enabled?: boolean };
    return Boolean(j.enabled);
  } catch {
    return false;
  }
}

export async function suggestNameVariants(
  text: string,
  context: "company" | "person"
): Promise<string[]> {
  const r = await fetch(withApiOrigin("/api/v1/name-variants/suggest"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, context }),
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const j = (await r.json()) as { detail?: unknown };
      if (typeof j.detail === "string") msg = j.detail;
      else if (Array.isArray(j.detail))
        msg = j.detail.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ");
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const j = (await r.json()) as { variants?: unknown };
  const v = j.variants;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
