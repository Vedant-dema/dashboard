export { customerRepository } from "./repository/customerRepository";
export type {
  PersistedCustomerRecord,
  PersistedCustomerDetail,
  PersistedCustomerWashProfile,
  PersistedCustomerDatabaseState,
} from "./types/persistedCustomer";
export type { VatCheckResponseDto } from "./types/customerApiDto";
export type { CustomerFormDraft, AdresseEntry, KontaktEntry } from "./mappers/customerFormMapper";
export {
  initialForm,
  formFromExistingCustomer,
  formToPayload,
  washFormToPayload,
  serializeFormStateForDirtyBaseline,
  computeCustomerProfileCompletionPct,
  emptyAdresse,
  emptyKontakt,
  splitStoredPhone,
  priceToInput,
} from "./mappers/customerFormMapper";
export { ADRESSE_TYPEN, ADRESSE_TYP_I18N, ADRESSE_COLORS, COUNTRY_CODES, landCodeToArtLand } from "./mappers/customerFormConstants";
export { viesResultToSnapshot, snapshotToViesCheckResult } from "./mappers/vatCheckSnapshotMapper";
export {
  validateCustomerCompanyNameRequired,
  collectNewCustomerKundeRequiredIssues,
  NEW_CUSTOMER_KUNDE_FOCUS,
} from "./validators/customerValidation";
export { useCustomerForm } from "./hooks/useCustomerForm";
export { CustomerModalFrame } from "./components/CustomerModalFrame";
export { CustomerModalHeader } from "./components/CustomerModalHeader";
export { CustomerHistoryTimeline } from "./components/CustomerHistoryTimeline";
