/** Flags for purchase vs third-party sale (Angebote + timetable offers). */
export type OfferStockFlags = { gekauft?: boolean; verkauft?: boolean };

/** Same semantics as NewAngebotModal stock ledger (purchase vs third-party disposal). */
export type AngebotLedgerKind = "purchase" | "disposal" | "neutral" | "conflict";

export function angebotLedgerKind(a: OfferStockFlags): AngebotLedgerKind {
  const g = a.gekauft === true;
  const v = a.verkauft === true;
  if (g && v) return "conflict";
  if (g && !v) return "purchase";
  if (!g && v) return "disposal";
  return "neutral";
}
