import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlarmClock, Loader2, ShieldCheck, X } from 'lucide-react';
import type { TimetableEntry } from '../../../types/timetable';
import type { TimetableNotificationReadiness } from '../timetableReminderNotify';
import {
  ensureTimetableNotificationPermission,
  getTimetableNotificationReadiness,
} from '../timetableReminderNotify';

const PRESET_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;
const PANEL_W = 320;
const GAP = 8;
const EST_PANEL_H = 520;

type Props = {
  row: TimetableEntry;
  localeTag: string;
  t: (key: string, fallback: string) => string;
  onQuickFollowUp: (entry: TimetableEntry, minutes: number) => void;
  formatRowTime: (raw: string, localeTag: string) => string;
  formatRowDate: (raw: string, localeTag: string) => string;
  emptyMark: string;
};

function presetLabel(minutes: number, t: (key: string, fallback: string) => string): string {
  if (minutes === 10) return t('timetableQuickRemind10', '10 min');
  if (minutes === 30) return t('timetableQuickRemind30', '30 min');
  if (minutes === 60) return t('timetableQuickRemind60', '1 h');
  return t('timetableQuickRemindNMin', '{n} min').replace('{n}', String(minutes));
}

export function TimetableFollowUpReminderCell({
  row,
  localeTag,
  t,
  onQuickFollowUp,
  formatRowTime,
  formatRowDate,
  emptyMark,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [customMins, setCustomMins] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notifReadiness, setNotifReadiness] = useState<TimetableNotificationReadiness>(() =>
    getTimetableNotificationReadiness()
  );
  const [noDesktopPath, setNoDesktopPath] = useState(false);
  const [permBusy, setPermBusy] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const canSchedule = useMemo(
    () =>
      notifReadiness === 'granted' ||
      notifReadiness === 'unsupported' ||
      noDesktopPath,
    [notifReadiness, noDesktopPath]
  );

  const reposition = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let top = r.bottom + GAP;
    if (top + EST_PANEL_H > window.innerHeight - GAP) {
      top = Math.max(GAP, r.top - EST_PANEL_H - GAP);
    }
    let left = r.right - PANEL_W;
    left = Math.min(window.innerWidth - PANEL_W - GAP, Math.max(GAP, left));
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    const onResize = () => reposition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    setNotifReadiness(getTimetableNotificationReadiness());
    setNoDesktopPath(false);
    setError(null);
    setPermBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node;
      if (panelRef.current?.contains(node)) return;
      if (btnRef.current?.contains(node)) return;
      setOpen(false);
    };
    const id = window.setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [open]);

  const onAllowNotifications = useCallback(async () => {
    setPermBusy(true);
    setError(null);
    try {
      await ensureTimetableNotificationPermission();
      setNotifReadiness(getTimetableNotificationReadiness());
    } finally {
      setPermBusy(false);
    }
  }, []);

  const applyPreset = useCallback(
    (minutes: number) => {
      if (!canSchedule) {
        setError(t('timetableRemindPermLockedHint', 'Choose Allow notifications or Continue without desktop alerts above to unlock the duration options.'));
        return;
      }
      onQuickFollowUp(row, minutes);
      setOpen(false);
      setCustomMins('');
      setError(null);
    },
    [canSchedule, onQuickFollowUp, row, t]
  );

  const applyCustom = useCallback(() => {
    if (!canSchedule) {
      setError(t('timetableRemindPermLockedHint', 'Choose Allow notifications or Continue without desktop alerts above to unlock the duration options.'));
      return;
    }
    const trimmed = customMins.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError(t('timetableQuickRemindInvalid', 'Enter a whole number from 1 to 1440.'));
      return;
    }
    const n = Number.parseInt(trimmed, 10);
    if (n < 1 || n > 24 * 60) {
      setError(t('timetableQuickRemindInvalid', 'Enter a whole number from 1 to 1440.'));
      return;
    }
    onQuickFollowUp(row, n);
    setOpen(false);
    setCustomMins('');
    setError(null);
  }, [canSchedule, customMins, onQuickFollowUp, row, t]);

  const openAria = useMemo(
    () =>
      t('timetableQuickRemindOpenAria', 'Plan callback reminder for {company}').replace(
        '{company}',
        row.company_name
      ),
    [row.company_name, t]
  );

  const permissionBlock = (
    <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50/95 p-3 ring-1 ring-slate-900/[0.04]">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
          {t('timetableRemindPermTitle', 'Desktop alerts (permission)')}
        </p>
      </div>
      {notifReadiness === 'granted' ? (
        <p className="text-xs font-medium leading-snug text-emerald-800">
          {t(
            'timetableRemindPermBodyGranted',
            'Notifications are allowed. You will receive a browser alert at due time while this app is open.'
          )}
        </p>
      ) : null}
      {notifReadiness === 'unsupported' ? (
        <p className="text-xs leading-snug text-slate-700">
          {t(
            'timetableRemindPermBodyUnsupported',
            'This browser does not support notifications. The follow-up will still save; reminders appear in-app while this app is open.'
          )}
        </p>
      ) : null}
      {notifReadiness === 'denied' ? (
        <div className="space-y-2">
          <p className="text-xs leading-snug text-slate-700">
            {t(
              'timetableRemindPermBodyDenied',
              'Notifications are blocked for this site. To enable desktop alerts, change the setting from the lock or tune icon in the address bar, or in the browser’s site settings. You may still save the follow-up.'
            )}
          </p>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-200/80 bg-amber-50/80 p-2.5">
            <input
              type="checkbox"
              id={`tt-rem-denied-${row.id}`}
              checked={noDesktopPath}
              onChange={(e) => setNoDesktopPath(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
            />
            <span className="text-[11px] font-medium leading-snug text-slate-800">
              {t(
                'timetableRemindPermDeniedAckLabel',
                'I confirm desktop alerts are not available for this site in my browser.'
              )}
            </span>
          </label>
        </div>
      ) : null}
      {notifReadiness === 'default' ? (
        <div className="space-y-2.5">
          <p className="text-xs leading-snug text-slate-700">
            {t(
              'timetableRemindPermBodyDefault',
              'To show a native browser alert when this follow-up is due, this site needs notification permission. We use it only for purchase follow-up reminders. You can still save the follow-up without it — in-app banners apply while this app is open.'
            )}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={permBusy}
              onClick={() => void onAllowNotifications()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {permBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
              ) : null}
              {permBusy
                ? t('timetableRemindPermAllowBusy', 'Requesting permission…')
                : t('timetableRemindPermAllow', 'Allow notifications')}
            </button>
            <button
              type="button"
              disabled={permBusy}
              onClick={() => setNoDesktopPath(true)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('timetableRemindPermContinueWithout', 'Continue without desktop alerts')}
            </button>
          </div>
        </div>
      ) : null}
      {!canSchedule && notifReadiness === 'default' && !noDesktopPath ? (
        <p className="mt-2 text-[10px] font-medium leading-snug text-amber-900" role="status">
          {t(
            'timetableRemindPermLockedHint',
            'Choose Allow notifications or Continue without desktop alerts above to unlock the duration options.'
          )}
        </p>
      ) : null}
    </div>
  );

  const panel = !open ? null : (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('timetableQuickRemindPanelTitle', 'Schedule callback')}
      style={{ position: 'fixed', top: pos.top, left: pos.left, width: PANEL_W, zIndex: 200 }}
      className="dema-timetable-reminder-dialog rounded-2xl border border-slate-200/95 p-3.5 shadow-[0_24px_50px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.04]"
    >
      <div className="mb-2.5 flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {t('timetableColFollowUp', 'Follow-up')}
          </p>
          <p className="text-sm font-semibold text-slate-900">
            {t('timetableQuickRemindPanelTitle', 'Schedule callback')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          aria-label={t('commonClose', 'Close')}
        >
          <X className="h-4 w-4" strokeWidth={2} aria-hidden />
        </button>
      </div>
      {permissionBlock}
      <p className="mb-3 text-[11px] leading-snug text-slate-500">
        {t(
          'timetableQuickRemindPanelHint',
          'Saved to follow-up; optional desktop alert when the browser allows notifications.'
        )}
      </p>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {t('timetableQuickRemindPresetsSection', 'Common intervals')}
      </p>
      <div
        className={`mb-3.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4 ${!canSchedule ? 'opacity-45' : ''}`}
        aria-disabled={!canSchedule}
      >
        {PRESET_MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            disabled={!canSchedule}
            onClick={() => applyPreset(m)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-orange-50/90 px-1.5 text-[11px] font-bold text-amber-950 shadow-sm ring-1 ring-amber-100/70 transition hover:border-amber-300 hover:from-amber-100/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {presetLabel(m, t)}
          </button>
        ))}
      </div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        {t('timetableQuickRemindCustomSection', 'Custom duration')}
      </p>
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-stretch ${!canSchedule ? 'opacity-45' : ''}`}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={customMins}
          disabled={!canSchedule}
          onChange={(e) => {
            setCustomMins(e.target.value.replace(/\D/g, ''));
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyCustom();
            }
          }}
          placeholder={t('timetableQuickRemindMinutesPh', 'e.g. 25')}
          aria-invalid={error != null}
          aria-describedby={error ? `tt-rem-err-${row.id}` : `tt-rem-hint-${row.id}`}
          className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-sm font-semibold text-slate-900 outline-none ring-0 transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed sm:flex-1"
        />
        <button
          type="button"
          disabled={!canSchedule}
          onClick={applyCustom}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-xs font-bold text-white shadow-md shadow-emerald-900/15 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 sm:w-auto"
        >
          {t('timetableQuickRemindApply', 'Apply')}
        </button>
      </div>
      <p id={`tt-rem-hint-${row.id}`} className="mt-1.5 text-[10px] text-slate-400">
        {t('timetableQuickRemindMaxHint', '1–1440 minutes (up to 24 hours).')}
      </p>
      {error ? (
        <p id={`tt-rem-err-${row.id}`} className="mt-1.5 text-[11px] font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div>
        {row.follow_up_at ? formatRowTime(row.follow_up_at, localeTag) : emptyMark}
        {row.follow_up_at ? (
          <span className="ml-1 block text-[10px] font-normal text-slate-500">
            {formatRowDate(row.follow_up_at, localeTag)}
          </span>
        ) : null}
      </div>
      <div className="print:hidden">
        <button
          ref={btnRef}
          type="button"
          onClick={() => {
            setError(null);
            setOpen((v) => !v);
          }}
          title={t(
            'timetableQuickRemindLegend',
            'Choose a preset or enter minutes; optional desktop reminder.'
          )}
          aria-label={openAria}
          aria-expanded={open}
          className="inline-flex min-h-11 w-full max-w-[14rem] items-center justify-center gap-2 rounded-xl border border-amber-200/90 bg-gradient-to-b from-amber-50 to-orange-50/90 px-3 text-[11px] font-bold uppercase tracking-wide text-amber-950 shadow-sm ring-1 ring-amber-100/80 transition hover:border-amber-300 hover:from-amber-100/90 active:scale-[0.99]"
        >
          <AlarmClock className="h-4 w-4 shrink-0 text-amber-700" strokeWidth={2} aria-hidden />
          {t('timetableQuickRemindOpen', 'Reminder')}
        </button>
        {open && typeof document !== 'undefined'
          ? createPortal(panel, document.body)
          : null}
      </div>
    </div>
  );
}
