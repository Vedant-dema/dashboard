import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Pencil,
  Plus,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import type { WidgetRenderProps } from "../types/dashboard";
import { useWidgetLanguage } from "./useWidgetLanguage";
import { cfgString } from "./widgetConfigHelpers";
import { getTasksFromConfig, taskDisplay, type TaskStored } from "./dynamicWidgetLists";
import { TASK_PRIORITIES, TASK_TITLE_PRESETS } from "./widgetListPresets";
import { useAuth } from "../contexts/AuthContext";
import { listRegisteredUserProfiles } from "../auth/authStorage";
import { addTaskNotification } from "../store/taskNotifications";
import { TaskContextFields, type ContextData } from "./TaskContextFields";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function isoAddDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

type DateBucket = "overdue" | "today" | "week" | "later" | "nodate";

function getBucket(dueDate: string | undefined): DateBucket {
  if (!dueDate) return "nodate";
  const today = isoToday();
  if (dueDate < today) return "overdue";
  if (dueDate === today) return "today";
  if (dueDate < isoAddDays(7)) return "week";
  return "later";
}

function formatDueDate(dueDate: string, t: (key: string, fallback?: string) => string): string {
  const today = isoToday();
  const tomorrow = isoAddDays(1);
  if (dueDate === today) return t("dueDateToday", "Today");
  if (dueDate === tomorrow) return t("dueDateTomorrow", "Tomorrow");
  const [y, m, d] = dueDate.split("-");
  return `${d}.${m}.${y}`;
}

// ─── Priority sort weight ─────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = { high: 0, medium: 1, new: 2 };

function sortTasks(tasks: TaskStored[]): TaskStored[] {
  return [...tasks].sort((a, b) => {
    const pw = (PRIORITY_WEIGHT[a.priority] ?? 2) - (PRIORITY_WEIGHT[b.priority] ?? 2);
    if (pw !== 0) return pw;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

// ─── Tab definition ───────────────────────────────────────────────────────────

type TabId = "today" | "week" | "overdue" | "nodate" | "assigned" | "all";

/** True when the current user created this task and delegated it to someone else. */
function isAssignedOut(task: TaskStored, userEmail: string | undefined): boolean {
  return Boolean(
    userEmail &&
      task.assignedBy === userEmail &&
      task.assignedTo &&
      task.assignedTo !== userEmail
  );
}

const selectCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20";
const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-400";

// ─── Section group in "All" view ──────────────────────────────────────────────

type AllSectionKey = DateBucket | "assigned";

interface SectionDef {
  key: AllSectionKey;
  label: string;
  headerCls: string;
  badgeCls: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TasksWidget({ config, onUpdateConfig }: WidgetRenderProps) {
  const { t } = useWidgetLanguage();
  const { user } = useAuth();
  const title = cfgString(config, "customTitle", t("tasksTitle", "Tasks & Reminders"));
  const newLabel = cfgString(config, "newTaskLabel", t("tasksAdd", "Add task"));

  const translatedTaskPresets = useMemo(
    () => [
      { id: "offer",    label: t("taskPresetOffer",    "Angebot nachfassen") },
      { id: "handover", label: t("taskPresetHandover", "Fahrzeug-Übergabe vorbereiten") },
      { id: "invoice",  label: t("taskPresetInvoice",  "Rechnung prüfen") },
      { id: "wash",     label: t("taskPresetWash",     "Waschtermin bestätigen") },
      { id: "callback", label: t("taskPresetCallback", "Kunde zurückrufen") },
      { id: "parts",    label: t("taskPresetParts",    "Ersatzteil bestellen") },
    ],
    [t]
  );

  const translatedPriorities = useMemo(
    () => [
      { id: "high",   label: t("tasksHigh",   "High"),   tagClass: "bg-red-100 text-red-700" },
      { id: "medium", label: t("tasksMedium", "Medium"), tagClass: "bg-amber-100 text-amber-800" },
      { id: "new",    label: t("tasksNew",    "New"),    tagClass: "bg-blue-100 text-blue-700" },
    ],
    [t]
  );

  const allSections = useMemo<SectionDef[]>(
    () => [
      { key: "overdue",  label: t("tabOverdue",       "Overdue"),      headerCls: "text-red-700",     badgeCls: "bg-red-100 text-red-700" },
      { key: "today",    label: t("tabToday",         "Today"),        headerCls: "text-blue-700",    badgeCls: "bg-blue-100 text-blue-700" },
      { key: "week",     label: t("tabWeek",          "This Week"),    headerCls: "text-amber-700",   badgeCls: "bg-amber-100 text-amber-700" },
      { key: "later",    label: t("tasksSectionLater","Later"),        headerCls: "text-violet-700",  badgeCls: "bg-violet-100 text-violet-700" },
      { key: "nodate",   label: t("tabNoDate",        "No Date"),      headerCls: "text-slate-600",   badgeCls: "bg-slate-100 text-slate-600" },
      { key: "assigned", label: t("tabAssigned",      "Assigned"),     headerCls: "text-emerald-700", badgeCls: "bg-emerald-100 text-emerald-700" },
    ],
    [t]
  );

  const fallback = useMemo(
    () => [
      { title: t("tasksItem1", "Angebot für Kunde Schmidt"), tag: t("tasksHigh","Hoch"), tagClass: "bg-red-100 text-red-700" },
      { title: t("tasksItem2", "Fahrzeug-Übergabe morgen 10:00"), tag: t("tasksMedium","Mittel"), tagClass: "bg-amber-100 text-amber-800" },
      { title: t("tasksItem3", "Rechnung #2847 prüfen"), tag: t("tasksNew","Neu"), tagClass: "bg-blue-100 text-blue-700" },
      { title: t("tasksItem4", "Waschtermin bestätigen"), tag: t("tasksMedium","Mittel"), tagClass: "bg-amber-100 text-amber-800" },
    ],
    [t]
  );

  const list = useMemo(() => getTasksFromConfig(config, fallback), [config, fallback]);

  const [teamMembers, setTeamMembers] = useState<{ email: string; name: string }[]>([]);
  useEffect(() => {
    const profiles = user ? listRegisteredUserProfiles(user.email) : listRegisteredUserProfiles();
    setTeamMembers(profiles);
  }, [user]);

  const persist = (next: TaskStored[]) => {
    onUpdateConfig?.({ taskItems: next, taskLines: undefined });
  };

  // ── bucketed counts (assigned-out tasks excluded from date buckets) ──
  const counts = useMemo(() => {
    const c: Record<DateBucket | "assigned", number> = {
      overdue: 0, today: 0, week: 0, later: 0, nodate: 0, assigned: 0,
    };
    for (const task of list) {
      if (task.done) continue;
      if (isAssignedOut(task, user?.email)) {
        c.assigned++;
      } else {
        c[getBucket(task.dueDate)]++;
      }
    }
    return c;
  }, [list, user]);

  // default tab: first non-empty bucket priority: overdue > today > week > nodate > assigned > all
  const defaultTab: TabId = useMemo(() => {
    if (counts.overdue > 0) return "overdue";
    if (counts.today > 0) return "today";
    if (counts.week > 0) return "week";
    if (counts.nodate > 0) return "nodate";
    if (counts.assigned > 0) return "assigned";
    return "all";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [collapsedSections, setCollapsedSections] = useState<Set<AllSectionKey>>(
    new Set<AllSectionKey>(["later", "nodate", "assigned"])
  );
  const [showDone, setShowDone] = useState(false);

  // ── form state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [formPreset, setFormPreset] = useState<string>(TASK_TITLE_PRESETS[0]!.id);
  const [formCustomTitle, setFormCustomTitle] = useState("");
  const [formPriority, setFormPriority] = useState<"high" | "medium" | "new">("medium");
  const [formAssignedTo, setFormAssignedTo] = useState("__self__");
  const [formDueDate, setFormDueDate] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formContextData, setFormContextData] = useState<ContextData>({});

  const resetForm = () => {
    setFormPreset(TASK_TITLE_PRESETS[0]!.id);
    setFormCustomTitle("");
    setFormPriority("medium");
    setFormAssignedTo("__self__");
    setFormDueDate(activeTab === "today" ? isoToday() : "");
    setFormNote("");
    setFormContextData({});
  };

  const openAdd = () => { setEditingId(null); resetForm(); setAdding(true); };

  const openEdit = (row: TaskStored) => {
    setAdding(false);
    setEditingId(row.id);
    setFormPreset(row.titlePresetId);
    setFormCustomTitle(row.customTitle ?? "");
    setFormPriority(row.priority);
    setFormAssignedTo(row.assignedTo ?? "__self__");
    setFormDueDate(row.dueDate ?? "");
    setFormNote(row.note ?? "");
    setFormContextData(row.contextData ?? {});
  };

  const cancelForm = () => { setAdding(false); setEditingId(null); };

  const saveForm = () => {
    const assignedToEmail = formAssignedTo === "__self__" ? undefined : formAssignedTo;
    const assignedToMember = teamMembers.find((m) => m.email === assignedToEmail);
    const resolvedTitle =
      formCustomTitle.trim() ||
      translatedTaskPresets.find((p) => p.id === formPreset)?.label ||
      t("tasksDefaultTitle", "Task");

    const existing = list.find((x) => x.id === editingId);
    // Strip empty values from contextData before saving
    const cleanedContext: ContextData = {};
    for (const [k, v] of Object.entries(formContextData)) {
      if (v?.trim()) cleanedContext[k] = v.trim();
    }
    const row: TaskStored = {
      id: editingId ?? `t-${Date.now()}`,
      titlePresetId: formPreset,
      priority: formPriority,
      customTitle: formCustomTitle.trim() || undefined,
      contextData: Object.keys(cleanedContext).length > 0 ? cleanedContext : undefined,
      assignedTo: assignedToEmail,
      assignedToName: assignedToMember?.name,
      assignedBy: user?.email,
      assignedByName: user?.name,
      dueDate: formDueDate || undefined,
      note: formNote.trim() || undefined,
      done: existing?.done ?? false,
    };

    persist(editingId ? list.map((x) => (x.id === editingId ? row : x)) : [...list, row]);

    if (user && assignedToEmail && assignedToEmail !== user.email) {
      addTaskNotification({
        taskTitle: resolvedTitle,
        assignedBy: user.email,
        assignedByName: user.name,
        assignedTo: assignedToEmail,
        timestamp: new Date().toISOString(),
      });
    }
    cancelForm();
  };

  const remove = (id: string) => {
    persist(list.filter((x) => x.id !== id));
    if (editingId === id) cancelForm();
  };

  const toggleDone = (id: string) => {
    persist(list.map((x) => (x.id === id ? { ...x, done: !x.done } : x)));
  };

  const toggleSection = (b: AllSectionKey) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(b) ? next.delete(b) : next.add(b);
      return next;
    });
  };

  const canEdit = Boolean(onUpdateConfig);
  const isFormOpen = adding || !!editingId;

  // ── filtered list for current tab ──
  const visibleTasks = useMemo(() => {
    let base: TaskStored[];
    if (activeTab === "all") {
      base = list;
    } else if (activeTab === "assigned") {
      base = list.filter((task) => isAssignedOut(task, user?.email));
    } else {
      // date tabs: exclude assigned-out tasks
      base = list.filter(
        (task) => !isAssignedOut(task, user?.email) && getBucket(task.dueDate) === activeTab
      );
    }
    if (!showDone) base = base.filter((t) => !t.done);
    return sortTasks(base);
  }, [list, activeTab, showDone, user]);

  // ── grouped for "all" view ──
  const grouped = useMemo(() => {
    if (activeTab !== "all") return null;
    const map = new Map<AllSectionKey, TaskStored[]>();
    for (const s of allSections) map.set(s.key, []);
    for (const task of visibleTasks) {
      if (isAssignedOut(task, user?.email)) {
        map.get("assigned")?.push(task);
      } else {
        const b = getBucket(task.dueDate);
        map.get(b)?.push(task);
      }
    }
    return map;
  }, [activeTab, visibleTasks, user, allSections]);

  const doneCnt = list.filter((t) => t.done).length;
  const totalActive = list.filter((t) => !t.done).length;

  // ── tab definitions ──
  const tabs: { id: TabId; label: string; count: number; dotCls?: string }[] = [
    { id: "today",    label: t("tabToday",    "Today"),     count: counts.today,    dotCls: "bg-blue-500" },
    { id: "week",     label: t("tabWeek",     "This Week"), count: counts.week,     dotCls: "bg-amber-500" },
    { id: "overdue",  label: t("tabOverdue",  "Overdue"),   count: counts.overdue,  dotCls: "bg-red-500" },
    { id: "nodate",   label: t("tabNoDate",   "No Date"),   count: counts.nodate,   dotCls: "bg-slate-400" },
    { id: "assigned", label: t("tabAssigned", "Assigned"),  count: counts.assigned, dotCls: "bg-emerald-500" },
    { id: "all",      label: t("tabAll",      "All"),       count: totalActive },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h2 className="truncate text-base font-bold text-slate-800">{title}</h2>
        <div className="flex shrink-0 items-center gap-1.5">
          {doneCnt > 0 && (
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                showDone
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              <Check className="mr-0.5 inline h-3 w-3" />
              {doneCnt}
            </button>
          )}
          {canEdit && !isFormOpen && (
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              <Plus className="h-3 w-3" />
              {newLabel}
            </button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ── */}
      <div className="mb-2 flex shrink-0 gap-1 overflow-x-auto pb-0.5">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition ${
                active
                  ? tab.id === "assigned"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : tab.id === "overdue"
                    ? "bg-red-600 text-white shadow-sm"
                    : "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
              }`}
            >
              {tab.id !== "all" && tab.dotCls && (
                <span className={`h-1.5 w-1.5 rounded-full ${tab.dotCls}`} />
              )}
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    active
                      ? "bg-white/20 text-white"
                      : tab.id === "overdue"
                      ? "bg-red-100 text-red-700"
                      : tab.id === "assigned"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-white text-slate-600 shadow-sm"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Task list ── */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {visibleTasks.length === 0 && activeTab !== "all" && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <CalendarDays className="h-8 w-8 text-slate-200" />
            <p className="text-sm font-medium text-slate-400">
              {activeTab === "today"    ? t("tasksEmptyToday",    "No tasks for today") :
               activeTab === "overdue"  ? t("tasksEmptyOverdue",  "No overdue tasks") :
               activeTab === "assigned" ? t("tasksEmptyAssigned", "No assigned tasks") :
               t("tasksEmptyState", "No tasks yet")}
            </p>
          </div>
        )}

        {/* Flat list for single-bucket tabs */}
        {activeTab !== "all" && visibleTasks.length > 0 && (
          <ul className="space-y-1.5">
            {visibleTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                user={user}
                canEdit={canEdit}
                onEdit={openEdit}
                onRemove={remove}
                onToggleDone={toggleDone}
                t={t}
                translatedTaskPresets={translatedTaskPresets}
                translatedPriorities={translatedPriorities}
              />
            ))}
          </ul>
        )}

        {/* Grouped sections for "All" tab */}
        {activeTab === "all" && (
          <div className="space-y-1">
            {grouped && allSections.map((sec) => {
              const tasks = grouped.get(sec.key) ?? [];
              if (tasks.length === 0) return null;
              const collapsed = collapsedSections.has(sec.key);
              return (
                <div key={sec.key}>
                  {/* Section header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(sec.key)}
                    className="flex w-full items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-slate-50"
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${sec.headerCls}`}>
                      {sec.label}
                    </span>
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${sec.badgeCls}`}>
                      {tasks.length}
                    </span>
                    <span className="ml-auto text-slate-400">
                      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                  {!collapsed && (
                    <ul className="mt-0.5 space-y-1.5 pl-1">
                      {tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          user={user}
                          canEdit={canEdit}
                          onEdit={openEdit}
                          onRemove={remove}
                          onToggleDone={toggleDone}
                          t={t}
                          translatedTaskPresets={translatedTaskPresets}
                          translatedPriorities={translatedPriorities}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {/* Empty all */}
            {visibleTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <CalendarDays className="h-8 w-8 text-slate-200" />
                <p className="text-sm font-medium text-slate-400">{t("tasksEmptyState", "No tasks yet")}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add / Edit form ── */}
      {isFormOpen && canEdit && (
        <div className="mt-2 shrink-0 space-y-2.5 rounded-xl border border-blue-100 bg-gradient-to-b from-blue-50/60 to-slate-50/40 p-3 shadow-sm">
          <p className="text-xs font-bold text-slate-700">
            {editingId ? t("tasksFormEdit", "Edit task") : t("tasksFormNew", "New task")}
          </p>

          {/* Task type */}
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t("tasksFieldTitle", "Task type")}
            </label>
            <select
              className={selectCls}
              value={formPreset}
              onChange={(e) => {
                setFormPreset(e.target.value);
                setFormContextData({});
              }}
            >
              {translatedTaskPresets.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Context-specific DB-backed fields */}
          <TaskContextFields
            preset={formPreset}
            contextData={formContextData}
            onChange={setFormContextData}
            inputCls={inputCls}
            labelCls="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500"
          />

          {/* Custom title override */}
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t("tasksCustomTitle", "Custom title")}{" "}
              <span className="font-normal normal-case text-slate-400">{t("optionalLabel", "(optional)")}</span>
            </label>
            <input
              className={inputCls}
              type="text"
              placeholder={t("tasksCustomTitlePlaceholder", "Custom title…")}
              value={formCustomTitle}
              onChange={(e) => setFormCustomTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Priority */}
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t("tasksFieldPriority", "Priority")}
              </label>
              <select
                className={selectCls}
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as "high" | "medium" | "new")}
              >
                {translatedPriorities.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t("tasksDueDate", "Due date")}
              </label>
              <input
                className={inputCls}
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Assign to */}
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t("tasksAssignTo", "Assign to")}
            </label>
            <select
              className={selectCls}
              value={formAssignedTo}
              onChange={(e) => setFormAssignedTo(e.target.value)}
            >
              <option value="__self__">{t("tasksAssignSelf", "— Myself —")}</option>
              {teamMembers.map((m) => (
                <option key={m.email} value={m.email}>{m.name} ({m.email})</option>
              ))}
            </select>
            {formAssignedTo !== "__self__" && (
              <p className="mt-0.5 text-[10px] text-blue-600">
                {t("tasksAssignNotif", "The assigned person will receive a notification.")}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t("tasksNote", "Note")}{" "}
              <span className="font-normal normal-case text-slate-400">{t("optionalLabel", "(optional)")}</span>
            </label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={2}
              placeholder={t("tasksNotePlaceholder", "Description or hint…")}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={saveForm}
              className="flex-1 rounded-lg bg-blue-600 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-95"
            >
              {t("commonSave", "Save")}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="flex-1 rounded-lg border border-slate-200 bg-white py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {t("commonCancel", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TaskRow sub-component ────────────────────────────────────────────────────

interface TaskRowProps {
  task: TaskStored;
  user: { email: string; name: string } | null;
  canEdit: boolean;
  onEdit: (t: TaskStored) => void;
  onRemove: (id: string) => void;
  onToggleDone: (id: string) => void;
  t: (key: string, fallback?: string) => string;
  translatedTaskPresets: { id: string; label: string }[];
  translatedPriorities: { id: string; label: string; tagClass: string }[];
}

function TaskRow({ task, user, canEdit, onEdit, onRemove, onToggleDone, t, translatedTaskPresets, translatedPriorities }: TaskRowProps) {
  const presetLabel = translatedTaskPresets.find((p) => p.id === task.titlePresetId)?.label;
  const priority = translatedPriorities.find((p) => p.id === task.priority) ?? translatedPriorities[1]!;
  // subtitle comes from taskDisplay (reads contextData) — title stays localised
  const subtitle = taskDisplay(task).subtitle;
  const d = {
    title: task.customTitle ?? presetLabel ?? t("tasksDefaultTitle", "Task"),
    subtitle,
    tag: priority.label,
    tagClass: priority.tagClass,
  };
  const isAssignedToMe = user && task.assignedTo === user.email;
  const isAssignedByMe =
    user && task.assignedBy === user.email && task.assignedTo && task.assignedTo !== user.email;
  const bucket = getBucket(task.dueDate);
  const isOverdue = bucket === "overdue" && !task.done;

  return (
    <li
      className={`group rounded-xl border px-3 py-2 transition-colors ${
        task.done
          ? "border-slate-100 bg-slate-50/40 opacity-60"
          : isAssignedToMe
          ? "border-blue-200 bg-blue-50/60 shadow-sm shadow-blue-100"
          : isOverdue
          ? "border-red-200 bg-red-50/40"
          : "border-slate-100 bg-slate-50/60 hover:border-slate-200"
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Done checkbox */}
        {canEdit && (
          <button
            type="button"
            onClick={() => onToggleDone(task.id)}
            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
              task.done
                ? "border-emerald-400 bg-emerald-500 text-white"
                : "border-slate-300 bg-white hover:border-emerald-400"
            }`}
            title={task.done ? t("tasksMarkUndone", "Mark as open") : t("tasksMarkDone", "Mark as done")}
          >
            {task.done && <Check className="h-2.5 w-2.5" />}
          </button>
        )}

        {/* Content */}
        <div className="min-w-0 flex-1">
          <span
            className={`block text-xs font-semibold leading-snug ${
              task.done ? "line-through text-slate-400" : "text-slate-700"
            }`}
          >
            {d.title}
          </span>
          {d.subtitle && !task.done && (
            <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">
              {d.subtitle}
            </span>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${d.tagClass}`}>
              {d.tag}
            </span>

            {task.dueDate && (
              <span
                className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  isOverdue
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {isOverdue ? <Clock className="h-2.5 w-2.5 shrink-0" /> : <CalendarDays className="h-2.5 w-2.5 shrink-0" />}
                {formatDueDate(task.dueDate, t)}
              </span>
            )}

            {isAssignedToMe && task.assignedByName && (
              <span className="flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                <UserCheck className="h-2.5 w-2.5 shrink-0" />
                {task.assignedByName}
              </span>
            )}

            {isAssignedByMe && task.assignedToName && (
              <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                <User className="h-2.5 w-2.5 shrink-0" />
                → {task.assignedToName}
              </span>
            )}
          </div>

          {task.note && !task.done && (
            <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-400">{task.note}</p>
          )}
        </div>

        {/* Actions */}
        {canEdit && (
          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="rounded p-1 text-slate-400 transition hover:bg-white hover:text-blue-600"
              title={t("commonEdit", "Edit")}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(task.id)}
              className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              title={t("commonRemove", "Remove")}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
