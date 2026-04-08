/**
 * Domain types for persisted customer aggregates (browser local storage + optional shared API today).
 * Aliases keep feature code decoupled from storage table naming (`Kunden*`).
 */
export type {
  KundenStamm as PersistedCustomerRecord,
  KundenWashStamm as PersistedCustomerWashProfile,
  KundenDetailWithWash as PersistedCustomerDetail,
  KundenDbState as PersistedCustomerDatabaseState,
  KundenHistoryEntry,
  KundenFieldChange,
} from "../../../types/kunden";
