/**
 * Normalized client-side shape for VAT check responses (POST /api/v1/vat/check).
 * Mirrors the previous inline `ViesCheckResult` in the customer modal.
 */
export type VatCheckResponseDto = {
  valid: boolean;
  country_code: string;
  vat_number: string;
  name: string | null;
  address: string | null;
  request_date?: string | null;
  request_identifier?: string | null;
  trader_details_available?: boolean;
  vies_raw?: Record<string, unknown> | null;
  trader_name_match?: string | null;
  trader_street_match?: string | null;
  trader_postal_code_match?: string | null;
  trader_city_match?: string | null;
  trader_company_type_match?: string | null;
};
