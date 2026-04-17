import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Phone, UserRound, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { localeTagForLanguage, useLanguage, type LanguageCode } from '../contexts/LanguageContext';
import {
  loadTimetableDb,
  viewerBuyerCodeFromSessionName,
} from '../store/timetableStore';
import { parseTimetableFollowUpDueMs } from '../pages/timetable/timetableReminderNotify';
import { timetableHashOpenContact } from '../pages/timetable/timetableContactDeepLink';
import {
  selectTimetableMissingNextAppointmentRows,
  type TimetableMissingNextApptSignal,
} from '../pages/timetable/timetableMissingNextAppointment';

const POLL_MS = 5000;
const DISMISSED_SS_KEY = 'dema-dashboard-tt-missing-next-appt-dismissed-v1';

function readDismissedIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_SS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)));
  } catch {
    return new Set();
  }
}

function persistDismissedIds(ids: Set<number>): void {
  try {
    sessionStorage.setItem(DISMISSED_SS_KEY, JSON.stringify([...ids].slice(-200)));
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

function metaLine(
  row: { last_called_at: string | null; scheduled_at: string },
  signal: TimetableMissingNextApptSignal,
  localeTag: string,
  t: (k: string, fb: string) => string
): string {
  if (signal === 'recent_call' && row.last_called_at?.trim()) {
    return t('dashboardNextApptMetaRecentCall', 'Last call: {when}').replace(
      '{when}',
      formatWhen(row.last_called_at, localeTag)
    );
  }
  return t('dashboardNextApptMetaSlotEnded', 'Planned slot: {when}').replace(
    '{when}',
    formatWhen(row.scheduled_at, localeTag)
  );
}

export function TimetableDashboardMissingNextAppointment() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const localeTag = localeTagForLanguage(language as LanguageCode);
  const viewerCode = useMemo(() => viewerBuyerCodeFromSessionName(user?.name), [user?.name]);

  const [items, setItems] = useState(() =>
    selectTimetableMissingNextAppointmentRows(loadTimetableDb().entries, viewerCode)
  );
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(() => readDismissedIds());

  const refresh = useCallback(() => {
    const db = loadTimetableDb();
    setItems(selectTimetableMissingNextAppointmentRows(db.entries, viewerCode));
  }, [viewerCode]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refresh]);

  const visible = useMemo(
    () => items.filter(({ row }) => !dismissedIds.has(row.id)),
    [items, dismissedIds]
  );

  const dismissRow = useCallback((rowId: number) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(rowId);
      persistDismissedIds(next);
      return next;
    });
  }, []);

  const total = visible.length;

  return (
    <section
      className="dema-paper-surface mb-6 overflow-hidden rounded-2xl border border-slate-200/90 p-4 ring-1 ring-indigo-200/60"
      aria-label={t('dashboardNextApptTitle', 'Active customers — book the next slot')}
    >
      <div className="mb-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="dema-paper-surface-icon mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 ring-1 ring-indigo-100">
            <CalendarClock className="h-5 w-5 text-indigo-700" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="dema-paper-surface-title text-sm font-bold md:text-base">
                {t('dashboardNextApptTitle', 'Active customers — book the next slot')}
              </h2>
              {total > 0 ? (
                <span className="inline-flex min-h-6 shrink-0 items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {total}
                </span>
              ) : null}
            </div>
            <p className="dema-paper-surface-muted mt-1 text-xs leading-snug md:text-sm">
              {t(
                'dashboardNextApptSubtitle',
                'Smart check: status Active, no follow-up date/time saved, and a recent call or a timetable slot that already ended (rolling 7 days). Open the drawer and book the next touchpoint.'
              )}
            </p>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <p className="dema-paper-surface-muted rounded-xl border border-dashed border-slate-200/90 bg-slate-50/80 px-3 py-3 text-xs md:text-sm">
          {t(
            'dashboardNextApptEmpty',
            'No gaps detected — active customers either have a follow-up scheduled or no row matched the rules.'
          )}
        </p>
      ) : (
        <ul className="dema-paper-surface-list divide-y divide-indigo-100/90 rounded-xl border border-indigo-100/80 ring-1 ring-slate-100">
          {visible.map(({ row, signal }) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 px-3 py-3 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-900 ring-1 ring-indigo-100">
                    {signal === 'recent_call'
                      ? t('dashboardNextApptBadgeCall', 'Post-call')
                      : t('dashboardNextApptBadgeSlot', 'Slot ended')}
                  </span>
                  <span className="dema-paper-surface-title truncate font-semibold">{row.company_name}</span>
                </div>
                <p className="dema-paper-surface-muted mt-1 text-xs break-words">
                  {metaLine(row, signal, localeTag, t)}
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
                  onClick={() => dismissRow(row.id)}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300/90 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label={t(
                    'dashboardNextApptDismissRowAria',
                    'Hide from this list for this session only'
                  )}
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
