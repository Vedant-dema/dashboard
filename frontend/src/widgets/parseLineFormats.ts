import { DEFAULT_TODO_ITEMS } from "./defaultWidgetData";

const TAG_BY_PRI: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-800",
  new: "bg-blue-100 text-blue-700",
  low: "bg-slate-100 text-slate-700",
};

export function parseTodoLines(raw: string | undefined): { id: string; text: string; done: boolean }[] {
  if (!raw?.trim()) return DEFAULT_TODO_ITEMS;
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const done = /^\[x\]\s*/i.test(line);
    const text = line.replace(/^\[x\]\s*/i, "").trim();
    return { id: `t-${i}`, text, done };
  });
}

export function parseTaskLines(
  raw: string | undefined,
  fallback: { title: string; tag: string; tagClass: string }[]
): { title: string; tag: string; tagClass: string }[] {
  if (!raw?.trim()) return fallback;
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    const title = parts[0] ?? "";
    const tag = parts[1] ?? "—";
    const pri = (parts[2] ?? "medium").toLowerCase();
    const tagClass = TAG_BY_PRI[pri] ?? TAG_BY_PRI.medium;
    return { title, tag, tagClass };
  });
}

export function parseAppointmentLines(
  raw: string | undefined,
  fallback: { time: string; title: string }[]
): { time: string; title: string }[] {
  if (!raw?.trim()) return fallback;
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [time, ...rest] = line.split("|").map((p) => p.trim());
      return { time: time ?? "", title: rest.join(" | ") || "—" };
    });
}

export function parseMeetingLines(
  raw: string | undefined,
  fallback: { time: string; title: string; room: string }[]
): { time: string; title: string; room: string }[] {
  if (!raw?.trim()) return fallback;
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      return {
        time: parts[0] ?? "",
        title: parts[1] ?? "—",
        room: parts[2] ?? "—",
      };
    });
}

export function parseTableConfig(
  headersRaw: string | undefined,
  rowsRaw: string | undefined,
  defaultHeaders: string[],
  defaultRows: string[][]
): { headers: string[]; rows: string[][] } {
  const headers = headersRaw?.trim()
    ? headersRaw.split(",").map((h) => h.trim()).filter(Boolean)
    : defaultHeaders;
  if (!rowsRaw?.trim()) return { headers: defaultHeaders, rows: defaultRows };
  const rows = rowsRaw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((c) => c.trim()));
  return { headers, rows };
}
