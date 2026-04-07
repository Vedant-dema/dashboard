import type { ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  titleId?: string;
  title: string;
  modeBadge: string;
  kundenNrChip?: string | null;
  auditTrail: ReactNode;
  entryDateLabel: string;
  entryDateDisplay: string;
  onClose: () => void;
  closeLabel: string;
};

export function CustomerModalHeader({
  titleId = "new-kunde-title",
  title,
  modeBadge,
  kundenNrChip,
  auditTrail,
  entryDateLabel,
  entryDateDisplay,
  onClose,
  closeLabel,
}: Props) {
  return (
    <div className="relative flex shrink-0 flex-wrap items-start justify-between gap-4 bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 pr-14 text-white sm:flex-nowrap sm:px-6 sm:pr-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 id={titleId} className="text-lg font-bold tracking-tight sm:text-xl">
            {title}
          </h2>
          <span className="rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold text-blue-100">
            {modeBadge}
          </span>
          {kundenNrChip ? (
            <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-xs text-slate-300">
              #{kundenNrChip}
            </span>
          ) : null}
        </div>
        {auditTrail}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end sm:text-right">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{entryDateLabel}</p>
        <p className="text-sm font-semibold tabular-nums text-white">{entryDateDisplay}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 rounded-xl p-2 text-slate-300 hover:bg-white/10 hover:text-white"
        aria-label={closeLabel}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
