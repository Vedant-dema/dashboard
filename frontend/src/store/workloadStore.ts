/**
 * workloadStore.ts
 * Scans all "tasks" widgets in the current dashboard layout and aggregates
 * per-user task counts so the assigner can see how loaded each teammate is.
 */
import { loadLayout } from "./dashboardLayout";
import { getTasksFromConfig } from "../widgets/dynamicWidgetLists";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkloadStats = {
  /** Non-done tasks directly assigned to this user */
  assigned: number;
  /** Of those, how many are already overdue */
  overdue: number;
  /** Of those, how many are due today */
  today: number;
  /** Total including tasks they created for themselves */
  total: number;
  /** Per-date task count (ISO date → number of non-done tasks) */
  tasksByDate: Record<string, number>;
};

export type WorkloadLevel = "free" | "light" | "moderate" | "busy";

// ─── Level thresholds ────────────────────────────────────────────────────────

export function getWorkloadLevel(stats: WorkloadStats): WorkloadLevel {
  const n = stats.total;
  if (n === 0) return "free";
  if (n <= 3) return "light";
  if (n <= 6) return "moderate";
  return "busy";
}

export const WORKLOAD_CONFIG: Record<WorkloadLevel, {
  label: string;
  labelDe: string;
  bar: string;
  badge: string;
  text: string;
  dot: string;
  pct: number;
}> = {
  free:     { label: "Available",          labelDe: "Verfügbar",           bar: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",  text: "text-emerald-700", dot: "bg-emerald-400", pct: 5  },
  light:    { label: "Lightly loaded",     labelDe: "Leicht ausgelastet",  bar: "bg-green-400",   badge: "bg-green-50 text-green-700 ring-green-200",        text: "text-green-700",   dot: "bg-green-400",   pct: 30 },
  moderate: { label: "Moderately loaded",  labelDe: "Mäßig ausgelastet",   bar: "bg-amber-400",   badge: "bg-amber-50 text-amber-700 ring-amber-200",        text: "text-amber-700",   dot: "bg-amber-400",   pct: 65 },
  busy:     { label: "Heavily loaded",     labelDe: "Stark ausgelastet",   bar: "bg-red-400",     badge: "bg-red-50 text-red-700 ring-red-200",              text: "text-red-700",     dot: "bg-red-400",     pct: 100 },
};

// ─── Date helpers (duplicated to keep this file dependency-free) ──────────────

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false;
  return dueDate < isoToday();
}

function isToday(dueDate: string | undefined): boolean {
  return dueDate === isoToday();
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Reads every "tasks" widget from the dashboard layout and returns a map from
 * user email → WorkloadStats containing only non-done tasks.
 */
export function getWorkloadMap(): Map<string, WorkloadStats> {
  const map = new Map<string, WorkloadStats>();

  const ensure = (email: string): WorkloadStats => {
    if (!map.has(email)) map.set(email, { assigned: 0, overdue: 0, today: 0, total: 0, tasksByDate: {} });
    return map.get(email)!;
  };

  try {
    const layout = loadLayout();
    for (const widget of layout.widgets) {
      if (widget.type !== "tasks") continue;
      const tasks = getTasksFromConfig(widget.config ?? {}, []);
      for (const task of tasks) {
        if (task.done) continue;

        // Count tasks assigned TO a specific user
        if (task.assignedTo) {
          const s = ensure(task.assignedTo);
          s.assigned++;
          s.total++;
          if (isOverdue(task.dueDate)) s.overdue++;
          if (isToday(task.dueDate)) s.today++;
          if (task.dueDate) {
            s.tasksByDate[task.dueDate] = (s.tasksByDate[task.dueDate] ?? 0) + 1;
          }
        }

        // Also count tasks the user created for themselves (assignedTo absent or same as assignedBy)
        if (task.assignedBy && (!task.assignedTo || task.assignedTo === task.assignedBy)) {
          const s = ensure(task.assignedBy);
          if (!task.assignedTo || task.assignedTo !== task.assignedBy) {
            s.total++;
            if (task.dueDate) {
              s.tasksByDate[task.dueDate] = (s.tasksByDate[task.dueDate] ?? 0) + 1;
            }
          }
        }
      }
    }
  } catch {
    // silently fall back to empty map on any parse error
  }

  return map;
}

/** Convenience: get stats for one user (returns zeros if not found). */
export function getUserWorkload(email: string): WorkloadStats {
  return getWorkloadMap().get(email) ?? { assigned: 0, overdue: 0, today: 0, total: 0, tasksByDate: {} };
}
