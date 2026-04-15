import { describe, expect, it } from "vitest";

import { initialForm } from "../mappers/customerFormMapper";
import {
  collectNewCustomerKundeRequiredIssues,
  validateCustomerCompanyNameRequired,
} from "./customerValidation";

function fillValidKundeBaseline(form: ReturnType<typeof initialForm>) {
  form.customer_type = "legal_entity";
  form.branche = "Logistics";
  form.fzgHandel = "nein";
  form.gesellschaftsform = "GmbH";
  form.firmenname = "ACME GmbH";
  form.adressen[0]!.strasse = "Hauptstr. 1";
  form.adressen[0]!.plz = "10115";
  form.adressen[0]!.ort = "Berlin";
  form.adressen[0]!.land_code = "DE";
  form.kontakte[0]!.name = "Jane Doe";
  form.kontakte[0]!.telefon = "030 1234567";
}

describe("customerValidation", () => {
  it("fails when company name is missing", () => {
    const form = initialForm();
    form.firmenname = "   ";

    expect(validateCustomerCompanyNameRequired(form)).toEqual({
      ok: false,
      messageKey: "newCustomerRequiredFirmenname",
      messageFallback: "Please enter a company name.",
    });
  });

  it("passes when company name exists", () => {
    const form = initialForm();
    form.firmenname = "ACME GmbH";

    expect(validateCustomerCompanyNameRequired(form)).toEqual({ ok: true });
  });

  it("collectNewCustomerKundeRequiredIssues returns ordered issues for an empty form", () => {
    const form = initialForm();
    const issues = collectNewCustomerKundeRequiredIssues(form);
    expect(issues.length).toBeGreaterThanOrEqual(5);
    expect(issues[0]?.messageKey).toBe("newCustomerRequiredCustomerType");
  });

  it("collectNewCustomerKundeRequiredIssues passes when baseline is complete", () => {
    const form = initialForm();
    fillValidKundeBaseline(form);
    expect(collectNewCustomerKundeRequiredIssues(form)).toEqual([]);
  });

  it("requires primary contact phone", () => {
    const form = initialForm();
    fillValidKundeBaseline(form);
    form.kontakte[0]!.telefon = "  ";
    const issues = collectNewCustomerKundeRequiredIssues(form);
    expect(issues.some((i) => i.messageKey === "newCustomerRequiredContactPhone")).toBe(true);
  });
});
