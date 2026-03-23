import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Video } from "lucide-react";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { getMeetingsFromConfig, type MeetingStored } from "./dynamicWidgetLists";
import { MEETING_ROOMS, MEETING_TOPICS, meetingDisplay, timeSlotOptions } from "./widgetListPresets";

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20";

function displayMeeting(row: MeetingStored): { title: string; room: string } {
  if (row.legacyTitle) {
    return { title: row.legacyTitle, room: row.legacyRoom ?? "—" };
  }
  return meetingDisplay(row.topicId, row.roomId);
}

export function MeetingsWidget({ config, onUpdateConfig }: WidgetRenderProps) {
  const title = cfgString(config, "customTitle", "Meetings");
  const newLabel = cfgString(config, "newMeetingLabel", "Neues Meeting");

  const slots = useMemo(() => timeSlotOptions(), []);
  const list = useMemo(() => {
    const raw = getMeetingsFromConfig(config);
    return [...raw].sort((a, b) => a.time.localeCompare(b.time));
  }, [config]);

  const persist = (next: MeetingStored[]) => {
    onUpdateConfig?.({
      meetings: next,
      meetingLines: undefined,
    });
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formTime, setFormTime] = useState("10:00");
  const [formTopic, setFormTopic] = useState("sales");
  const [formRoom, setFormRoom] = useState("zoom");

  const openAdd = () => {
    setEditingId(null);
    setFormTime("10:00");
    setFormTopic("sales");
    setFormRoom("zoom");
    setAdding(true);
  };

  const openEdit = (row: MeetingStored) => {
    setAdding(false);
    setEditingId(row.id);
    setFormTime(row.time);
    setFormTopic(row.topicId);
    setFormRoom(row.roomId);
  };

  const cancelForm = () => {
    setAdding(false);
    setEditingId(null);
  };

  const saveForm = () => {
    const next: MeetingStored = {
      id: editingId ?? `m-${Date.now()}`,
      time: formTime,
      topicId: formTopic,
      roomId: formRoom,
    };
    let nextList: MeetingStored[];
    if (editingId) {
      nextList = list.map((x) =>
        x.id === editingId ? { ...next, legacyTitle: undefined, legacyRoom: undefined } : x
      );
    } else {
      nextList = [...list, next];
    }
    persist(nextList);
    cancelForm();
  };

  const remove = (id: string) => {
    persist(list.filter((x) => x.id !== id));
    if (editingId === id) cancelForm();
  };

  const canEdit = Boolean(onUpdateConfig);

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">{title}</h2>
      <ul className="min-h-0 flex-1 space-y-3 overflow-auto">
        {list.map((m) => {
          const d = displayMeeting(m);
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Video className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800">{d.title}</p>
                <p className="text-xs text-slate-500">
                  {m.time} · {d.room}
                </p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-blue-600"
                    title="Bearbeiten"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Entfernen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {(adding || editingId) && canEdit && (
        <div className="mt-3 space-y-2 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
          <p className="text-xs font-semibold text-slate-600">
            {editingId ? "Meeting bearbeiten" : "Neues Meeting"}
          </p>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">Uhrzeit</label>
            <select className={selectCls} value={formTime} onChange={(e) => setFormTime(e.target.value)}>
              {slots.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">Thema</label>
            <select className={selectCls} value={formTopic} onChange={(e) => setFormTopic(e.target.value)}>
              {MEETING_TOPICS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-medium uppercase text-slate-500">Ort / Tool</label>
            <select className={selectCls} value={formRoom} onChange={(e) => setFormRoom(e.target.value)}>
              {MEETING_ROOMS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={saveForm}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Speichern
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="flex-1 rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-600 hover:bg-white"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {canEdit && !adding && !editingId && (
        <button
          type="button"
          onClick={openAdd}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50/50"
        >
          <Plus className="h-4 w-4" />
          {newLabel}
        </button>
      )}
    </div>
  );
}
