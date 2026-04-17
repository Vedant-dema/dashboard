import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlarmClock, Phone, UserRound, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { localeTagForLanguage, useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import {
  loadTimetableDb,
  subscribeTimetableDbChange,
  timetableRowIsMine,
  viewerBuyerCodeFromSessionName,
} from '../store/timetableStore';
import { parseTimetableFollowUpDueMs } from '../pages/timetable/timetableReminderNotify';
import { timetableHashOpenContact } from '../pages/timetable/timetableContactDeepLink';
import type { TimetableEntry } from '../types/timetable';

const REFRESH_MS = 60_000;
/** Show follow-ups due in the next N hours in the “soon” group (matches max quick reminder horizon). */
const UPCOMING_HOURS = 24;
const DISMISSED_SS_KEY = 'dema-dashboard-tt-followup-dismissed-v1';

function readDismissedKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_SS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === 'string'));
  } catch {
    return new Set();
  }
}

function persistDismissedKeys(keys: Set<string>): void {
  try {
    sessionStorage.setItem(DISMISSED_SS_KEY, JSON.stringify([...keys].slice(-200)));
  } catch {
    // private mode / quota
  }
}

function formatWhen(iso: string, localeTag: string): string {
  const ms = parseTimetableFollowUpDueMs(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleString(localeTag, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isPlaceholderPhone(phone: string | undefined | null): boolean {
  const p = (phone ?? '').trim();
  return !p || p === '\u2014' || p === '-' || p === '\u2013';
}

export function TimetableDashboardReminders() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const localeTag = localeTagForLanguage(language as LanguageCode);
  const viewerCode = useMemo(() => viewerBuyerCodeFromSessionName(user?.name), [user?.name]);

  const [overdue, setOverdue] = useState<TimetableEntry[]>([]);
  const [upcoming, setUpcoming] = useState<TimetableEntry[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(() => readDismissedKeys());

  const refresh = useCallback(() => {
    const db = loadTimetableDb();
    const now = Date.now();
    const horizon = now + UPCOMING_HOURS * 60 * 60 * 1000;
    const mine = db.entries.filter((e) => timetableRowIsMine(e, viewerCode));

    const o: TimetableEntry[] = [];
    const u: TimetableEntry[] = [];

    for (const row of mine) {
      if (!row.follow_up_at || row.is_completed) continue;
      const slotKey = `${row.id}|${row.follow_up_at}`;
      if (dismissedKeys.has(slotKey)) continue;
      const due = parseTimetableFollowUpDueMs(row.follow_up_at);
      if (Number.isNaN(due)) continue;
      if (due <= now) o.push(row);
      else if (due <= horizon) u.push(row);
    }

    const byDue = (a: TimetableEntry, b: TimetableEntry) =>
      parseTimetableFollowUpDueMs(a.follow_up_at!) - parseTimetableFollowUpDueMs(b.follow_up_at!);
    o.sort(byDue);
    u.sort(byDue);
    setOverdue(o);
    setUpcoming(u);
  }, [viewerCode, dismissedKeys]);

  useEffect(() => {
    refresh();
    const unsubscribeTimetable = subscribeTimetableDbChange(refresh);
    const id = window.setInterval(refresh, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      unsubscribeTimetable();
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  const dismissRow = useCallback((row: TimetableEntry) => {
    if (!row.follow_up_at) return;
    const slotKey = `${row.id}|${row.follow_up_at}`;
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(slotKey);
      persistDismissedKeys(next);
      return next;
    });
  }, []);

  const total = overdue.length + upcoming.length;

  if (total === 0) return null;

  return (
    <section
      className="dema-paper-surface mb-6 overflow-hidden rounded-2xl border p-4 ring-1 ring-amber-300/50"
      aria-label={t('dashboardFollowUpTitle', 'Purchase follow-ups')}
    >
      <div className="mb-3 flex min-w-0 items-start gap-3">
        <span className="dema-paper-surface-icon mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1">
          <AlarmClock className="h-5 w-5" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="dema-paper-surface-title text-sm font-bold">
            {t('dashboardFollowUpTitle', 'Purchase follow-ups')}
          </h2>
          <p className="dema-paper-surface-muted mt-0.5 text-xs leading-snug">
            {t(
              'dashboardFollowUpHint',
              'From your purchase timetable — due now or within the next few hours.'
            )}
          </p>
        </div>
      </div>
      <ul className="dema-paper-surface-list divide-y divide-amber-100/90 rounded-xl border ring-1 ring-amber-100/80">
        {[...overdue, ...upcoming].map((row) => {
          const dueMs = parseTimetableFollowUpDueMs(row.follow_up_at!);
          const isLate = dueMs <= Date.now();
          return (
            <li
              key={`${row.id}-${row.follow_up_at}`}
              className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                      isLate ? 'dema-paper-surface-badge-due' : 'dema-paper-surface-badge-soon'
                    }`}
                  >
                    {isLate
                      ? t('dashboardFollowUpBadgeDue', 'Due')
                      : t('dashboardFollowUpBadgeSoon', 'Soon')}
                  </span>
                  <span className="dema-paper-surface-title truncate font-semibold">
                    {row.company_name}
                  </span>
                </div>
                <p className="dema-paper-surface-muted mt-1 text-xs">
                  {formatWhen(row.follow_up_at!, localeTag)}
                  {row.contact_name ? (
                    <span className="dema-paper-surface-subtle">
                      {' · '}
                      {row.contact_name}
                    </span>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = timetableHashOpenContact(row.id);
                  }}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  <UserRound className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  {t('timetableFollowUpGoToCustomer', 'Go to customer')}
                </button>
                {!isPlaceholderPhone(row.phone) ? (
                  <a
                    href={`tel:${row.phone.replace(/\s/g, '')}`}
                    className="dema-paper-surface-call inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition"
                  >
                    <Phone className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    {t('dashboardFollowUpCall', 'Call')}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => dismissRow(row)}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300/90 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label={t(
                    'dashboardFollowUpDismissRowAria',
                    'Hide from dashboard list (this session only)'
                  )}
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
