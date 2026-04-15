import type { TimetableEntry } from '../../types/timetable';

const NOTIFIED_SS_KEY = 'dema-tt-followup-notified-v1';
/** Do not surface desktop alerts for follow-ups that became due more than this many ms ago (avoids stale spam on reopen). */
const MAX_LATE_MS = 6 * 60 * 60 * 1000;
/** In-app banner: still show missed follow-ups up to this age after reopen (desktop stays stricter). */
const MAX_IN_APP_LATE_MS = 48 * 60 * 60 * 1000;

function slotNotifiedKey(rowId: number, followUpIso: string): string {
  return `${rowId}|${followUpIso}`;
}

function readNotifiedKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_SS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function persistNotifiedKeys(keys: Set<string>): void {
  try {
    sessionStorage.setItem(NOTIFIED_SS_KEY, JSON.stringify([...keys].slice(-400)));
  } catch {
    // private mode / quota
  }
}

/**
 * Parse `follow_up_at` stored as local wall time (`YYYY-MM-DDTHH:mm:ss`).
 * Avoids relying on `Date.parse` for offset-less strings (implementation varies).
 */
export function parseTimetableFollowUpDueMs(raw: string): number {
  const iso = raw.trim();
  const m = iso.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i
  );
  if (!m) return Date.parse(iso);
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)) return Date.parse(iso);
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = m[6] ? Number(m[6]) : 0;
  return new Date(y, mo, d, h, mi, s).getTime();
}

export type ProcessDueTimetableFollowUpRemindersOptions = {
  /** Shown even when browser notifications are off or denied (dedupe shared with desktop). */
  onInAppDue?: (row: TimetableEntry, title: string, body: string) => void;
};

/** No-op: legacy hook for older call sites; delivery uses polling. */
export function cancelTimetableRowDesktopReminder(_rowId: number): void {}

/** No-op: legacy hook; delivery uses {@link processDueTimetableFollowUpReminders}. */
export function scheduleTimetableDesktopReminder(
  _rowId: number,
  _whenIso: string,
  _title: string,
  _body: string
): void {}

/**
 * Poll-driven: at most one alert per (row id, follow_up_at) when due.
 * Desktop notification only if permission is granted; in-app callback runs regardless.
 */
export function processDueTimetableFollowUpReminders(
  entries: TimetableEntry[],
  t: (key: string, fallback: string) => string,
  options?: ProcessDueTimetableFollowUpRemindersOptions
): void {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  const keys = readNotifiedKeys();
  let dirty = false;
  const onInApp = options?.onInAppDue;
  const notifApi = typeof Notification !== 'undefined' ? Notification : undefined;

  for (const row of entries) {
    if (!row.follow_up_at) continue;
    if (row.is_completed) continue;

    const due = parseTimetableFollowUpDueMs(row.follow_up_at);
    if (Number.isNaN(due)) continue;
    if (now < due) continue;
    if (now - due > MAX_IN_APP_LATE_MS) continue;

    const k = slotNotifiedKey(row.id, row.follow_up_at);
    if (keys.has(k)) continue;

    const title = t('timetableNotifReminderTitle', 'Callback reminder');
    const body = t('timetableNotifReminderBody', '{company} — time to call back.').replace(
      '{company}',
      row.company_name
    );

    let delivered = false;

    const desktopAllowed = now - due <= MAX_LATE_MS;
    if (desktopAllowed && notifApi && notifApi.permission === 'granted') {
      try {
        new notifApi(title, {
          body,
          tag: `dema-tt-due-${row.id}`,
        });
        delivered = true;
      } catch {
        // unsupported options / blocked
      }
    }

    if (onInApp) {
      onInApp(row, title, body);
      delivered = true;
    } else if (delivered) {
      // desktop-only path already set delivered
    }

    if (delivered) {
      keys.add(k);
      dirty = true;
    }
  }

  if (dirty) persistNotifiedKeys(keys);
}

export type TimetableNotificationReadiness = 'granted' | 'denied' | 'default' | 'unsupported';

/** Current browser notification permission for follow-up desktop alerts (sync). */
export function getTimetableNotificationReadiness(): TimetableNotificationReadiness {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return 'unsupported';
  const p = Notification.permission;
  if (p === 'granted') return 'granted';
  if (p === 'denied') return 'denied';
  return 'default';
}

export async function ensureTimetableNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}
