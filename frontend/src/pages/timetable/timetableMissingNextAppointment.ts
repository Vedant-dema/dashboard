import type { TimetableEntry } from '../../types/timetable';
import { timetableRowIsMine } from '../../store/timetableStore';
import { parseTimetableFollowUpDueMs } from './timetableReminderNotify';

/** Why the row surfaced — used for badge copy and ordering. */
export type TimetableMissingNextApptSignal = 'recent_call' | 'slot_passed';

const MS_RECENT_CALL = 14 * 24 * 60 * 60 * 1000;

export function localIsoDateFromMs(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isoDateMinusDays(iso: string, days: number): string {
  const base = new Date(`${iso}T12:00:00`);
  base.setDate(base.getDate() - days);
  return localIsoDateFromMs(base.getTime());
}

export function normalizeIsoDateFromScheduled(scheduledAt: string): string {
  const raw = scheduledAt.trim();
  return raw.length >= 10 ? raw.slice(0, 10) : localIsoDateFromMs(Date.now());
}

function hasBookedFollowUp(row: TimetableEntry): boolean {
  return Boolean(row.follow_up_at && row.follow_up_at.trim().length > 0);
}

function isActiveCustomerRow(row: TimetableEntry): boolean {
  return row.contact_profile?.overview_kunde?.customer_status === 'active';
}

/**
 * Purchase hygiene: active Stammdaten, but no `follow_up_at`, with a recent touchpoint
 * or a timetable slot in the rolling window that already ended (excluding “has trucks”
 * rows that were never re-contacted — reduces false positives on closed loops).
 */
export function timetableEntryMissingNextAppointmentSignal(
  row: TimetableEntry,
  nowMs: number
): TimetableMissingNextApptSignal | null {
  if (row.is_completed || row.is_parked) return null;
  if (!isActiveCustomerRow(row)) return null;
  if (hasBookedFollowUp(row)) return null;

  const todayIso = localIsoDateFromMs(nowMs);
  const weekStartIso = isoDateMinusDays(todayIso, 7);

  const lastRaw = row.last_called_at?.trim();
  const lastMs = lastRaw ? parseTimetableFollowUpDueMs(lastRaw) : Number.NaN;
  const recentCall =
    !Number.isNaN(lastMs) && lastMs <= nowMs && nowMs - lastMs <= MS_RECENT_CALL;

  const slotMs = parseTimetableFollowUpDueMs(row.scheduled_at);
  const slotPassed = !Number.isNaN(slotMs) && slotMs <= nowMs;
  const rowDay = normalizeIsoDateFromScheduled(row.scheduled_at);
  const slotInRollingWeek = rowDay >= weekStartIso && rowDay <= todayIso;

  const trucksOnlyClosedLoop = row.outcome === 'has_trucks' && !recentCall;

  if (recentCall) return 'recent_call';
  if (slotPassed && slotInRollingWeek && !trucksOnlyClosedLoop) return 'slot_passed';
  return null;
}

export function selectTimetableMissingNextAppointmentRows(
  entries: TimetableEntry[],
  viewerCode: string,
  nowMs: number = Date.now()
): Array<{ row: TimetableEntry; signal: TimetableMissingNextApptSignal }> {
  const out: Array<{ row: TimetableEntry; signal: TimetableMissingNextApptSignal }> = [];
  for (const row of entries) {
    if (!timetableRowIsMine(row, viewerCode)) continue;
    const signal = timetableEntryMissingNextAppointmentSignal(row, nowMs);
    if (signal) out.push({ row, signal });
  }
  const rank: Record<TimetableMissingNextApptSignal, number> = { recent_call: 0, slot_passed: 1 };
  out.sort((a, b) => {
    const dr = rank[a.signal] - rank[b.signal];
    if (dr !== 0) return dr;
    return a.row.company_name.localeCompare(b.row.company_name, undefined, { sensitivity: 'base' });
  });
  return out;
}
