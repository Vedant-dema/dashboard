import { useEffect, useMemo, useState } from "react";
import { Clock3, LogIn, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useWidgetLanguage } from "./useWidgetLanguage";
import type { WidgetRenderProps } from "../types/dashboard";
import { cfgString } from "./widgetConfigHelpers";
import { loadPunchClock, punchInNow, punchOutNow, type PunchClockState } from "../store/punchClockStore";
import { useProfileAvatarDataUrl } from "../hooks/useProfileAvatar";
import {
  profileExtraMatchesSession,
  resolveDisplayName,
  useProfileExtraSettings,
} from "../hooks/useProfileExtraSettings";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function formatTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "—";
  }
}

export function ProfileModuleWidget({ config }: WidgetRenderProps) {
  const { user } = useAuth();
  const avatarDataUrl = useProfileAvatarDataUrl();
  const profileExtra = useProfileExtraSettings();
  const { t, localeTag } = useWidgetLanguage();
  const [now, setNow] = useState(() => new Date());
  const [punch, setPunch] = useState<PunchClockState>(() => loadPunchClock());
  const locale = localeTag;
  const customTitle = cfgString(config, "customTitle", "");
  const footnote = cfgString(config, "profileFootnote", "");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const sync = () => setPunch(loadPunchClock());
    window.addEventListener("dema-punch-changed", sync);
    return () => window.removeEventListener("dema-punch-changed", sync);
  }, []);

  const todayFullLabel = useMemo(
    () =>
      now.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [now, locale]
  );

  const timeLabel = useMemo(() => now.toLocaleTimeString(locale), [now, locale]);

  const name =
    resolveDisplayName(user?.email, user?.name, profileExtra) || t("commonUser", "Benutzer");
  const email = user?.email ?? "—";
  const initials = initialsFromName(name);
  const extraForUser = profileExtraMatchesSession(user?.email, profileExtra);
  const profileMeta = extraForUser
    ? [profileExtra.jobTitle.trim(), profileExtra.location.trim()].filter(Boolean).join(" · ")
    : "";

  const punchedIn = Boolean(punch.punchInIso && !punch.punchOutIso);
  const punchedOut = Boolean(punch.punchOutIso);
  const punchInLabel = formatTime(punch.punchInIso, locale);
  const punchOutLabel = formatTime(punch.punchOutIso, locale);

  const statusColor = punchedIn ? "bg-emerald-500" : punchedOut ? "bg-red-500" : "bg-slate-300";
  const statusText = punchedIn
    ? t("profilePunchInActive", "Eingestempelt")
    : punchedOut
      ? t("profilePunchOutDone", "Ausgestempelt")
      : t("profilePunchIdle", "Nicht eingestempelt");

  const openSettings = () => {
    window.location.hash = "#/settings";
  };

  return (
    <div className="glass-card flex h-full flex-col overflow-hidden p-5">
      {customTitle ? <h2 className="mb-3 text-sm font-bold text-slate-800">{customTitle}</h2> : null}
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-blue-600/25">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-900">{name}</p>
          <p className="truncate text-xs text-slate-500">{email}</p>
          {profileMeta ? <p className="mt-0.5 truncate text-[11px] text-slate-400">{profileMeta}</p> : null}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("profileToday", "Heute")}</p>
        <p className="mt-0.5 text-sm font-semibold capitalize text-slate-800">{todayFullLabel}</p>
        <p className="mt-1 text-xs tabular-nums text-slate-500">{timeLabel}</p>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
        <span className={`h-3 w-3 shrink-0 rounded-full ${statusColor} shadow-sm ring-2 ring-white`} aria-hidden />
        <span className="text-sm font-semibold text-slate-800">{statusText}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            punchInNow();
            setPunch(loadPunchClock());
          }}
          disabled={punchedIn}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn className="h-3.5 w-3.5" />
          {t("profilePunchIn", "Einstempeln")}
        </button>
        <button
          type="button"
          onClick={() => {
            punchOutNow();
            setPunch(loadPunchClock());
          }}
          disabled={!punchedIn}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("profilePunchOut", "Ausstempeln")}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("profilePunchInTime", "Einstempelzeit")}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{punchInLabel}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t("profilePunchOutTime", "Ausstempelzeit")}</p>
          <p className="mt-1 text-sm font-semibold tabular-nums text-slate-800">{punchOutLabel}</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
        <div className="flex items-center gap-2 rounded-lg bg-violet-50/70 px-2.5 py-2">
          <Mail className="h-3.5 w-3.5 text-violet-600" />
          <span className="truncate">{t("profileInternalComms", "Interne Kommunikation aktiv")}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50/70 px-2.5 py-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span className="truncate">{t("profileRoleVerified", "Rolle verifiziert")}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-blue-50/70 px-2.5 py-2">
          <Clock3 className="h-3.5 w-3.5 text-blue-600" />
          <span className="truncate">{t("profileLiveClock", "Live-Uhr (lokal)")}</span>
        </div>
      </div>

      {footnote ? <p className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-xs text-slate-600">{footnote}</p> : null}

      <div className="mt-auto pt-3">
        <button
          type="button"
          onClick={openSettings}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <UserRound className="h-3.5 w-3.5" />
          {t("profileOpenSettings", "Einstellungen öffnen")}
        </button>
      </div>
    </div>
  );
}
