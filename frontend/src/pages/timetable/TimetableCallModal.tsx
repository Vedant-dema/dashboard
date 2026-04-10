import { useEffect, useMemo, useState } from 'react';
import { PhoneCall, X } from 'lucide-react';
import type { TimetableCallLogInput, TimetableEntry, TimetableOutcome } from '../../types/timetable';

type Props = {
  entry: TimetableEntry | null;
  t: (key: string, fallback: string) => string;
  onClose: () => void;
  onSave: (payload: TimetableCallLogInput) => void;
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return '';
  const trimmed = iso.trim();
  if (!trimmed) return '';
  return trimmed.length >= 16 ? trimmed.slice(0, 16) : '';
}

const OUTCOME_ORDER: TimetableOutcome[] = ['pending', 'follow_up', 'has_trucks', 'no_trucks'];

export function TimetableCallModal({ entry, t, onClose, onSave }: Props) {
  const [outcome, setOutcome] = useState<TimetableOutcome>('pending');
  const [followUpAt, setFollowUpAt] = useState('');
  const [noteAppend, setNoteAppend] = useState('');

  useEffect(() => {
    if (!entry) return;
    setOutcome(entry.outcome);
    setFollowUpAt(toDatetimeLocalValue(entry.follow_up_at));
    setNoteAppend('');
  }, [entry]);

  const outcomeLabels = useMemo(
    () => ({
      pending: t('timetableOutcomePending', 'Pending'),
      follow_up: t('timetableOutcomeFollowUp', 'Follow-up needed'),
      has_trucks: t('timetableOutcomeHasTrucks', 'Has trucks to sell'),
      no_trucks: t('timetableOutcomeNoTrucks', 'No trucks'),
    }),
    [t]
  );

  if (!entry) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="timetable-call-log-title"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/35">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <PhoneCall className="h-5 w-5" />
            </span>
            <div>
              <h3 id="timetable-call-log-title" className="text-base font-semibold text-slate-900">
                {t('timetableCallLogTitle', 'Log call result')}
              </h3>
              <p className="text-sm text-slate-500">{entry.company_name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
            aria-label={t('commonClose', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t('timetableFieldOutcome', 'Call outcome')}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {OUTCOME_ORDER.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setOutcome(item)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                    outcome === item
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {outcomeLabels[item]}
                </button>
              ))}
            </div>
          </div>

          {(outcome === 'follow_up' || outcome === 'has_trucks') && (
            <label className="block text-sm font-medium text-slate-700">
              {t('timetableFieldFollowUpAt', 'Follow-up date & time')}
              <input
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>
          )}

          <label className="block text-sm font-medium text-slate-700">
            {t('timetableFieldNotesAppend', 'Add note')}
            <textarea
              rows={4}
              value={noteAppend}
              onChange={(e) => setNoteAppend(e.target.value)}
              placeholder={t(
                'timetableFieldNotesAppendPlaceholder',
                'Write call details, objections, and next action.'
              )}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {t('commonCancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                outcome,
                follow_up_at: followUpAt ? `${followUpAt}:00` : null,
                note_append: noteAppend.trim(),
              })
            }
            className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {t('commonSave', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
