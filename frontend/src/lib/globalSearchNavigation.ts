/** sessionStorage key for “open this exact row” after global search. */
export const SEARCH_TARGET_KEY = "dema-search-focus-v1"

/** Fired after hash navigation so pages can consume the target (same-hash navigations too). */
export const SEARCH_FOCUS_EVENT = "dema-search-focus"

export type SearchNavCategory =
  | "kunden"
  | "bestand"
  | "angebote"
  | "anfragen"
  | "rechnungen"
  | "abhol"
  | "verkaufter"

export type SearchNavTarget = {
  v: 1
  category: SearchNavCategory
  id: number
}

export function writeSearchNavTarget(target: SearchNavTarget): void {
  sessionStorage.setItem(SEARCH_TARGET_KEY, JSON.stringify(target))
}

/**
 * If the stored target matches `category`, remove it from session and return the entity id.
 * Otherwise leave storage unchanged (another page may consume it).
 */
export function consumeSearchNavTarget(category: SearchNavCategory): number | null {
  const raw = sessionStorage.getItem(SEARCH_TARGET_KEY)
  if (!raw) return null
  try {
    const t = JSON.parse(raw) as SearchNavTarget
    if (
      t?.v !== 1 ||
      t.category !== category ||
      typeof t.id !== "number" ||
      !Number.isFinite(t.id)
    ) {
      return null
    }
    sessionStorage.removeItem(SEARCH_TARGET_KEY)
    return t.id
  } catch {
    sessionStorage.removeItem(SEARCH_TARGET_KEY)
    return null
  }
}

/** Run after React has mounted the destination page (macrotask). */
export function dispatchSearchFocusEvent(): void {
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent(SEARCH_FOCUS_EVENT))
  }, 0)
}
