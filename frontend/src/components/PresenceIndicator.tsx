import { Moon } from "lucide-react";
import type { PresenceStatus } from "../store/chatPresence";

type Props = {
  status: PresenceStatus;
  labelOnline: string;
  labelAway: string;
  labelOffline: string;
  /** Dot on avatar corner */
  variant?: "dot" | "inline";
  className?: string;
  /** Matches list row background so the ring blends (e.g. selected chat row). */
  dotBorderClass?: string;
};

export function PresenceIndicator({
  status,
  labelOnline,
  labelAway,
  labelOffline,
  variant = "dot",
  className = "",
  dotBorderClass = "border-[#111b21]",
}: Props) {
  const title =
    status === "online" ? labelOnline : status === "away" ? labelAway : labelOffline;

  if (variant === "inline") {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`} title={title}>
        {status === "online" && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-sm shadow-emerald-500/40" />}
        {status === "away" && (
          <Moon className="h-3.5 w-3.5 shrink-0 text-amber-400" strokeWidth={2} aria-hidden />
        )}
        {status === "offline" && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 shadow-sm shadow-red-900/30" />}
      </span>
    );
  }

  return (
    <span
      className={`absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 bg-[#111b21] ${dotBorderClass} ${className}`}
      title={title}
    >
      {status === "online" && <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />}
      {status === "away" && <Moon className="h-2.5 w-2.5 text-amber-400" strokeWidth={2.5} aria-hidden />}
      {status === "offline" && <span className="h-2.5 w-2.5 rounded-full bg-red-500" />}
    </span>
  );
}

/** Border color for thread header avatar (matches #202c33). */
export function PresenceIndicatorHeader(props: Omit<Props, "variant" | "className">) {
  const { status, labelOnline, labelAway, labelOffline } = props;
  const title =
    status === "online" ? labelOnline : status === "away" ? labelAway : labelOffline;
  return (
    <span
      className="absolute bottom-0 right-0 flex h-3 w-3 items-center justify-center rounded-full border-2 border-[#202c33] bg-[#202c33]"
      title={title}
    >
      {status === "online" && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
      {status === "away" && <Moon className="h-2 w-2 text-amber-400" strokeWidth={2.5} aria-hidden />}
      {status === "offline" && <span className="h-2 w-2 rounded-full bg-red-500" />}
    </span>
  );
}
