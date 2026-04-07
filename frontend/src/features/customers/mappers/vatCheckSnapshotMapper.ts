import type { ViesCustomerSnapshot } from "../../../types/kunden";
import type { VatCheckResponseDto } from "../types/customerApiDto";
import { coerceViesCheckValid } from "./vatCheckCoercion";

export function viesResultToSnapshot(r: VatCheckResponseDto): ViesCustomerSnapshot {
  return {
    valid: r.valid,
    country_code: r.country_code,
    vat_number: r.vat_number,
    name: r.name ?? null,
    address: r.address ?? null,
    request_date: r.request_date ?? null,
    request_identifier: r.request_identifier ?? null,
    trader_details_available: r.trader_details_available,
    trader_name_match: r.trader_name_match ?? null,
    trader_street_match: r.trader_street_match ?? null,
    trader_postal_code_match: r.trader_postal_code_match ?? null,
    trader_city_match: r.trader_city_match ?? null,
    trader_company_type_match: r.trader_company_type_match ?? null,
    saved_at: new Date().toISOString(),
  };
}

export function snapshotToViesCheckResult(s: ViesCustomerSnapshot): VatCheckResponseDto {
  return {
    valid: coerceViesCheckValid(s.valid),
    country_code: s.country_code,
    vat_number: s.vat_number,
    name: s.name,
    address: s.address,
    request_date: s.request_date,
    request_identifier: s.request_identifier,
    trader_details_available: s.trader_details_available,
    trader_name_match: s.trader_name_match,
    trader_street_match: s.trader_street_match,
    trader_postal_code_match: s.trader_postal_code_match,
    trader_city_match: s.trader_city_match,
    trader_company_type_match: s.trader_company_type_match,
  };
}
