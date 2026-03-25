const NOTIF_KEY = "dema-task-notifications";
export const TASK_NOTIF_EVENT = "dema-task-notifications-changed";

export type TaskNotification = {
  id: string;
  taskTitle: string;
  assignedBy: string;
  assignedByName: string;
  assignedTo: string;
  timestamp: string;
  read: boolean;
};

function loadNotifications(): TaskNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is TaskNotification =>
        n != null &&
        typeof n === "object" &&
        typeof (n as TaskNotification).id === "string" &&
        typeof (n as TaskNotification).assignedTo === "string" &&
        typeof (n as TaskNotification).taskTitle === "string"
    );
  } catch {
    return [];
  }
}

function saveNotifications(notifs: TaskNotification[]): void {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
  } catch {
    // ignore
  }
}

function dispatchChange(): void {
  window.dispatchEvent(new CustomEvent(TASK_NOTIF_EVENT));
}

export function addTaskNotification(n: Omit<TaskNotification, "id" | "read">): void {
  const all = loadNotifications();
  all.unshift({
    ...n,
    id: `tn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    read: false,
  });
  saveNotifications(all);
  dispatchChange();
}

export function getNotificationsForUser(email: string): TaskNotification[] {
  const lc = email.toLowerCase();
  return loadNotifications()
    .filter((n) => n.assignedTo.toLowerCase() === lc)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getUnreadCountForUser(email: string): number {
  return getNotificationsForUser(email).filter((n) => !n.read).length;
}

export function markNotificationRead(id: string): void {
  const all = loadNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(all);
  dispatchChange();
}

export function markAllReadForUser(email: string): void {
  const lc = email.toLowerCase();
  const all = loadNotifications().map((n) =>
    n.assignedTo.toLowerCase() === lc ? { ...n, read: true } : n
  );
  saveNotifications(all);
  dispatchChange();
}
