/** Hash query param to open the purchase timetable contact drawer for one row. */
export const TT_HASH_ENTRY_PARAM = 'ttEntry';

/** Navigate to purchase calendar and open the contact workspace for this timetable row. */
export function timetableHashOpenContact(entryId: number): string {
  return `#/purchase/kalender?${TT_HASH_ENTRY_PARAM}=${encodeURIComponent(String(entryId))}`;
}

export function parseTimetableEntryIdFromLocationHash(): number | null {
  const h = window.location.hash;
  const qm = h.indexOf('?');
  if (qm < 0) return null;
  const params = new URLSearchParams(h.slice(qm + 1));
  const raw = params.get(TT_HASH_ENTRY_PARAM);
  if (!raw) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

/** Remove `?ttEntry=…` from the hash so refresh does not re-open the drawer. */
export function stripTimetableEntryFromLocationHash(): void {
  const h = window.location.hash;
  const qm = h.indexOf('?');
  if (qm < 0) return;
  const path = h.slice(0, qm);
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${path}`);
}
