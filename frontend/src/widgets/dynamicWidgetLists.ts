import { parseAppointmentLines, parseMeetingLines, parseTaskLines, parseTodoLines } from "./parseLineFormats";
import { TASK_PRIORITIES, TASK_TITLE_PRESETS, TODO_PRESETS } from "./widgetListPresets";

export type AppointmentStored = {
  id: string;
  /** ISO date string YYYY-MM-DD — defaults to today if absent (legacy) */
  date?: string;
  /** HH:MM 24-hour time */
  time: string;
  /** Duration in minutes (default 60) */
  duration?: number;
  activityId: string;
  customerNr: string;
  note?: string;
  /** From legacy text import until user saves from form */
  legacyTitle?: string;
};

export type MeetingStored = {
  id: string;
  time: string;
  topicId: string;
  roomId: string;
  legacyTitle?: string;
  legacyRoom?: string;
};

export type TaskStored = {
  id: string;
  titlePresetId: string;
  priority: "high" | "medium" | "new";
  customTitle?: string;
  /** Email of the user this task is assigned to (undefined = assigned to self). */
  assignedTo?: string;
  assignedToName?: string;
  /** Email/name of whoever created/assigned this task. */
  assignedBy?: string;
  assignedByName?: string;
  /** ISO date string YYYY-MM-DD */
  dueDate?: string;
  note?: string;
  /** Marked complete by the user. */
  done?: boolean;
  /**
   * Context-specific structured fields keyed by preset.
   * e.g. { firmenname, angebot_nr } for "offer",
   *      { rechn_nr, firmenname } for "invoice", etc.
   */
  contextData?: Record<string, string>;
};

export type TodoStored = {
  id: string;
  templateId: string;
  done: boolean;
  customText?: string;
};

const DEF_APPT = [
  { time: "09:00", title: "Kundenberatung — Weber GmbH" },
  { time: "11:30", title: "Fahrzeugabholung — BMW X3" },
  { time: "15:00", title: "Team-Meeting Verkauf" },
];

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getAppointmentsFromConfig(config: Record<string, unknown>): AppointmentStored[] {
  const raw = config.appointments;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x, i) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        if (typeof o.id === "string" && typeof o.time === "string") {
          return {
            id: o.id,
            date: typeof o.date === "string" ? o.date : undefined,
            time: o.time,
            duration: typeof o.duration === "number" ? o.duration : 60,
            activityId: typeof o.activityId === "string" ? o.activityId : "consult",
            customerNr: typeof o.customerNr === "string" ? o.customerNr : "",
            note: typeof o.note === "string" ? o.note : undefined,
            legacyTitle: typeof o.legacyTitle === "string" ? o.legacyTitle : undefined,
          };
        }
      }
      return {
        id: genId("a"),
        time: "09:00",
        activityId: "consult",
        customerNr: "",
        legacyTitle: String(x),
      };
    });
  }
  return parseAppointmentLines(config.appointmentLines as string | undefined, DEF_APPT).map((ap, i) => ({
    id: genId("a"),
    time: ap.time,
    activityId: "internal",
    customerNr: "",
    legacyTitle: ap.title,
  }));
}

const DEF_MEET = [
  { time: "10:00", title: "Sprint Planning", room: "Zoom" },
  { time: "14:00", title: "Kunden-Call Schmidt", room: "Teams" },
  { time: "16:30", title: "Review Verkauf", room: "Zoom" },
];

export function getMeetingsFromConfig(config: Record<string, unknown>): MeetingStored[] {
  const raw = config.meetings;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        if (typeof o.id === "string" && typeof o.time === "string") {
          return {
            id: o.id,
            time: o.time,
            topicId: typeof o.topicId === "string" ? o.topicId : "sales",
            roomId: typeof o.roomId === "string" ? o.roomId : "zoom",
            legacyTitle: typeof o.legacyTitle === "string" ? o.legacyTitle : undefined,
            legacyRoom: typeof o.legacyRoom === "string" ? o.legacyRoom : undefined,
          };
        }
      }
      return {
        id: genId("m"),
        time: "10:00",
        topicId: "sales",
        roomId: "zoom",
        legacyTitle: String(x),
      };
    });
  }
  return parseMeetingLines(config.meetingLines as string | undefined, DEF_MEET).map((m) => ({
    id: genId("m"),
    time: m.time,
    topicId: "customer",
    roomId: m.room.toLowerCase().includes("teams") ? "teams" : "zoom",
    legacyTitle: m.title,
    legacyRoom: m.room,
  }));
}

export function getTasksFromConfig(
  config: Record<string, unknown>,
  fallbackTitles: { title: string; tag: string; tagClass: string }[]
): TaskStored[] {
  const raw = config.taskItems;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const pr = o.priority;
        const priority =
          pr === "high" || pr === "medium" || pr === "new" ? pr : "medium";
        return {
          id: typeof o.id === "string" ? o.id : genId("t"),
          titlePresetId: typeof o.titlePresetId === "string" ? o.titlePresetId : "offer",
          priority,
          customTitle: typeof o.customTitle === "string" ? o.customTitle : undefined,
          assignedTo: typeof o.assignedTo === "string" ? o.assignedTo : undefined,
          assignedToName: typeof o.assignedToName === "string" ? o.assignedToName : undefined,
          assignedBy: typeof o.assignedBy === "string" ? o.assignedBy : undefined,
          assignedByName: typeof o.assignedByName === "string" ? o.assignedByName : undefined,
          dueDate: typeof o.dueDate === "string" ? o.dueDate : undefined,
          note: typeof o.note === "string" ? o.note : undefined,
          done: Boolean(o.done),
          contextData:
            o.contextData != null && typeof o.contextData === "object" && !Array.isArray(o.contextData)
              ? (o.contextData as Record<string, string>)
              : undefined,
        };
      }
      return { id: genId("t"), titlePresetId: "offer", priority: "medium" as const };
    });
  }
  return parseTaskLines(config.taskLines as string | undefined, fallbackTitles).map((row, i) => ({
    id: genId("t"),
    titlePresetId: "offer",
    priority: row.tagClass.includes("red") ? "high" : row.tagClass.includes("blue") ? "new" : "medium",
    customTitle: row.title,
  }));
}

/** Build a readable context suffix from structured contextData (no labels, just values). */
function buildContextSuffix(titlePresetId: string, ctx: Record<string, string> | undefined): string {
  if (!ctx) return "";
  const v = (key: string) => ctx[key]?.trim() || "";
  switch (titlePresetId) {
    case "offer": {
      const parts = [v("firmenname"), v("angebot_nr") ? `[${v("angebot_nr")}]` : ""].filter(Boolean);
      return parts.join(" ");
    }
    case "handover": {
      const vehicle = [v("fabrikat"), v("typ")].filter(Boolean).join(" ");
      const parts = [v("firmenname"), vehicle].filter(Boolean);
      return parts.join(" — ");
    }
    case "invoice": {
      const parts = [v("rechn_nr") ? `#${v("rechn_nr")}` : "", v("firmenname")].filter(Boolean);
      return parts.join(" · ");
    }
    case "wash": {
      const parts = [v("firmenname"), v("kennzeichen") ? `(${v("kennzeichen")})` : ""].filter(Boolean);
      return parts.join(" ");
    }
    case "callback": {
      const parts = [v("firmenname"), v("telefonnummer")].filter(Boolean);
      return parts.join(" · ");
    }
    case "parts": {
      const parts = [v("part_name"), v("firmenname") ? `(${v("firmenname")})` : ""].filter(Boolean);
      return parts.join(" ");
    }
    default:
      return Object.values(ctx).filter(Boolean).slice(0, 2).join(" · ");
  }
}

export function taskDisplay(row: TaskStored): { title: string; subtitle: string; tag: string; tagClass: string } {
  const preset = TASK_TITLE_PRESETS.find((p) => p.id === row.titlePresetId);
  const presetLabel = preset?.label ?? "Aufgabe";
  const subtitle = buildContextSuffix(row.titlePresetId, row.contextData);
  const title = row.customTitle || presetLabel;
  const pr = TASK_PRIORITIES.find((p) => p.id === row.priority) ?? TASK_PRIORITIES[1];
  return { title, subtitle, tag: pr.label, tagClass: pr.tagClass };
}

export function getTodosFromConfig(config: Record<string, unknown>): TodoStored[] {
  const raw = config.todoItems;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        return {
          id: typeof o.id === "string" ? o.id : genId("d"),
          templateId: typeof o.templateId === "string" ? o.templateId : TODO_PRESETS[0]!.id,
          done: Boolean(o.done),
          customText: typeof o.customText === "string" ? o.customText : undefined,
        };
      }
      return { id: genId("d"), templateId: TODO_PRESETS[0]!.id, done: false };
    });
  }
  return parseTodoLines(config.todoLines as string | undefined).map((it) => {
    const match = TODO_PRESETS.find((p) => p.label === it.text);
    return {
      id: it.id,
      templateId: match?.id ?? "custom",
      done: it.done,
      customText: match ? undefined : it.text,
    };
  });
}

export function todoDisplay(row: TodoStored): string {
  if (row.templateId === "custom" && row.customText) return row.customText;
  return TODO_PRESETS.find((p) => p.id === row.templateId)?.label ?? "To-do";
}
