import { describe, expect, it } from "vitest";

import {
  computeCustomerProfileCompletionPct,
  formToPayload,
  initialForm,
  splitStoredPhone,
} from "./customerFormMapper";

describe("customerFormMapper", () => {
  it("splits stored phone numbers by known country code", () => {
    expect(splitStoredPhone("+49 40123456")).toEqual({ code: "+49", number: "40123456" });
    expect(splitStoredPhone("+33 5551234")).toEqual({ code: "+33", number: "5551234" });
    expect(splitStoredPhone("040-123")).toEqual({ code: "+49", number: "040-123" });
    expect(splitStoredPhone("")).toEqual({ code: "+49", number: "" });
  });

  it("maps and normalizes form data into a customer payload", () => {
    const form = initialForm();
    form.firmenname = "  ACME Wash GmbH  ";
    form.customer_type = "legal_entity";
    form.customer_status = "active";
    form.fzgHandel = "ja";
    form.zustaendige_person_name = "nicht zugeordnet";
    form.internet_adr = " https://acme.example ";

    form.adressen[0] = {
      ...form.adressen[0],
      strasse: " Hauptstrasse 10 ",
      plz: " 20095 ",
      ort: " Hamburg ",
      land_code: "de",
      art_land_code: "IL",
      ust_id_nr: " DE123456789 ",
      steuer_nr: " 123/456/789 ",
      branchen_nr: " BR-42 ",
    };
    form.kontakte[0] = {
      ...form.kontakte[0],
      name: " Max Muster ",
      rolle: " Einkauf ",
      telefonCode: "+49",
      telefon: " 40123456 ",
      handyCode: "+49",
      handy: " 179000 ",
      email: " max@example.com ",
      bemerkung: " primary contact ",
    };

    const payload = formToPayload(form);

    expect(payload.firmenname).toBe("ACME Wash GmbH");
    expect(payload.customer_type).toBe("legal_entity");
    expect(payload.fzg_haendler).toBe(true);
    expect(payload.zustaendige_person_name).toBeUndefined();
    expect(payload.ansprechpartner).toBe("Max Muster");
    expect(payload.telefonnummer).toBe("+49 40123456");
    expect(payload.faxnummer).toBe("+49 179000");
    expect(payload.internet_adr).toBe("https://acme.example");
    expect(payload.land_code).toBe("DE");
    expect(payload.ust_id_nr).toBe("DE123456789");
    expect(payload.steuer_nr).toBe("123/456/789");
    expect(payload.tax_country_type_code).toBeUndefined();
    expect(payload.branchen_nr).toBeUndefined();
    expect(payload.adressen?.[0]?.branchen_nr).toBe("BR-42");
  });

  it("computes profile completion from high-value fields", () => {
    const blank = initialForm();
    expect(computeCustomerProfileCompletionPct(blank)).toBe(13);

    const filled = initialForm();
    filled.firmenname = "ACME";
    filled.customer_type = "legal_entity";
    filled.adressen[0].strasse = "Main 1";
    filled.adressen[0].plz = "20095";
    filled.adressen[0].ort = "Hamburg";
    filled.adressen[0].land_code = "DE";
    filled.adressen[0].ust_id_nr = "DE123";
    filled.kontakte[0].email = "ops@acme.example";

    expect(computeCustomerProfileCompletionPct(filled)).toBe(100);
  });
});
