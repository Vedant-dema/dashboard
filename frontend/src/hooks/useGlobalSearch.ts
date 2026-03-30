import { useMemo } from "react"
import { loadKundenDb } from "../store/kundenStore"
import { loadBestandDb } from "../store/bestandStore"
import { loadAngeboteDb } from "../store/angeboteStore"
import { loadAnfragenDb } from "../store/anfragenStore"
import { loadRechnungenDb } from "../store/rechnungenStore"

export type SearchCategory = "kunden" | "bestand" | "angebote" | "anfragen" | "rechnungen"

export interface GlobalSearchResult {
  id: string
  category: SearchCategory
  primary: string
  secondary: string
  navigateTo: string
  storageKey: string
  storageValue: string
}

export interface GlobalSearchResults {
  kunden: GlobalSearchResult[]
  bestand: GlobalSearchResult[]
  angebote: GlobalSearchResult[]
  anfragen: GlobalSearchResult[]
  rechnungen: GlobalSearchResult[]
  total: number
}

const MAX_PER_CATEGORY = 5

function norm(s: string): string {
  return s.toLowerCase().trim()
}

function matches(q: string, ...fields: (string | undefined | null)[]): boolean {
  return fields.some((f) => f && norm(f).includes(q))
}

export function useGlobalSearch(query: string, dbTick: number): GlobalSearchResults {
  return useMemo(() => {
    const q = norm(query)
    if (q.length < 2) {
      return { kunden: [], bestand: [], angebote: [], anfragen: [], rechnungen: [], total: 0 }
    }

    // ── Customers ──────────────────────────────────────────────────────────────
    const kundenDb = loadKundenDb()
    const kundenResults: GlobalSearchResult[] = []
    for (const k of kundenDb.kunden) {
      if (k.deleted) continue
      if (matches(q, k.kunden_nr, k.firmenname, k.email)) {
        kundenResults.push({
          id: `kunden-${k.id}`,
          category: "kunden",
          primary: k.firmenname || k.kunden_nr,
          secondary: [k.kunden_nr, k.ort].filter(Boolean).join(" · "),
          navigateTo: "#/sales/kunden",
          storageKey: "dema-search-q",
          storageValue: k.firmenname || k.kunden_nr,
        })
        if (kundenResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Inventory (Bestand) ────────────────────────────────────────────────────
    const bestandDb = loadBestandDb()
    const bestandResults: GlobalSearchResult[] = []
    for (const r of bestandDb.rows) {
      if (matches(q, r.positions_nr, r.fabrikat, r.typ, r.firmenname, r.fahrgestellnummer)) {
        bestandResults.push({
          id: `bestand-${r.id}`,
          category: "bestand",
          primary: [r.fabrikat, r.typ].filter(Boolean).join(" "),
          secondary: [r.positions_nr, r.firmenname, r.ort].filter(Boolean).join(" · "),
          navigateTo: "#/sales/bestand",
          storageKey: "dema-search-q-bestand",
          storageValue: query.trim(),
        })
        if (bestandResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Offers (Angebote) ──────────────────────────────────────────────────────
    const angeboteDb = loadAngeboteDb()
    const angeboteResults: GlobalSearchResult[] = []
    for (const a of angeboteDb.angebote) {
      if (matches(q, a.angebot_nr, a.firmenname, a.fabrikat, a.typ)) {
        angeboteResults.push({
          id: `angebot-${a.id}`,
          category: "angebote",
          primary: [a.fabrikat, a.typ].filter(Boolean).join(" ") || a.angebot_nr,
          secondary: [a.angebot_nr, a.firmenname].filter(Boolean).join(" · "),
          navigateTo: "#/sales/angebote",
          storageKey: "dema-search-q-angebote",
          storageValue: query.trim(),
        })
        if (angeboteResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Inquiries (Anfragen) ───────────────────────────────────────────────────
    const anfragenDb = loadAnfragenDb()
    const anfragenResults: GlobalSearchResult[] = []
    for (const a of anfragenDb.anfragen) {
      if (matches(q, a.anfrage_nr, a.firmenname, a.fabrikat)) {
        anfragenResults.push({
          id: `anfrage-${a.id}`,
          category: "anfragen",
          primary: a.firmenname || a.anfrage_nr,
          secondary: [a.anfrage_nr, a.fabrikat, a.aufbauart].filter(Boolean).join(" · "),
          navigateTo: "#/sales/anfragen",
          storageKey: "dema-search-q-anfragen",
          storageValue: query.trim(),
        })
        if (anfragenResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Invoices (Rechnungen) ──────────────────────────────────────────────────
    const rechnungenDb = loadRechnungenDb()
    const rechnungenResults: GlobalSearchResult[] = []
    for (const r of rechnungenDb.rows) {
      if (matches(q, r.rechn_nr, r.firmenname, r.kunden_nr, r.fahrgestell_nr)) {
        rechnungenResults.push({
          id: `rechnung-${r.id}`,
          category: "rechnungen",
          primary: r.firmenname || r.rechn_nr,
          secondary: [r.rechn_nr, r.kunden_nr, r.ort].filter(Boolean).join(" · "),
          navigateTo: "#/sales/rechnungen",
          storageKey: "dema-search-q-rechnungen",
          storageValue: query.trim(),
        })
        if (rechnungenResults.length >= MAX_PER_CATEGORY) break
      }
    }

    const total =
      kundenResults.length +
      bestandResults.length +
      angeboteResults.length +
      anfragenResults.length +
      rechnungenResults.length

    return { kunden: kundenResults, bestand: bestandResults, angebote: angeboteResults, anfragen: anfragenResults, rechnungen: rechnungenResults, total }
    // dbTick is used to force re-run when any store changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, dbTick])
}
