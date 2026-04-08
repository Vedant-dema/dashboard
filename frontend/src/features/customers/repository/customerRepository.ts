/**
 * Customer data access facade. Today this delegates to `kundenStore` (localStorage / optional demo API).
 * UI and feature code should prefer this module over importing storage keys or blob helpers directly.
 */
import type { KundenDbState } from "../../../types/kunden";
import {
  loadKundenDb,
  saveKundenDb,
  listRowsFromState,
  listDeletedRowsFromState,
  getDetailByKundenNr,
  createKunde,
  generateNextKundenNr,
  updateKunde,
  deleteKunde,
  restoreKunde,
  purgeKunde,
  upsertKundenWash,
  addKundenUnterlage,
  removeKundenUnterlage,
  listUnterlagenForKunde,
  listTermineForKunde,
  addKundenTermin,
  toggleTerminErledigt,
  removeKundenTermin,
  listBeziehungenForKunde,
  addKundenBeziehung,
  removeKundenBeziehung,
  isCustomersApiMode,
  loadSharedKundenDb,
  saveSharedKundenDb,
  getRisikoanalyseForKunde,
  upsertRisikoanalyse,
  getExpiryStatus,
  getRiskDocRowDisplayStatus,
  daysUntilExpiry,
  hasRisikoAlert,
  listHistoryForKunde,
  mergeWashStateForDiff,
  computeKundenWashFieldDiff,
  loadOfficialCustomerHistory,
  isCustomersDbConflictError,
} from "../../../store/kundenStore";

export type {
  KundenListRow,
  NewKundeInput,
  NewKundenUnterlageInput,
  KundenWashUpsertFields,
  RisikoanalyseUpsertFields,
  AuditEditor,
  KundenHistoryEntry,
  KundenFieldChange,
} from "../../../store/kundenStore";

export { BOOLEAN_KUNDEN_HISTORY_FIELDS, BOOLEAN_WASH_HISTORY_FIELDS } from "../../../store/kundenStore";
export { isCustomersDbConflictError, CustomersDbConflictError } from "../../../store/kundenStore";

export const customerRepository = {
  loadLocalDb: (): KundenDbState => loadKundenDb(),
  saveLocalDb: (state: KundenDbState): void => {
    saveKundenDb(state);
  },
  isApiMode: (): boolean => isCustomersApiMode(),
  isCustomersDbConflictError,
  loadSharedDb: loadSharedKundenDb,
  saveSharedDb: saveSharedKundenDb,

  listRows: listRowsFromState,
  listDeletedRows: listDeletedRowsFromState,
  getDetailByKundenNr,
  createKunde,
  generateNextKundenNr,
  updateKunde,
  deleteKunde,
  restoreKunde,
  purgeKunde,
  upsertKundenWash,

  addKundenUnterlage,
  removeKundenUnterlage,
  listUnterlagenForKunde,

  listTermineForKunde,
  addKundenTermin,
  toggleTerminErledigt,
  removeKundenTermin,

  listBeziehungenForKunde,
  addKundenBeziehung,
  removeKundenBeziehung,

  getRisikoanalyseForKunde,
  upsertRisikoanalyse,
  getExpiryStatus,
  getRiskDocRowDisplayStatus,
  daysUntilExpiry,
  hasRisikoAlert,

  listHistoryForKunde,
  loadOfficialCustomerHistory,
  mergeWashStateForDiff,
  computeKundenWashFieldDiff,
} as const;
