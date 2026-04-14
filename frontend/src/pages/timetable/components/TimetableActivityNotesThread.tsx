import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import type {
  TimetableActivityNoteEntry,
  TimetableContactProfile,
  TimetableEntry,
} from '../../../types/timetable';
import { textareaClassScrollable } from '../contactDrawerFormClasses';
import {
  activityNotesLegacyTimestampIso,
  activityNotesStaggerAfter,
  buildActivityNotesDisplayList,
  ensureProfile,
  LEGACY_ACTIVITY_NOTE_VIRTUAL_ID,
  newActivityNoteId,
  ROW_NOTES_VIRTUAL_ID,
  type ActivityNoteDisplayRow,
} from '../contactDrawerFormUtils';

export type TimetableActivityNotesThreadProps = {
  draft: TimetableEntry;
  profile: TimetableContactProfile;
  patchDraft: (updater: (prev: TimetableEntry) => TimetableEntry) => void;
  localeTag: string;
  t: (key: string, fallback: string) => string;
  /** Taller scroll area when embedded in the Kunde tab “Bemerkungen” column. */
  layout?: 'formSection' | 'drawerBemerkungen';
};

export function TimetableActivityNotesThread({
  draft,
  profile,
  patchDraft,
  localeTag,
  t,
  layout = 'formSection',
}: TimetableActivityNotesThreadProps) {
  const { user } = useAuth();
  const currentAuthorName = useMemo(
    () => (user?.name ?? user?.email ?? '').trim(),
    [user?.email, user?.name],
  );
  const [noteComposer, setNoteComposer] = useState('');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const activityRows = useMemo(
    () => buildActivityNotesDisplayList(profile, draft.scheduled_at, draft.notes),
    [profile, draft.scheduled_at, draft.notes],
  );

  /** Oldest at top, newest just above composer — keep scroll pinned to latest. */
  useLayoutEffect(() => {
    if (editingRowId != null) return;
    const el = scrollRef.current;
    if (!el || activityRows.length === 0) return;
    el.scrollTop = el.scrollHeight;
  }, [activityRows, editingRowId]);

  const formatNoteTime = useCallback(
    (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return t('commonPlaceholderDash', '—');
      return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    },
    [localeTag, t],
  );

  const cancelEdit = () => {
    setEditingRowId(null);
    setEditDraft('');
  };

  const startEdit = (row: ActivityNoteDisplayRow) => {
    setEditingRowId(row.id);
    setEditDraft(row.text);
  };

  const saveEditedNote = (row: ActivityNoteDisplayRow) => {
    const text = editDraft.trim();
    if (!text) return;
    patchDraft((prev) => {
      if (row.isVirtual) {
        if (row.id === ROW_NOTES_VIRTUAL_ID) {
          return { ...prev, notes: text };
        }
        if (row.id === LEGACY_ACTIVITY_NOTE_VIRTUAL_ID) {
          const pr = ensureProfile(prev);
          return { ...prev, contact_profile: { ...pr, activity_notes: text } };
        }
        return prev;
      }
      const pr = ensureProfile(prev);
      const log = pr.activity_notes_log ?? [];
      const nextLog = log.map((e) => (e.id === row.id ? { ...e, text } : e));
      return { ...prev, contact_profile: { ...pr, activity_notes_log: nextLog } };
    });
    cancelEdit();
  };

  const deleteActivityNote = (row: ActivityNoteDisplayRow) => {
    if (editingRowId === row.id) cancelEdit();
    if (row.isVirtual) {
      if (row.id === ROW_NOTES_VIRTUAL_ID) {
        patchDraft((prev) => ({ ...prev, notes: '' }));
        return;
      }
      patchDraft((prev) => {
        const pr = ensureProfile(prev);
        return { ...prev, contact_profile: { ...pr, activity_notes: undefined } };
      });
      return;
    }
    patchDraft((prev) => {
      const pr = ensureProfile(prev);
      const log = pr.activity_notes_log ?? [];
      const nextLog = log.filter((e) => e.id !== row.id);
      const nextPr: TimetableContactProfile = { ...pr };
      if (nextLog.length > 0) nextPr.activity_notes_log = nextLog;
      else delete nextPr.activity_notes_log;
      return { ...prev, contact_profile: nextPr };
    });
  };

  const addActivityNote = () => {
    const text = noteComposer.trim();
    if (!text) return;
    patchDraft((prev) => {
      const pr = ensureProfile(prev);
      const rowN = (prev.notes ?? '').trim();
      const legacy = (pr.activity_notes ?? '').trim();
      const existingLog = pr.activity_notes_log?.filter((e) => (e.text ?? '').trim()) ?? [];
      let nextLog: TimetableActivityNoteEntry[];
      const stamp: Pick<TimetableActivityNoteEntry, 'author_name'> = currentAuthorName
        ? { author_name: currentAuthorName }
        : {};
      if (existingLog.length > 0) {
        nextLog = [
          ...existingLog,
          { id: newActivityNoteId(), at: new Date().toISOString(), text, ...stamp },
        ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      } else {
        const t0 = activityNotesLegacyTimestampIso(prev.scheduled_at);
        const t1 = activityNotesStaggerAfter(t0);
        const seeds: TimetableActivityNoteEntry[] = [];
        if (rowN) seeds.push({ id: newActivityNoteId(), at: t0, text: rowN });
        if (legacy) seeds.push({ id: newActivityNoteId(), at: rowN ? t1 : t0, text: legacy });
        nextLog = (
          seeds.length > 0
            ? [...seeds, { id: newActivityNoteId(), at: new Date().toISOString(), text, ...stamp }]
            : [{ id: newActivityNoteId(), at: new Date().toISOString(), text, ...stamp }]
        ).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      }
      return {
        ...prev,
        notes: '',
        contact_profile: {
          ...pr,
          activity_notes_log: nextLog,
          activity_notes: undefined,
        },
      };
    });
    setNoteComposer('');
  };

  const notesScrollbarClass =
    'min-h-0 overflow-y-scroll scroll-smooth [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/90 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100/80';

  /** Drawer: fixed cap so the column does not grow with many messages — scroll inside the box. */
  const scrollClass =
    layout === 'drawerBemerkungen'
      ? `flex w-full flex-1 flex-col rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 min-h-[18rem] max-h-[min(68dvh,38rem)] sm:max-h-[min(72dvh,42rem)] lg:max-h-[min(74dvh,44rem)] ${notesScrollbarClass}`
      : `flex max-h-[28rem] min-h-[16rem] flex-col rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 xl:max-h-[32rem] ${notesScrollbarClass}`;

  const composerMaxH =
    layout === 'drawerBemerkungen'
      ? 'max-h-[min(44dvh,18rem)]'
      : 'max-h-[min(34dvh,14rem)]';

  return (
    <div className={layout === 'drawerBemerkungen' ? 'flex min-h-0 flex-1 flex-col gap-3' : 'flex flex-col gap-3'}>
      <div ref={scrollRef} className={scrollClass} role="log" aria-live="polite">
        {activityRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t('timetableContactActivityEmpty', 'No notes yet. Write below to add one.')}
          </p>
        ) : (
          <div className="flex w-full flex-col gap-2">
            {activityRows.map((row) => (
              <article
                key={row.id}
                className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <time
                      className="shrink-0 text-xs font-medium text-slate-500"
                      dateTime={row.at}
                    >
                      {formatNoteTime(row.at)}
                    </time>
                    <span
                      className="inline-flex max-w-full shrink truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80"
                      title={row.author_name?.trim() || t('timetableContactActivityAuthorUnknown', 'Not recorded')}
                    >
                      {row.author_name?.trim() ||
                        t('timetableContactActivityAuthorUnknown', 'Not recorded')}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    {editingRowId === row.id ? (
                      <>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/90 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40"
                          onClick={() => saveEditedNote(row)}
                          disabled={!editDraft.trim()}
                        >
                          {t('commonSave', 'Save')}
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                          onClick={cancelEdit}
                        >
                          {t('commonCancel', 'Cancel')}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 transition hover:bg-sky-50 hover:text-sky-700"
                          onClick={() => startEdit(row)}
                          aria-label={t('timetableContactActivityEditNoteAria', 'Edit this note')}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          onClick={() => deleteActivityNote(row)}
                          aria-label={t('timetableContactActivityDeleteNoteAria', 'Delete this note')}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingRowId === row.id ? (
                  <textarea
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    rows={layout === 'drawerBemerkungen' ? 4 : 5}
                    className={`${textareaClassScrollable} min-h-[5rem] w-full resize-y font-sans text-[14px] leading-relaxed ${composerMaxH}`}
                    aria-label={t('timetableContactActivityEditNoteAria', 'Edit this note')}
                  />
                ) : (
                  <p className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-slate-800">
                    {row.text}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
        <label className="min-h-0 min-w-0 flex-1">
          <span className="sr-only">
            {t('timetableContactActivityComposerPlaceholder', 'Write a new note…')}
          </span>
          <textarea
            value={noteComposer}
            onChange={(e) => setNoteComposer(e.target.value)}
            rows={layout === 'drawerBemerkungen' ? 2 : 3}
            className={`${textareaClassScrollable} min-h-[4rem] resize-y font-sans text-[14px] leading-relaxed ${composerMaxH}`}
            placeholder={t('timetableContactActivityComposerPlaceholder', 'Write a new note…')}
          />
        </label>
        <button
          type="button"
          onClick={addActivityNote}
          disabled={!noteComposer.trim()}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {t('timetableContactActivityAddNote', 'Add note')}
        </button>
      </div>
    </div>
  );
}
