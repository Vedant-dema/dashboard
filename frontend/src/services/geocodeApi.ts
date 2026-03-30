/**
 * Geocode search goes through the Python backend (OSM, Mapbox, or Google — see GEOCODING_PROVIDER).
 * Direct browser calls to third-party geocoders are avoided (CORS, API keys).
 *
 * Local dev: Vite proxies /api → http://127.0.0.1:8000 — leave VITE_API_BASE_URL empty.
 * We use an absolute URL (same origin) so the dev server always proxies reliably.
 * Production: set VITE_API_BASE_URL to the backend origin (full URL, no trailing slash).
 */
function withApiOrigin(path: string): string {
  const base = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/+$/, "");
  if (base) return `${base}${path}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

export function buildGeocodeSearchUrl(q: string, lang: string): string {
  const path = `/api/v1/geocode/search?${new URLSearchParams({ q, lang }).toString()}`;
  return withApiOrigin(path);
}

/** Active geocoder id for UI attribution (`osm` | `mapbox` | `google` | `invalid`). */
export function buildGeocodeProviderUrl(): string {
  return withApiOrigin("/api/v1/geocode/provider");
}
