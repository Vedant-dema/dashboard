export function cfgString(c: Record<string, unknown>, key: string, fallback: string): string {
  const v = c[key];
  return typeof v === "string" && v.trim() !== "" ? v : fallback;
}

export function cfgArray<T>(c: Record<string, unknown>, key: string, fallback: T[]): T[] {
  const v = c[key];
  return Array.isArray(v) ? (v as T[]) : fallback;
}

export function parseConfigJsonArray<T>(c: Record<string, unknown>, key: string, fallback: T[]): T[] {
  const v = c[key];
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string" && v.trim()) {
    try {
      const p = JSON.parse(v) as unknown;
      return Array.isArray(p) ? (p as T[]) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}
