/** Detects HTML/HTTP proxy error bodies (e.g. Google 504) mistaken for VIES trader name/address. */
export function isViesProxyHttpErrorGarbage(s: string): boolean {
  if (s.length < 14) return false;
  const low = s.toLowerCase();
  const ap = low.replace(/\u2019/g, "'").replace(/\u2018/g, "'");
  if (low.includes("<html") || low.includes("<!doctype")) return true;
  if (low.includes("bad gateway") || low.includes("gateway timeout")) return true;
  if (ap.includes("please try again later")) return true;
  if (ap.includes("that's all we know")) return true;
  if (ap.includes("that's an error") || ap.includes("that is an error")) return true;
  if (ap.includes("server error") && /\b50[0-4]\b/.test(s)) return true;
  if (/\berror\s*\(?\s*50[234]\s*\)?/i.test(s)) return true;
  return false;
}
