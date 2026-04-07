import type { KundenStamm, KundenWashStamm } from "../../../types/kunden";
import {
  BOOLEAN_KUNDEN_HISTORY_FIELDS,
  BOOLEAN_WASH_HISTORY_FIELDS,
} from "../../../store/kundenStore";

export function formatHistoryValueDisplay(
  field: string,
  raw: string,
  t: (key: string, fallback: string) => string
): string {
  if (!raw) return raw;
  if (field === "acquisition_source") {
    if (raw === "referral") return t("newCustomerAcquisitionReferral", "Referral");
    if (raw === "website") return t("newCustomerAcquisitionWebsite", "Website");
    if (raw === "email") return t("newCustomerAcquisitionEmail", "Email");
    if (raw === "call") return t("newCustomerAcquisitionCall", "Call");
    return raw;
  }
  if (field === "customer_type") {
    if (raw === "legal_entity") return t("newCustomerCustomerTypeLegal", "Legal entity");
    if (raw === "natural_person") return t("newCustomerCustomerTypeNatural", "Natural person");
    return raw;
  }
  if (field === "status") {
    if (raw === "active") return t("newCustomerStatusActive", "Active");
    if (raw === "inactive") return t("newCustomerStatusInactive", "Inactive");
    if (raw === "blocked") return t("newCustomerStatusBlocked", "Blocked");
    return raw;
  }
  if (field === "lifecycle_stage") {
    if (raw === "lead") return "Lead";
    if (raw === "qualified") return "Qualified";
    if (raw === "active") return "Active";
    if (raw === "inactive") return "Inactive";
    if (raw === "vip") return "VIP";
    if (raw === "lost") return "Lost";
    return raw;
  }
  if (field === "preferred_channel") {
    if (raw === "email") return "Email";
    if (raw === "phone") return "Phone";
    if (raw === "sms") return "SMS";
    if (raw === "whatsapp") return "WhatsApp";
    if (raw === "mixed") return "Mixed";
    if (raw === "none") return "None";
    return raw;
  }
  if (field === "customer_role") {
    if (raw === "supplier") return "Supplier";
    if (raw === "buyer") return "Buyer";
    if (raw === "workshop") return "Workshop";
    if (raw === "wash") return "Wash";
    return raw;
  }
  if (raw === "true" || raw === "false") {
    const washKey = field.startsWith("wash_") ? field.slice(5) : null;
    if (washKey && BOOLEAN_WASH_HISTORY_FIELDS.has(washKey as keyof KundenWashStamm)) {
      return raw === "true" ? t("historyBoolYes", "Yes") : t("historyBoolNo", "No");
    }
    if (!washKey && BOOLEAN_KUNDEN_HISTORY_FIELDS.has(field as keyof KundenStamm)) {
      return raw === "true" ? t("historyBoolYes", "Yes") : t("historyBoolNo", "No");
    }
  }
  return raw;
}
