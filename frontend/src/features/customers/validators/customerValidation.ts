import type { CustomerFormDraft } from "../mappers/customerFormMapper";

export type CustomerSaveValidationResult =
  | { ok: true }
  | { ok: false; messageKey: string; messageFallback: string };

export function validateCustomerCompanyNameRequired(form: CustomerFormDraft): CustomerSaveValidationResult {
  if (!form.firmenname.trim()) {
    return {
      ok: false,
      messageKey: "newCustomerRequiredFirmenname",
      messageFallback: "Please enter a company name.",
    };
  }
  return { ok: true };
}
