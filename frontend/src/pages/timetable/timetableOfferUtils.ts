import type { TimetableTruckOffer } from "../../types/timetable";

export function newTruckOfferId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `o-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** True if any persisted offer slot has user-entered content. */
export function offerHasContent(o: TimetableTruckOffer | null | undefined): boolean {
  if (!o) return false;
  if (o.vehicle_type.trim()) return true;
  if (o.brand.trim()) return true;
  if (o.model.trim()) return true;
  if (o.location.trim()) return true;
  if (o.notes.trim()) return true;
  if (o.year != null) return true;
  if (o.mileage_km != null) return true;
  if (o.quantity != null) return true;
  if (o.expected_price_eur != null) return true;
  if (o.purchase_bid_eur != null) return true;
  if ((o.negotiation_rounds ?? []).length > 0) return true;
  if ((o.vehicle_unterlagen ?? []).length > 0) return true;
  return false;
}
