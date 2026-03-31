/**
 * Optional “live” UI translation via the Python backend (Google Translate or LibreTranslate).
 * Local dev: Vite proxies /api → backend; production: set VITE_API_BASE_URL.
 */

const base = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/+$/, "");

function withApiOrigin(path: string): string {
  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}

export type UiTranslateStatus = {
  enabled: boolean;
  provider: "google" | "libre" | null;
};

export async function fetchUiTranslateStatus(signal?: AbortSignal): Promise<UiTranslateStatus> {
  const r = await fetch(withApiOrigin("/api/v1/ui-translate/status"), { signal });
  if (!r.ok) {
    throw new Error(`ui-translate status HTTP ${r.status}`);
  }
  return r.json() as Promise<UiTranslateStatus>;
}

export async function postUiTranslateBatch(
  texts: string[],
  target: string,
  source: string,
  signal?: AbortSignal
): Promise<string[]> {
  const r = await fetch(withApiOrigin("/api/v1/ui-translate/batch"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts, source, target }),
    signal,
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`ui-translate batch HTTP ${r.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }
  const data = (await r.json()) as { translations: string[] };
  return data.translations;
}

/** BCP-47 / Google v2 `target` tag for dashboard language codes. */
export function translationTargetForLanguage(code: string): string {
  const map: Record<string, string> = {
    de: "de",
    en: "en",
    fr: "fr",
    es: "es",
    it: "it",
    pt: "pt",
    tr: "tr",
    ru: "ru",
    hi: "hi",
    ar: "ar",
    zh: "zh-CN",
    ja: "ja",
  };
  return map[code] ?? code;
}
