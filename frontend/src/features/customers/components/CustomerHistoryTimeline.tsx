import { ClipboardList } from "lucide-react";
import type { KundenHistoryEntry } from "../../../types/kunden";
import { formatHistoryValueDisplay } from "../utils/historyFieldDisplay";

type Props = {
  historyEntries: KundenHistoryEntry[];
  localeTag: string;
  t: (key: string, fallback: string) => string;
};

export function CustomerHistoryTimeline({ historyEntries, localeTag, t }: Props) {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="customers-modal-genz-frost-card flex items-start gap-3 rounded-2xl border border-white/60 p-4">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            {t("historyTimelineTitle", "Activity timeline")}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {t(
              "historyTimelineHint",
              "Newest first. Each update lists what changed from the previous saved value to the new one."
            )}
          </p>
        </div>
      </div>
      {historyEntries.length === 0 ? (
        <div className="customers-modal-genz-frost-card flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/50 py-16 text-center">
          <svg
            className="mb-3 h-8 w-8 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <p className="text-sm text-slate-400">{t("historyEmpty", "No entries yet.")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyEntries.map((entry) => {
            const actionLabel =
              entry.action === "created"
                ? t("historyActionCreated", "Created")
                : entry.action === "updated"
                  ? t("historyActionUpdated", "Updated")
                  : entry.action === "deleted"
                    ? t("historyActionDeleted", "Deleted")
                    : t("historyActionRestored", "Restored");
            const actionColor =
              entry.action === "created"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : entry.action === "updated"
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : entry.action === "deleted"
                    ? "bg-red-100 text-red-700 border-red-200"
                    : "bg-violet-100 text-violet-700 border-violet-200";
            const dotColor =
              entry.action === "created"
                ? "bg-emerald-500"
                : entry.action === "updated"
                  ? "bg-blue-500"
                  : entry.action === "deleted"
                    ? "bg-red-500"
                    : "bg-violet-500";
            const dateStr = new Date(entry.timestamp).toLocaleString(localeTag, {
              dateStyle: "short",
              timeStyle: "medium",
            });
            const initials = entry.editor_name
              ? entry.editor_name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "?";
            return (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ring-2 ring-white ${dotColor}`} />
                  <div className="mt-1 w-px flex-1 bg-slate-200" />
                </div>
                <div className="customers-modal-genz-frost-card mb-1 flex-1 overflow-hidden rounded-2xl border border-white/60">
                  <div className="flex flex-wrap items-center gap-3 border-b border-white/40 bg-white/35 px-4 py-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {entry.editor_name ?? t("historyUnknownUser", "Unknown")}
                      </p>
                      {entry.editor_email && (
                        <p className="truncate text-xs text-slate-400">{entry.editor_email}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${actionColor}`}
                    >
                      {actionLabel}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-400 tabular-nums">
                      {dateStr}
                    </span>
                  </div>
                  {entry.changes && entry.changes.length > 0 ? (
                    <div className="px-2 py-2 sm:px-3">
                      <div className="mb-1 hidden gap-2 border-b border-slate-100 pb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:grid sm:grid-cols-[minmax(0,11rem)_1fr_2rem_1fr]">
                        <span>{t("historyColField", "Field")}</span>
                        <span>{t("historyColBefore", "Before")}</span>
                        <span className="text-center" aria-hidden>
                          →
                        </span>
                        <span>{t("historyColAfter", "After")}</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {entry.changes.map((c, cIdx) => {
                          const multiline =
                            c.field === "vies_snapshot" ||
                            c.from.includes("\n") ||
                            c.to.includes("\n");
                          const cellClass = multiline
                            ? "max-w-full min-w-0 whitespace-pre-wrap break-words rounded px-1.5 py-1 font-mono text-[11px] leading-snug"
                            : "rounded px-1.5 py-1 font-mono text-[11px]";
                          return (
                            <div
                              key={`${entry.id}-${cIdx}-${c.field}`}
                              className="space-y-2 py-2 text-xs sm:grid sm:grid-cols-[minmax(0,11rem)_1fr_2rem_1fr] sm:items-start sm:gap-2 sm:space-y-0"
                            >
                              <span className="block font-semibold text-slate-600 sm:pt-0.5">
                                {t(c.labelKey, c.field)}
                              </span>
                              <div className="min-w-0 sm:min-h-0">
                                <span className="text-[10px] font-semibold uppercase text-slate-400 sm:hidden">
                                  {t("historyColBefore", "Before")}{" "}
                                </span>
                                {c.from ? (
                                  <span
                                    className={`${cellClass} inline-block bg-red-50 text-red-700 line-through`}
                                  >
                                    {formatHistoryValueDisplay(c.field, c.from, t)}
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400">{t("historyEmpty2", "empty")}</span>
                                )}
                              </div>
                              <span className="hidden text-center text-slate-400 sm:block sm:pt-1" aria-hidden>
                                →
                              </span>
                              <div className="min-w-0">
                                <span className="text-[10px] font-semibold uppercase text-slate-400 sm:hidden">
                                  {t("historyColAfter", "After")}{" "}
                                </span>
                                {c.to ? (
                                  <span
                                    className={`${cellClass} inline-block bg-emerald-50 text-emerald-800`}
                                  >
                                    {formatHistoryValueDisplay(c.field, c.to, t)}
                                  </span>
                                ) : (
                                  <span className="italic text-slate-400">{t("historyEmpty2", "empty")}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    entry.action === "updated" && (
                      <p className="px-4 py-2 text-xs italic text-slate-400">
                        {t("historyNoFieldChanges", "No tracked fields changed.")}
                      </p>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
