import type { CustomerFormDraft } from "../mappers/customerFormMapper";
import { normalizePhoneValue } from "../mappers/customerFormMapper";

export type CustomerSaveValidationResult =
  | { ok: true }
  | { ok: false; messageKey: string; messageFallback: string };

/** DOM ids for `focusModalCustomerField` — keep in sync with `NewCustomerModal` inputs. */
export const NEW_CUSTOMER_KUNDE_FOCUS = {
  customerType: "new-kunde-field-customer-type",
  branche: "new-kunde-field-branche",
  fzgHandelJa: "new-kunde-field-fzg-ja",
  gesellschaftsform: "new-kunde-field-gesellschaftsform",
  firmenname: "new-kunde-field-firmenname",
  strasse: "new-kunde-field-strasse",
  plz: "new-kunde-field-plz",
  ort: "new-kunde-field-ort",
  land: "new-kunde-field-land",
  ust: "new-kunde-field-ust-id",
  kontaktName: "new-kunde-field-kontakt-name",
  kontaktTelefon: "new-kunde-field-kontakt-telefon",
  kontaktEmail: "new-kunde-field-kontakt-email",
} as const;

export type NewCustomerKundeSaveIssue = {
  messageKey: string;
  messageFallback: string;
  fieldId: string;
  /** Switch modal sub-views so the focused field exists in the DOM. */
  preFocus?: "mainAdresse" | "primaryKontakt";
};

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

/**
 * Ordered checks for the "Kunde & Adresse" tab before save (primary address = `adressen[0]`,
 * primary contact = `kontakte[0]`).
 */
export function collectNewCustomerKundeRequiredIssues(form: CustomerFormDraft): NewCustomerKundeSaveIssue[] {
  const issues: NewCustomerKundeSaveIssue[] = [];
  const main = form.adressen[0];
  const k0 = form.kontakte[0];

  if (!form.customer_type) {
    issues.push({
      messageKey: "newCustomerRequiredCustomerType",
      messageFallback: "Please select a customer type.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.customerType,
    });
  }

  if (!form.branche.trim()) {
    issues.push({
      messageKey: "newCustomerRequiredBranche",
      messageFallback: "Please enter an industry.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.branche,
    });
  }

  if (form.fzgHandel !== "ja" && form.fzgHandel !== "nein") {
    issues.push({
      messageKey: "newCustomerRequiredFzgHandel",
      messageFallback: "Please select whether the customer is a vehicle trader (Yes / No).",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.fzgHandelJa,
    });
  }

  if (!form.gesellschaftsform.trim()) {
    issues.push({
      messageKey: "newCustomerRequiredGesellschaftsform",
      messageFallback: "Please enter a legal form.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.gesellschaftsform,
    });
  }

  if (!form.firmenname.trim()) {
    issues.push({
      messageKey: "newCustomerRequiredFirmenname",
      messageFallback: "Please enter a company name.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.firmenname,
    });
  }

  const strasse = (main?.strasse ?? "").trim();
  if (!strasse) {
    issues.push({
      messageKey: "newCustomerRequiredStrasse",
      messageFallback: "Please enter a street for the main address.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.strasse,
      preFocus: "mainAdresse",
    });
  }

  const plz = (main?.plz ?? "").trim();
  if (!plz) {
    issues.push({
      messageKey: "newCustomerRequiredPlz",
      messageFallback: "Please enter a postal code for the main address.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.plz,
      preFocus: "mainAdresse",
    });
  }

  const ort = (main?.ort ?? "").trim();
  if (!ort) {
    issues.push({
      messageKey: "newCustomerRequiredOrt",
      messageFallback: "Please enter a city for the main address.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.ort,
      preFocus: "mainAdresse",
    });
  }

  const land = (main?.land_code ?? "").trim();
  if (!land) {
    issues.push({
      messageKey: "newCustomerRequiredLand",
      messageFallback: "Please select a country for the main address.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.land,
      preFocus: "mainAdresse",
    });
  }

  const contactName = (k0?.name ?? "").trim();
  if (!contactName) {
    issues.push({
      messageKey: "newCustomerRequiredContactName",
      messageFallback: "Please enter the primary contact name.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.kontaktName,
      preFocus: "primaryKontakt",
    });
  }

  const phoneDigits = normalizePhoneValue(k0?.telefon ?? "");
  if (!phoneDigits) {
    issues.push({
      messageKey: "newCustomerRequiredContactPhone",
      messageFallback: "Please enter a phone number for the primary contact.",
      fieldId: NEW_CUSTOMER_KUNDE_FOCUS.kontaktTelefon,
      preFocus: "primaryKontakt",
    });
  }

  return issues;
}
