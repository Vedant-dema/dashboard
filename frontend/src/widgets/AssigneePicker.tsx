/**
 * AssigneePicker
 * Custom dropdown for selecting a task assignee.
 * - Renders the panel via a React portal so it escapes widget overflow clipping.
 * - Shows live workload per team member from the dashboard task data.
 * - When a due date is provided, shows how many tasks each member already has
 *   on that specific date so the assigner can spot conflicts at a glance.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, AlertTriangle, CalendarDays, Users } from "lucide-react";
import {
  getWorkloadLevel,
  getWorkloadMap,
  WORKLOAD_CONFIG,
  type WorkloadStats,
} from "../store/workloadStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  email: string;
  name: string;
}

interface AssigneePickerProps {
  members: TeamMember[];
  value: string; // email or "__self__"
  onChange: (value: string) => void;
  currentUserEmail?: string;
  /** Selected due date (ISO YYYY-MM-DD) — drives the date-specific task count */
  dueDate?: string;
  selfLabel?: string;
  notifHint?: string;
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

const AVATAR_COLOURS = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500", "bg-cyan-500", "bg-indigo-500", "bg-pink-500",
];
function avatarColour(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length]!;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
    weekday: "short", day: "2-digit", month: "short",
  });
}

// ─── WorkloadBar ──────────────────────────────────────────────────────────────

function WorkloadBar({
  stats,
  dueDate,
  compact = false,
}: {
  stats: WorkloadStats;
  dueDate?: string;
  compact?: boolean;
}) {
  const level = getWorkloadLevel(stats);
  const cfg = WORKLOAD_CONFIG[level];
  const dateCount = dueDate ? (stats.tasksByDate[dueDate] ?? 0) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {dueDate && dateCount > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-orange-50 px-1.5 py-0.5 text-[9px] font-semibold text-orange-600 ring-1 ring-orange-200">
            <CalendarDays className="h-2 w-2" />
            {dateCount}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ${cfg.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {stats.total > 0 ? `${stats.total}` : "Frei"}
        </span>
      </div>
    );
  }

  const maxTasks = 10;
  const pct = Math.min(100, (stats.total / maxTasks) * 100);

  return (
    <div className="space-y-1">
      {/* Level label + total count */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-semibold ${cfg.text}`}>{cfg.labelDe}</span>
        <span className="text-[10px] text-slate-400">{stats.total} aktive Tasks</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${cfg.bar}`}
          style={{ width: `${Math.max(pct, stats.total > 0 ? 6 : 0)}%` }}
        />
      </div>

      {/* Detail pills row */}
      <div className="flex flex-wrap items-center gap-1">
        {stats.overdue > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-600 ring-1 ring-red-200">
            <AlertTriangle className="h-2.5 w-2.5" />
            {stats.overdue} überfällig
          </span>
        )}
        {stats.today > 0 && (
          <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 ring-1 ring-amber-200">
            {stats.today} heute fällig
          </span>
        )}
        {stats.total === 0 && (
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 ring-1 ring-emerald-200">
            Keine aktiven Tasks
          </span>
        )}
      </div>

      {/* Date-specific task count — shown only when a due date is selected */}
      {dueDate && (
        <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10px] font-semibold ${
          dateCount === 0
            ? "bg-emerald-50 text-emerald-700"
            : dateCount <= 2
            ? "bg-amber-50 text-amber-700"
            : "bg-red-50 text-red-700"
        }`}>
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>
            Am {formatDate(dueDate)}:{" "}
            {dateCount === 0
              ? "Keine Tasks — Datum verfügbar"
              : `${dateCount} Task${dateCount !== 1 ? "s" : ""} bereits geplant`}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Portal dropdown ──────────────────────────────────────────────────────────

interface DropdownPortalProps {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function DropdownPortal({ anchorRef, open, onClose, children }: DropdownPortalProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const panelHeight = 380; // approximate max height

    const goUp = spaceBelow < panelHeight && spaceAbove > spaceBelow;

    setStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(goUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div ref={panelRef} style={style}>
      {children}
    </div>,
    document.body
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AssigneePicker({
  members,
  value,
  onChange,
  currentUserEmail,
  dueDate,
  selfLabel = "— Myself —",
  notifHint = "The assigned person will receive a notification.",
}: AssigneePickerProps) {
  const [open, setOpen] = useState(false);
  const [workloadMap, setWorkloadMap] = useState<Map<string, WorkloadStats>>(new Map());
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Refresh workload whenever dropdown opens
  useEffect(() => {
    if (open) setWorkloadMap(getWorkloadMap());
  }, [open]);

  const close = () => setOpen(false);

  const selectedMember = value !== "__self__" ? members.find((m) => m.email === value) : null;
  const selectedStats = selectedMember
    ? (workloadMap.get(selectedMember.email) ?? { assigned: 0, overdue: 0, today: 0, total: 0, tasksByDate: {} })
    : null;

  const emptyStats: WorkloadStats = { assigned: 0, overdue: 0, today: 0, total: 0, tasksByDate: {} };

  return (
    <div className="relative">
      {/* ── Trigger button ── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs shadow-sm outline-none transition focus:ring-2 focus:ring-blue-500/20 ${
          open
            ? "border-blue-400 bg-white ring-2 ring-blue-500/20"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
      >
        {selectedMember ? (
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${avatarColour(selectedMember.email)}`}>
            {getInitials(selectedMember.name)}
          </span>
        ) : (
          <Users className="h-4 w-4 shrink-0 text-slate-400" />
        )}

        <span className={`flex-1 truncate font-medium ${selectedMember ? "text-slate-700" : "text-slate-500"}`}>
          {selectedMember ? selectedMember.name : selfLabel}
        </span>

        {selectedMember && selectedStats && (
          <WorkloadBar stats={selectedStats} dueDate={dueDate} compact />
        )}

        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* ── Portal dropdown panel ── */}
      <DropdownPortal anchorRef={triggerRef} open={open} onClose={close}>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
          {/* Header */}
          <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Aufgabe zuweisen</p>
            {dueDate ? (
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                <CalendarDays className="h-3 w-3" />
                Fälligkeit: <span className="font-semibold text-slate-700">{formatDate(dueDate)}</span>
                — Tasks pro Person für dieses Datum werden angezeigt
              </p>
            ) : (
              <p className="text-[10px] text-slate-400">Wählen Sie ein Fälligkeitsdatum, um Terminkonflikte zu sehen.</p>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {/* Myself */}
            <button
              type="button"
              onClick={() => { onChange("__self__"); close(); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 ${value === "__self__" ? "bg-blue-50/60" : ""}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
                {currentUserEmail
                  ? getInitials(members.find((m) => m.email === currentUserEmail)?.name ?? "Me")
                  : "Me"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-700">{selfLabel}</p>
                <p className="text-[10px] text-slate-400">Kein Benachrichtigungs-Versand</p>
              </div>
              {value === "__self__" && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />}
            </button>

            {members.length > 0 && <div className="mx-3 border-t border-slate-100" />}

            {/* Team members */}
            {members.map((member) => {
              const stats = workloadMap.get(member.email) ?? emptyStats;
              const level = getWorkloadLevel(stats);
              const cfg = WORKLOAD_CONFIG[level];
              const isSelected = value === member.email;
              const isSelf = member.email === currentUserEmail;
              const dateCount = dueDate ? (stats.tasksByDate[dueDate] ?? 0) : 0;

              return (
                <button
                  key={member.email}
                  type="button"
                  onClick={() => { onChange(member.email); close(); }}
                  className={`flex w-full items-start gap-2.5 px-3 py-3 text-left transition-colors hover:bg-slate-50 ${isSelected ? "bg-blue-50/60" : ""}`}
                >
                  {/* Avatar with level dot */}
                  <div className="relative mt-0.5 shrink-0">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ${avatarColour(member.email)}`}>
                      {getInitials(member.name)}
                    </span>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-bold text-slate-700">{member.name}</span>
                      {isSelf && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-500">Du</span>
                      )}
                      {/* Urgent date conflict warning */}
                      {dueDate && dateCount >= 3 && (
                        <span className="flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-semibold text-red-600 ring-1 ring-red-200">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Voll ausgelastet
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] text-slate-400">{member.email}</p>
                    <WorkloadBar stats={stats} dueDate={dueDate} />
                  </div>

                  {isSelected && <Check className="mt-1 h-4 w-4 shrink-0 text-blue-600" />}
                </button>
              );
            })}

            {members.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-slate-400">
                Keine weiteren Teammitglieder registriert.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-2">
            <p className="text-[9px] text-slate-400">
              Auslastung basiert auf aktiven (nicht erledigten) Aufgaben im Dashboard.
            </p>
          </div>
        </div>
      </DropdownPortal>

      {/* Notification hint */}
      {value !== "__self__" && (
        <p className="mt-1 flex items-center gap-1 text-[10px] text-blue-600">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
          {notifHint}
        </p>
      )}
    </div>
  );
}
