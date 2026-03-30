import { useMemo } from "react"
import { combinedMatch, searchQueryMeetsMinimum } from "../lib/globalSearchMatch"
import { loadKundenDb } from "../store/kundenStore"
import { loadBestandDb } from "../store/bestandStore"
import { loadAngeboteDb } from "../store/angeboteStore"
import { loadAnfragenDb } from "../store/anfragenStore"
import { loadRechnungenDb } from "../store/rechnungenStore"
import { loadAbholauftraegeDb } from "../store/abholauftraegeStore"
import { loadVerkaufterBestandDb } from "../store/verkaufterBestandStore"

export type SearchCategory =
  | "kunden"
  | "bestand"
  | "angebote"
  | "anfragen"
  | "rechnungen"
  | "abhol"
  | "verkaufter"

export interface GlobalSearchResult {
  id: string
  category: SearchCategory
  /** Numeric row id on the target page (used to open the exact record after navigation). */
  entityId: number
  primary: string
  secondary: string
  navigateTo: string
}

export interface GlobalSearchResults {
  kunden: GlobalSearchResult[]
  bestand: GlobalSearchResult[]
  angebote: GlobalSearchResult[]
  anfragen: GlobalSearchResult[]
  rechnungen: GlobalSearchResult[]
  abhol: GlobalSearchResult[]
  verkaufter: GlobalSearchResult[]
  total: number
}

const MAX_PER_CATEGORY = 5

export function useGlobalSearch(query: string, dbTick: number): GlobalSearchResults {
  return useMemo(() => {
    const empty: GlobalSearchResults = {
      kunden: [],
      bestand: [],
      angebote: [],
      anfragen: [],
      rechnungen: [],
      abhol: [],
      verkaufter: [],
      total: 0,
    }

    if (!searchQueryMeetsMinimum(query)) return empty

    const qTrim = query.trim()

    // ── Customers ────────────────────────────────────────────────────────────
    const kundenDb = loadKundenDb()
    const kundenResults: GlobalSearchResult[] = []
    for (const k of kundenDb.kunden) {
      if (k.deleted) continue
      if (
        combinedMatch(
          qTrim,
          [
            k.kunden_nr,
            k.firmenname,
            k.email,
            k.telefonnummer,
            k.faxnummer,
            k.strasse,
            k.plz,
            k.ort,
            k.land_code,
            k.ansprechpartner,
            k.ust_id_nr,
            k.steuer_nr,
            k.branche,
            k.internet_adr,
            k.bemerkungen,
          ],
          [k.telefonnummer, k.faxnummer, k.kunden_nr]
        )
      ) {
        kundenResults.push({
          id: `kunden-${k.id}`,
          category: "kunden",
          entityId: k.id,
          primary: k.firmenname || k.kunden_nr,
          secondary: [k.kunden_nr, k.telefonnummer, k.ort].filter(Boolean).join(" · "),
          navigateTo: "#/sales/kunden",
        })
        if (kundenResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Inventory (Bestand) ──────────────────────────────────────────────────
    const bestandDb = loadBestandDb()
    const bestandResults: GlobalSearchResult[] = []
    for (const r of bestandDb.rows) {
      if (
        combinedMatch(
          qTrim,
          [
            r.positions_nr,
            r.fabrikat,
            r.typ,
            r.firmenname,
            r.fahrgestellnummer,
            r.ort,
            r.plz,
            r.land,
            r.kreditor_nr,
            r.telefonnummer,
            r.letzte_kz,
            r.modellreihe,
            r.import_nr,
            r.beteiligter,
            r.einkaeufer,
          ],
          [r.fahrgestellnummer, r.telefonnummer, r.positions_nr, r.kreditor_nr]
        )
      ) {
        bestandResults.push({
          id: `bestand-${r.id}`,
          category: "bestand",
          entityId: r.id,
          primary: [r.fabrikat, r.typ].filter(Boolean).join(" "),
          secondary: [r.positions_nr, r.firmenname, r.ort].filter(Boolean).join(" · "),
          navigateTo: "#/sales/bestand",
        })
        if (bestandResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Offers (Angebote) ──────────────────────────────────────────────────────
    const angeboteDb = loadAngeboteDb()
    const angeboteResults: GlobalSearchResult[] = []
    for (const a of angeboteDb.angebote) {
      if (
        combinedMatch(
          qTrim,
          [
            a.angebot_nr,
            a.firmenname,
            a.fabrikat,
            a.typ,
            a.modellreihe,
            a.plz,
            a.ort,
            a.fahrgestellnummer,
            a.bemerkungen,
            a.land_code,
            a.fahrzeugart,
            a.aufbauart,
          ],
          [a.fahrgestellnummer]
        )
      ) {
        angeboteResults.push({
          id: `angebot-${a.id}`,
          category: "angebote",
          entityId: a.id,
          primary: [a.fabrikat, a.typ].filter(Boolean).join(" ") || a.angebot_nr,
          secondary: [a.angebot_nr, a.firmenname].filter(Boolean).join(" · "),
          navigateTo: "#/sales/angebote",
        })
        if (angeboteResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Inquiries (Anfragen) ───────────────────────────────────────────────────
    const anfragenDb = loadAnfragenDb()
    const anfragenResults: GlobalSearchResult[] = []
    for (const a of anfragenDb.anfragen) {
      if (
        combinedMatch(
          qTrim,
          [
            a.anfrage_nr,
            a.firmenname,
            a.fabrikat,
            a.typ,
            a.extras,
            a.debitor_nr,
            a.bearbeiter_sb,
            a.bemerkungen,
            a.fahrzeugart,
            a.aufbauart,
          ],
          [a.debitor_nr]
        )
      ) {
        anfragenResults.push({
          id: `anfrage-${a.id}`,
          category: "anfragen",
          entityId: a.id,
          primary: a.firmenname || a.anfrage_nr,
          secondary: [a.anfrage_nr, a.fabrikat, a.aufbauart].filter(Boolean).join(" · "),
          navigateTo: "#/sales/anfragen",
        })
        if (anfragenResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Invoices (Rechnungen) ──────────────────────────────────────────────────
    const rechnungenDb = loadRechnungenDb()
    const rechnungenResults: GlobalSearchResult[] = []
    for (const r of rechnungenDb.rows) {
      if (
        combinedMatch(
          qTrim,
          [
            r.rechn_nr,
            r.firmenname,
            r.kunden_nr,
            r.fahrgestell_nr,
            r.positions_nr,
            r.verkaufs_nr,
            r.ort,
            r.plz,
            r.land,
            r.art,
            r.buchung,
            r.vermerk,
            r.ust_id,
            r.ersteller,
            r.verkaufer,
          ],
          [r.kunden_nr, r.fahrgestell_nr, r.rechn_nr, r.positions_nr, r.verkaufs_nr]
        )
      ) {
        rechnungenResults.push({
          id: `rechnung-${r.id}`,
          category: "rechnungen",
          entityId: r.id,
          primary: r.firmenname || r.rechn_nr,
          secondary: [r.rechn_nr, r.kunden_nr, r.ort].filter(Boolean).join(" · "),
          navigateTo: "#/sales/rechnungen",
        })
        if (rechnungenResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Pickup orders (Abholaufträge) ──────────────────────────────────────────
    const abholDb = loadAbholauftraegeDb()
    const abholResults: GlobalSearchResult[] = []
    for (const r of abholDb.rows) {
      if (
        combinedMatch(
          qTrim,
          [
            r.kunde_anzeige,
            r.fahrgestellnummer,
            r.fahrgestellnummer_2,
            r.fabrikat,
            r.typ,
            r.fahrzeugart,
            r.aufbauart,
          ],
          [r.fahrgestellnummer, r.fahrgestellnummer_2]
        )
      ) {
        abholResults.push({
          id: `abhol-${r.id}`,
          category: "abhol",
          entityId: r.id,
          primary:
            [r.fabrikat, r.typ].filter(Boolean).join(" ") ||
            (r.kunde_anzeige ? r.kunde_anzeige.slice(0, 48) : "") ||
            r.fahrgestellnummer,
          secondary: [r.kunde_anzeige, r.fahrgestellnummer].filter(Boolean).join(" · "),
          navigateTo: "#/sales/abholauftraege",
        })
        if (abholResults.length >= MAX_PER_CATEGORY) break
      }
    }

    // ── Sold inventory ─────────────────────────────────────────────────────────
    const verkDb = loadVerkaufterBestandDb()
    const verkaufterResults: GlobalSearchResult[] = []
    for (const r of verkDb.rows) {
      if (
        combinedMatch(
          qTrim,
          [
            r.position_anzeige,
            r.firmenname,
            r.fahrgestellnummer,
            r.debitor_nr,
            r.plz,
            r.ort,
            r.land,
            r.fabrikat,
            r.typ,
            r.telefonnummer,
            r.extras,
            r.import_verkaufs_nr,
            r.einkaeufer,
            r.verkaeufer,
            r.linkaeufer,
            r.beteiligter,
          ],
          [r.telefonnummer, r.fahrgestellnummer, r.debitor_nr]
        )
      ) {
        verkaufterResults.push({
          id: `verkaufter-${r.id}`,
          category: "verkaufter",
          entityId: r.id,
          primary: r.firmenname || [r.fabrikat, r.typ].filter(Boolean).join(" "),
          secondary: [r.position_anzeige, r.fahrgestellnummer, r.telefonnummer].filter(Boolean).join(" · "),
          navigateTo: "#/sales/verkaufter-bestand",
        })
        if (verkaufterResults.length >= MAX_PER_CATEGORY) break
      }
    }

    const total =
      kundenResults.length +
      bestandResults.length +
      angeboteResults.length +
      anfragenResults.length +
      rechnungenResults.length +
      abholResults.length +
      verkaufterResults.length

    return {
      kunden: kundenResults,
      bestand: bestandResults,
      angebote: angeboteResults,
      anfragen: anfragenResults,
      rechnungen: rechnungenResults,
      abhol: abholResults,
      verkaufter: verkaufterResults,
      total,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, dbTick])
}
