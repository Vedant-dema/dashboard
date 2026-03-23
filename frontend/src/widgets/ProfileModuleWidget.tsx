import { useEffect, useMemo, useState } from "react";
import { Clock3, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useWidgetLanguage } from "./useWidgetLanguage";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

export function ProfileModuleWidget() {
  const { user } = useAuth();
  const { t, localeTag } = useWidgetLanguage();
  const [now, setNow] = useState(() => new Date());
  const locale = localeTag;

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dayLabel = useMemo(
    () =>
      now.toLocaleDateString(locale, {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [now, locale]
  );

  const timeLabel = useMemo(() => now.toLocaleTimeString(locale), [now, locale]);

  const name = user?.name ?? t("commonUser", "Benutzer");
  const email = user?.email ?? "—";
  const initials = initialsFromName(name);

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-600/25">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{email}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("profileTime", "Zeit")}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{timeLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("profileStatus", "Status")}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t("profileActive", "Aktiv")}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50/70 px-2.5 py-2">
          <Clock3 className="h-3.5 w-3.5 text-blue-600" />
          <span className="truncate">{dayLabel}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-violet-50/70 px-2.5 py-2">
          <Mail className="h-3.5 w-3.5 text-violet-600" />
          <span className="truncate">{t("profileInternalComms", "Interne Kommunikation aktiv")}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/70 px-2.5 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="truncate">{t("profileRoleVerified", "Rolle verifiziert")}</span>
        </div>
      </div>

      <div className="mt-auto pt-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <UserRound className="h-3.5 w-3.5" />
          {t("profileOpen", "Profil öffnen")}
        </button>
      </div>
    </div>
  );
}

