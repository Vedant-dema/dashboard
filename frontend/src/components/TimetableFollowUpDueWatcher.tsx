import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlarmClock, UserRound, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  loadTimetableDb,
  subscribeTimetableDbChange,
  timetableRowIsMine,
  viewerBuyerCodeFromSessionName,
} from '../store/timetableStore';
import {
  parseTimetableFollowUpDueMs,
  processDueTimetableFollowUpReminders,
} from '../pages/timetable/timetableReminderNotify';
import { timetableHashOpenContact } from '../pages/timetable/timetableContactDeepLink';
import type { TimetableEntry } from '../types/timetable';

/** Fallback refresh only; normal delivery is event-driven and scheduled for the next due time. */
const MAX_REFRESH_MS = 5 * 60 * 1000;
const MIN_TIMER_MS = 750;

type InAppAlert = {
  key: string;
  title: string;
  body: string;
  entryId: number;
};

function FollowUpAlertCard({
  item,
  onDismissKey,
}: {
  item: InAppAlert;
  onDismissKey: (key: string) => void;
}) {
  const { t } = useLanguage();

  const goToCustomer = () => {
    window.location.hash = timetableHashOpenContact(item.entryId);
  };

  return (
    <div
      role="status"
      className="dema-paper-surface pointer-events-auto flex gap-3 rounded-2xl border p-4 ring-1 ring-amber-300/50"
    >
      <span className="dema-paper-surface-icon mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1">
        <AlarmClock className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="dema-paper-surface-title text-sm font-bold">{item.title}</p>
        <p className="dema-paper-surface-body mt-1 text-sm leading-snug">{item.body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToCustomer}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            <UserRound className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('timetableFollowUpGoToCustomer', 'Go to customer')}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDismissKey(item.key)}
        className="dema-paper-surface-close inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition"
        aria-label={t('commonClose', 'Close')}
      >
        <X className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/**
 * Polls `localStorage` about once per second while the tab is open and surfaces due follow-ups
 * (in-app toasts until dismissed; optional desktop notifications). Uses the same buyer filter as
 * the dashboard follow-up list (`timetableRowIsMine`), not every stored row — avoids alerts for other buyers.
 */
export function TimetableFollowUpDueWatcher() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const viewerCode = useMemo(() => viewerBuyerCodeFromSessionName(user?.name), [user?.name]);
  const tRef = useRef(t);
  tRef.current = t;

  const [alerts, setAlerts] = useState<InAppAlert[]>([]);

  const dismiss = useCallback((key: string) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key));
  }, []);

  useEffect(() => {
    setAlerts([]);

    let disposed = false;
    let timeoutId: number | undefined;

    const clearTimer = () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        timeoutId = undefined;
      }
    };

    const scheduleNextRun = (entries: TimetableEntry[]) => {
      const now = Date.now();
      let nextDue: number | null = null;
      for (const row of entries) {
        if (!row.follow_up_at || row.is_completed) continue;
        const due = parseTimetableFollowUpDueMs(row.follow_up_at);
        if (Number.isNaN(due) || due <= now) continue;
        nextDue = nextDue == null ? due : Math.min(nextDue, due);
      }
      const wait =
        nextDue == null
          ? MAX_REFRESH_MS
          : Math.min(MAX_REFRESH_MS, Math.max(MIN_TIMER_MS, nextDue - now + 250));
      timeoutId = window.setTimeout(run, wait);
    };

    function run() {
      if (disposed) return;
      clearTimer();
      try {
        const db = loadTimetableDb();
        const mine = db.entries.filter((e) => timetableRowIsMine(e, viewerCode));
        processDueTimetableFollowUpReminders(
          mine,
          (key, fb) => tRef.current(key, fb),
          {
            onInAppDue: (row: TimetableEntry, title: string, body: string) => {
              if (!row.follow_up_at) return;
              const key = `${row.id}|${row.follow_up_at}`;
              setAlerts((prev) => {
                if (prev.some((p) => p.key === key)) return prev;
                return [...prev, { key, title, body, entryId: row.id }];
              });
            },
          }
        );
        scheduleNextRun(mine);
      } catch {
        timeoutId = window.setTimeout(run, MAX_REFRESH_MS);
      }
    }

    run();
    const unsubscribeTimetable = subscribeTimetableDbChange(run);
    const onVis = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      disposed = true;
      clearTimer();
      unsubscribeTimetable();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [viewerCode]);

  if (alerts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 top-20 z-[240] flex flex-col items-stretch gap-3 md:left-auto md:right-6 md:top-24 md:w-[min(100%,24rem)]"
      aria-live="polite"
    >
      {alerts.map((item) => (
        <FollowUpAlertCard key={item.key} item={item} onDismissKey={dismiss} />
      ))}
    </div>
  );
}
