import { describe, expect, it } from "vitest";

import { initialForm } from "../mappers/customerFormMapper";
import { validateCustomerCompanyNameRequired } from "./customerValidation";

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
});
