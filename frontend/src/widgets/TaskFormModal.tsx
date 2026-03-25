/**
 * TaskFormModal
 * Full-screen centred modal for creating / editing a task.
 * Renders via React portal so it escapes widget overflow clipping entirely.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ClipboardList } from "lucide-react";
import { TaskContextFields, type ContextData } from "./TaskContextFields";
import { AssigneePicker, type TeamMember } from "./AssigneePicker";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskFormValues {
  preset: string;
  contextData: ContextData;
  customTitle: string;
  priority: "high" | "medium" | "new";
  dueDate: string;
  assignedTo: string;
  note: string;
}

interface TaskFormModalProps {
  open: boolean;
  isEditing: boolean;
  values: TaskFormValues;
  onChange: (patch: Partial<TaskFormValues>) => void;
  onSave: () => void;
  onClose: () => void;
  taskPresets: { id: string; label: string }[];
  priorities: { id: string; label: string; tagClass: string }[];
  teamMembers: TeamMember[];
  currentUserEmail?: string;
  t: (key: string, fallback?: string) => string;
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
const selectCls = inputCls;
const labelCls = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500";

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFormModal({
  open,
  isEditing,
  values,
  onChange,
  onSave,
  onClose,
  taskPresets,
  priorities,
  teamMembers,
  currentUserEmail,
  t,
}: TaskFormModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)" }}
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-200/80"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
            <ClipboardList className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">
              {isEditing ? t("tasksFormEdit", "Edit task") : t("tasksFormNew", "New task")}
            </h2>
            <p className="text-[11px] text-blue-100">
              {isEditing ? t("tasksFormEditSub", "Update the task details below") : t("tasksFormNewSub", "Fill in the details to create a new task")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/25"
            title={t("commonCancel", "Cancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-4">

            {/* Task type */}
            <div>
              <label className={labelCls}>{t("tasksFieldTitle", "Task type")}</label>
              <select
                className={selectCls}
                value={values.preset}
                onChange={(e) => onChange({ preset: e.target.value, contextData: {} })}
              >
                {taskPresets.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Context fields */}
            <TaskContextFields
              preset={values.preset}
              contextData={values.contextData}
              onChange={(cd) => onChange({ contextData: cd })}
              inputCls={inputCls}
              labelCls={labelCls}
            />

            {/* Priority + Due date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t("tasksFieldPriority", "Priority")}</label>
                <select
                  className={selectCls}
                  value={values.priority}
                  onChange={(e) => onChange({ priority: e.target.value as "high" | "medium" | "new" })}
                >
                  {priorities.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("tasksDueDate", "Due date")}</label>
                <input
                  type="date"
                  className={inputCls}
                  value={values.dueDate}
                  onChange={(e) => onChange({ dueDate: e.target.value })}
                />
              </div>
            </div>

            {/* Custom title */}
            <div>
              <label className={labelCls}>
                {t("tasksCustomTitle", "Custom title")}{" "}
                <span className="font-normal normal-case text-slate-400">(optional — überschreibt Aufgabentyp)</span>
              </label>
              <input
                type="text"
                className={inputCls}
                placeholder={t("tasksCustomTitlePlaceholder", "Custom title…")}
                value={values.customTitle}
                onChange={(e) => onChange({ customTitle: e.target.value })}
              />
            </div>

            {/* Assign to */}
            <div>
              <label className={labelCls}>{t("tasksAssignTo", "Assign to")}</label>
              <AssigneePicker
                members={teamMembers}
                value={values.assignedTo}
                onChange={(v) => onChange({ assignedTo: v })}
                currentUserEmail={currentUserEmail}
                dueDate={values.dueDate || undefined}
                selfLabel={t("tasksAssignSelf", "— Myself —")}
                notifHint={t("tasksAssignNotif", "The assigned person will receive a notification.")}
              />
            </div>

            {/* Note */}
            <div>
              <label className={labelCls}>
                {t("tasksNote", "Note")}{" "}
                <span className="font-normal normal-case text-slate-400">(optional)</span>
              </label>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder={t("tasksNotePlaceholder", "Description or hint…")}
                value={values.note}
                onChange={(e) => onChange({ note: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="flex shrink-0 gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
          <button
            type="button"
            onClick={onSave}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          >
            {t("commonSave", "Save")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
          >
            {t("commonCancel", "Cancel")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
