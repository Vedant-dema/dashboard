# Customer domain glossary

German UI labels and domain terms mapped to **meaning** and **stable JSON / field names** where applicable. This list is not exhaustive; see types in `frontend/src/types/kunden.ts` and API DTOs in `frontend/src/features/customers/types/` for full shapes.

| Term / label | Meaning | Typical field / API |
|--------------|---------|---------------------|
| **Kunde / Kunden** | Customer (master record) | `KundenStamm`, list items use `kunden_nr`, `firmenname`, … |
| **KundenNr. / kunden_nr** | Customer number (business id) | `kunden_nr` (string in many payloads) |
| **Firmenname** | Company / display name | `firmenname` |
| **USt-IdNr. / VAT** | EU VAT identification | Validated via VIES; `uid` / country-specific fields on record |
| **VIES** | EU Commission VAT Information Exchange System | `/api/v1/vat/check`, `/api/v1/vat/status`, … |
| **Waschanlage** | Car wash department context | Extra tabs/fields (wash programme, fleet, bank/SEPA); wash profile API |
| **Branche** | Industry segment (e.g. KFZ) | `branche` |
| **Adresse** | Address line / address block | `adressen[]`, `strasse`, `plz`, `ort`, `land_code` |
| **Land** | Country | `land_code`, related `art_land_code` where used |
| **Risikoanalyse / Unterlagen** | Risk / compliance document dates | `KundenRisikoanalyse`; **only** `ausw_gueltig_bis` drives expiry alerts in UI |
| **Ausweis gültig bis** | ID document expiry date | `ausw_gueltig_bis` |
| **Ausweis Inhaber** (owner name) | Optional holder name on ID row | `ausw_gueltig_bis_owner_name` |
| **Beziehung** | Link to another customer | `beziehungen`, `KundenBeziehung` |
| **Termin** | Appointment on customer | `termine`, `KundenTermin` |
| **Unterlage / Dokument** | Attached file metadata | Stored in customer blob / documents array in local mode; storage-backed flows see architecture docs |
| **Art / Buchungskonto** | Customer type and booking account | `art_kunde`, `buchungskonto_haupt` |
| **Demo / shared DB** | Transitional multi-user JSON state | `GET/PUT /api/v1/demo/customers-db` |
| **History** | Audit timeline of field changes | `GET /api/v1/customers/{id}/history` |

### Deprecated / cleared-on-save (still in legacy data)

| Field | Note |
|-------|------|
| `branchen_nr` | Industry reg. no. — removed from UI; cleared on next save |
| `tax_country_type_code` | Removed from UI; cleared on next save |

### Internal codes (errors)

| Code | Meaning |
|------|---------|
| `customers_db_conflict` | Stale `expected_updated_at` on demo shared PUT |
| `vat_check_deadline_exceeded` | VAT check hard timeout (504) |
| `vat_check_internal_error` | VAT check unexpected failure (503) |

See [contracts.md](contracts.md) for HTTP status mapping.
