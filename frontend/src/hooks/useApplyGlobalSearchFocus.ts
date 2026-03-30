import { useEffect, useRef } from "react"
import {
  consumeSearchNavTarget,
  SEARCH_FOCUS_EVENT,
  type SearchNavCategory,
} from "../lib/globalSearchNavigation"

/**
 * When the user picks a row in the header global search, we store `{ category, id }` and
 * navigate. This hook consumes that target (if it matches this page) and calls `applyId`.
 */
export function useApplyGlobalSearchFocus(
  category: SearchNavCategory,
  applyId: (id: number) => void
): void {
  const applyRef = useRef(applyId)
  applyRef.current = applyId

  useEffect(() => {
    const run = () => {
      const id = consumeSearchNavTarget(category)
      if (id != null) applyRef.current(id)
    }
    window.addEventListener(SEARCH_FOCUS_EVENT, run)
    run()
    return () => window.removeEventListener(SEARCH_FOCUS_EVENT, run)
  }, [category])
}
