import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Bell,
  Briefcase,
  Camera,
  Globe2,
  KeyRound,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Phone,
  Shield,
  Smartphone,
  Sun,
  UserCog,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import {
  getStoredProfileAvatarDataUrl,
  readImageFileAsDataUrl,
  setStoredProfileAvatarDataUrl,
  useProfileAvatarDataUrl,
} from "../hooks/useProfileAvatar";
import {
  getProfileExtraSettings,
  mergeProfileExtraSettings,
  resolveDisplayName,
} from "../hooks/useProfileExtraSettings";

function Toggle({ checked = false, onToggle }: { checked?: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function CompactToggle({ checked = false, onToggle }: { checked?: boolean; onToggle?: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function initialsFromUserName(name: string | undefined): string {
  return (
    (name ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const { language, setLanguage, languageOptions, t } = useLanguage();
  const avatarDataUrl = useProfileAvatarDataUrl();
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    try {
      const raw = localStorage.getItem("dema-app-settings");
      if (raw) {
        const parsed = JSON.parse(raw) as { theme?: "light" | "dark" | "system" };
        if (parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system") {
          return parsed.theme;
        }
      }
    } catch {
      // ignore and fallback
    }
    return (document.documentElement.dataset.demaTheme as "light" | "dark" | undefined) === "dark"
      ? "dark"
      : "light";
  });
  const [dateFormat, setDateFormat] = useState("TT.MM.JJJJ");
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [roleProfile, setRoleProfile] = useState<"employee" | "manager">("employee");
  const [passwordUpdatedAt, setPasswordUpdatedAt] = useState<string>("");
  const [activeAction, setActiveAction] = useState<"password" | "rules" | "region" | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [quietHours, setQuietHours] = useState(false);
  const [region, setRegion] = useState<"de" | "intl">("de");
  const [notify, setNotify] = useState({
    sales: true,
    hrm: true,
    payroll: true,
    b2b: false,
    weeklyDigest: false,
  });
  const [hint, setHint] = useState<string | null>(null);
  const [activity, setActivity] = useState<string[]>([]);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileJobTitle, setProfileJobTitle] = useState("");
  const [showSessions, setShowSessions] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dema-app-settings");
      if (!raw) return;
      const s = JSON.parse(raw) as {
        theme?: "light" | "dark" | "system";
        dateFormat?: string;
        notify?: Partial<typeof notify>;
        mfaEnabled?: boolean;
        roleProfile?: string;
        passwordUpdatedAt?: string;
        quietHours?: boolean;
        region?: string;
        activity?: string[];
      };
      if (s.theme) setTheme(s.theme);
      if (s.dateFormat) setDateFormat(s.dateFormat);
      if (s.notify) {
        setNotify((prev) => ({
          ...prev,
          ...s.notify,
          weeklyDigest: typeof s.notify?.weeklyDigest === "boolean" ? s.notify.weeklyDigest : prev.weeklyDigest,
        }));
      }
      if (typeof s.mfaEnabled === "boolean") setMfaEnabled(s.mfaEnabled);
      if (s.roleProfile === "employee" || s.roleProfile === "manager") setRoleProfile(s.roleProfile);
      if (s.passwordUpdatedAt) setPasswordUpdatedAt(s.passwordUpdatedAt);
      if (typeof s.quietHours === "boolean") setQuietHours(s.quietHours);
      if (s.region === "de" || s.region === "intl") setRegion(s.region);
      if (Array.isArray(s.activity)) setActivity(s.activity.slice(0, 5));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!user?.email) return;
    const ex = getProfileExtraSettings();
    const sameAccount = ex.boundEmail.trim().toLowerCase() === user.email.trim().toLowerCase();
    if (sameAccount) {
      setProfileDisplayName(ex.name.trim() ? ex.name : user.name ?? "");
      setProfileLocation(ex.location.trim() ? ex.location : "Hamburg");
      setProfilePhone(ex.phone ?? "");
      setProfileJobTitle(ex.jobTitle ?? "");
    } else {
      setProfileDisplayName(user.name ?? "");
      setProfileLocation("Hamburg");
      setProfilePhone("");
      setProfileJobTitle("");
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "dema-app-settings",
        JSON.stringify({
          theme,
          language,
          dateFormat,
          notify,
          mfaEnabled,
          roleProfile,
          passwordUpdatedAt,
          quietHours,
          region,
          activity,
        })
      );
    } catch {
      // ignore
    }
  }, [theme, language, dateFormat, notify, mfaEnabled, roleProfile, passwordUpdatedAt, quietHours, region, activity]);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      root.dataset.demaTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme;
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  function ping(text: string) {
    setHint(text);
    setActivity((prev) => [text, ...prev].slice(0, 5));
    window.setTimeout(() => setHint(null), 1800);
  }

  function onAvatarFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void readImageFileAsDataUrl(file).then((res) => {
      if (!res.ok) {
        if (res.error === "size") {
          ping(t("settingsAvatarTooLarge", "Image must be under about 1.2 MB."));
        } else {
          ping(t("settingsAvatarInvalidType", "Please choose an image file (JPG, PNG, WebP, …)."));
        }
        return;
      }
      setStoredProfileAvatarDataUrl(res.dataUrl);
      if (getStoredProfileAvatarDataUrl() !== res.dataUrl) {
        ping(t("settingsAvatarSaveFailed", "Could not save photo. Try a smaller image."));
        return;
      }
      ping(t("settingsAvatarSaved", "Profile photo updated."));
    });
  }

  function clearAvatar() {
    setStoredProfileAvatarDataUrl(null);
    ping(t("settingsAvatarRemoved", "Profile photo removed."));
  }

  function saveProfileDetails() {
    const em = user?.email?.trim().toLowerCase() ?? "";
    mergeProfileExtraSettings({
      name: profileDisplayName.trim(),
      location: profileLocation.trim(),
      phone: profilePhone.trim(),
      jobTitle: profileJobTitle.trim(),
      boundEmail: em,
    });
    ping(t("settingsProfileDetailsSaved", "Profile details saved."));
  }

  function runSecurityAction(action: "password" | "2fa" | "roles" | "rules" | "region") {
    if (action === "password") {
      setActiveAction("password");
      return;
    }
    if (action === "2fa") {
      setMfaEnabled((prev) => !prev);
      ping(t("settingsHint2faToggled", mfaEnabled ? "2FA deactivated" : "2FA activated"));
      return;
    }
    if (action === "roles") {
      setRoleProfile((prev) => (prev === "employee" ? "manager" : "employee"));
      ping(t("settingsHintRoleUpdated", "Role profile updated"));
      window.location.hash = "#/hrm/rollen-rechte";
      return;
    }
    if (action === "rules") {
      setActiveAction("rules");
      return;
    }
    if (action === "region") {
      setActiveAction("region");
      return;
    }
  }

  function savePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      ping(t("settingsHintFillPasswordFields", "Please fill all password fields"));
      return;
    }
    if (newPassword.length < 6) {
      ping(t("settingsHintPasswordMinLength", "New password must be at least 6 characters"));
      return;
    }
    if (newPassword !== confirmPassword) {
      ping(t("settingsHintPasswordsMismatch", "Passwords do not match"));
      return;
    }
    const stamp = new Date().toLocaleString("de-DE");
    setPasswordUpdatedAt(stamp);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setActiveAction(null);
    ping(t("settingsHintPasswordUpdated", "Password updated successfully"));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-slate-50/70">
      <div className="border-b border-slate-200/80 bg-white/90 px-6 py-6 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{t("settingsTitle", "Einstellungen")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {t("settingsProfileAndSettingsHeadline", "Profil & Einstellungen")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {t(
              "settingsProfileAndSettingsSub",
              "Verwalten Sie Ihre persönlichen Daten, Sicherheit, Benachrichtigungen und Darstellung an einem Ort."
            )}
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-6 xl:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4">
          <h2 className="text-base font-bold text-slate-900">{t("settingsProfileAndAccount", "Profil & Konto")}</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("settingsProfilePhoto", "Profile photo")}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xl font-bold text-white shadow-md ring-2 ring-white">
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initialsFromUserName(
                      profileDisplayName.trim() ||
                        resolveDisplayName(user?.email, user?.name, getProfileExtraSettings())
                    )
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="sr-only"
                    onChange={onAvatarFileChange}
                  />
                  <button
                    type="button"
                    onClick={() => avatarFileRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {t("settingsUploadPhoto", "Upload photo")}
                  </button>
                  {avatarDataUrl ? (
                    <button
                      type="button"
                      onClick={clearAvatar}
                      className="text-left text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      {t("settingsRemovePhoto", "Remove photo")}
                    </button>
                  ) : null}
                  <p className="text-[11px] leading-snug text-slate-500">
                    {t("settingsProfilePhotoHint", "Shown on your dashboard profile widget and in the header.")}
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="profile-display-name">
                {t("settingsDisplayName", "Display name")}
              </label>
              <input
                id="profile-display-name"
                value={profileDisplayName}
                onChange={(e) => setProfileDisplayName(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                placeholder={user?.name ?? t("commonUser", "User")}
                autoComplete="name"
              />
              <p className="mt-1 text-[11px] text-slate-500">{t("settingsDisplayNameHint", "Shown in the header and on your dashboard profile.")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("commonEmail", "E-Mail")}</p>
              <p className="mt-1 font-semibold text-slate-800">{user?.email ?? "—"}</p>
              <p className="mt-1 text-[11px] text-slate-500">{t("settingsEmailReadOnly", "Sign-in email is managed by your administrator.")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="profile-location">
                {t("settingsLocation", "Standort")}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                <input
                  id="profile-location"
                  value={profileLocation}
                  onChange={(e) => setProfileLocation(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                  autoComplete="address-level2"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="profile-phone">
                {t("settingsPhone", "Telefon")}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                <input
                  id="profile-phone"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  type="tel"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                  autoComplete="tel"
                  placeholder={t("settingsPhonePlaceholder", "Optional")}
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="profile-job">
                {t("settingsJobTitle", "Position / Abteilung")}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                <input
                  id="profile-job"
                  value={profileJobTitle}
                  onChange={(e) => setProfileJobTitle(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/15"
                  placeholder={t("settingsJobTitlePlaceholder", "z. B. Sales, HR")}
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("settingsInternalId", "Interne ID")}</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Mail className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                EMP-1042
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{t("settingsInternalIdHint", "Demo — später aus dem Verzeichnisdienst.")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("settingsTimezone", "Timezone")}</p>
              <p className="mt-1 font-semibold text-slate-800">Europe/Berlin</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("settingsRoleProfile", "Role profile")}</p>
              <p className="mt-1 font-semibold text-slate-800">
                {roleProfile === "employee" ? t("settingsRoleEmployee", "Employee") : t("settingsRoleManager", "Manager")}
              </p>
            </div>
            <button
              type="button"
              onClick={saveProfileDetails}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              {t("settingsSaveProfile", "Profil speichern")}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-5">
          <h2 className="text-sm font-bold text-slate-900">{t("settingsNotifications", "Benachrichtigungen")}</h2>
          <div className="mt-2.5 space-y-1.5">
            {[
              { label: t("settingsNotifySalesAlerts", "Sales alerts"), enabled: notify.sales, onToggle: () => setNotify((s) => ({ ...s, sales: !s.sales })) },
              { label: t("settingsNotifyHrmApprovals", "HRM approvals"), enabled: notify.hrm, onToggle: () => setNotify((s) => ({ ...s, hrm: !s.hrm })) },
              { label: t("settingsNotifyPayrollErrors", "Payroll errors"), enabled: notify.payroll, onToggle: () => setNotify((s) => ({ ...s, payroll: !s.payroll })) },
              { label: t("settingsNotifyB2bLeads", "B2B leads"), enabled: notify.b2b, onToggle: () => setNotify((s) => ({ ...s, b2b: !s.b2b })) },
              {
                label: t("settingsNotifyWeeklyDigest", "Weekly summary email"),
                enabled: notify.weeklyDigest,
                onToggle: () => setNotify((s) => ({ ...s, weeklyDigest: !s.weeklyDigest })),
              },
            ].map(({ label, enabled, onToggle }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5"
              >
                <span className="min-w-0 text-xs font-medium leading-tight text-slate-700">{label}</span>
                <CompactToggle checked={enabled} onToggle={onToggle} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-6">
          <h2 className="text-base font-bold text-slate-900">{t("settingsDisplay", "Darstellung")}</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`rounded-xl border p-3 text-sm font-semibold ${
                theme === "light"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <Sun className="mx-auto mb-1.5 h-4 w-4" />
              {t("themeLight", "Light")}
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`rounded-xl border p-3 text-sm font-semibold ${
                theme === "dark"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <Moon className="mx-auto mb-1.5 h-4 w-4" />
              {t("themeDark", "Dark")}
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`rounded-xl border p-3 text-sm font-semibold ${
                theme === "system"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              <Monitor className="mx-auto mb-1.5 h-4 w-4" />
              {t("themeSystem", "System")}
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left">
              <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="language-select">
                {t("settingsLanguage", "Sprache")}
              </label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
                className="mt-2 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-800"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] text-slate-500">
                {t("settingsLanguageHelp", "Die ausgewählte Sprache wird im Dashboard angewendet.")}
              </p>
            </div>
            <button
              onClick={() => setDateFormat((v) => (v === "TT.MM.JJJJ" ? "DD/MM/YYYY" : "TT.MM.JJJJ"))}
              className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left hover:bg-slate-100"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("settingsDateFormat", "Date format")}</p>
              <p className="mt-1 font-semibold text-slate-800">{dateFormat}</p>
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-6">
          <h2 className="text-base font-bold text-slate-900">{t("settingsSecurity", "Sicherheit")}</h2>
          <div className="mt-4 space-y-3">
            {[
              { id: "password" as const, label: t("settingsActionChangePassword", "Change password"), Icon: KeyRound },
              { id: "2fa" as const, label: t("settingsActionManage2fa", "Manage 2FA"), Icon: Shield },
              { id: "roles" as const, label: t("settingsActionReviewRoles", "Review roles"), Icon: UserCog },
              { id: "rules" as const, label: t("settingsActionNotificationRules", "Notification rules"), Icon: Bell },
              { id: "region" as const, label: t("settingsActionLanguageRegion", "Language & region"), Icon: Globe2 },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => runSecurityAction(id)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <span>{label}</span>
                <Icon className="h-4 w-4 text-blue-600" />
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600">
            <p>{t("settings2faStatus", "2FA")}: <span className="font-semibold text-slate-800">{mfaEnabled ? t("commonOn", "On") : t("commonOff", "Off")}</span></p>
            <p className="mt-1">{t("settingsLastPasswordChange", "Last password change")}: <span className="font-semibold text-slate-800">{passwordUpdatedAt || t("settingsNever", "Never")}</span></p>
            <p className="mt-1">{t("settingsRegion", "Region")}: <span className="font-semibold text-slate-800">{region === "de" ? t("settingsRegionGermany", "Germany") : t("settingsRegionInternational", "International")}</span></p>
          </div>
          {hint ? (
            <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              {hint}
            </div>
          ) : null}
        </section>

        {activeAction === "password" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-6">
            <h2 className="text-base font-bold text-slate-900">{t("settingsUpdatePassword", "Passwort aktualisieren")}</h2>
            <div className="mt-4 space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t("settingsCurrentPassword", "Current password")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settingsNewPassword", "New password")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("settingsConfirmPassword", "Confirm password")}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={savePassword}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  {t("commonSave", "Speichern")}
                </button>
                <button
                  onClick={() => setActiveAction(null)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {t("commonClose", "Schliessen")}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeAction === "rules" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-6">
            <h2 className="text-base font-bold text-slate-900">{t("settingsNotificationRules", "Benachrichtigungsregeln")}</h2>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
              <span className="text-sm font-medium text-slate-700">{t("settingsQuietHours", "Ruhezeiten aktivieren (22:00 - 07:00)")}</span>
              <Toggle checked={quietHours} onToggle={() => setQuietHours((v) => !v)} />
            </div>
            <button
              onClick={() => {
                setActiveAction(null);
                ping(t("settingsHintNotificationRulesSaved", "Notification rules saved"));
              }}
              className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {t("commonApply", "Anwenden")}
            </button>
          </section>
        ) : null}

        {activeAction === "region" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-6">
            <h2 className="text-base font-bold text-slate-900">{t("settingsLanguageRegion", "Sprache & Region")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setRegion("de")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  region === "de"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {t("settingsRegionGermany", "Germany")}
              </button>
              <button
                onClick={() => setRegion("intl")}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  region === "intl"
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {t("settingsRegionInternational", "International")}
              </button>
            </div>
            <button
              onClick={() => {
                setActiveAction(null);
                ping(t("settingsHintRegionSaved", "Region settings saved"));
              }}
              className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              {t("commonSave", "Speichern")}
            </button>
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-12">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" aria-hidden />
            <h2 className="text-base font-bold text-slate-900">{t("settingsSessionsDevices", "Sitzungen & Geräte")}</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {t("settingsSessionsIntro", "Geräte, die kürzlich mit diesem Konto verwendet wurden (Demo).")}
          </p>
          <button
            type="button"
            onClick={() => setShowSessions((v) => !v)}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            {showSessions ? t("settingsHideSessions", "Sitzungen ausblenden") : t("settingsShowSessions", "Sitzungen anzeigen")}
          </button>
          {showSessions ? (
            <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              {[
                { device: "Windows · Chrome", when: t("settingsSessionNow", "Jetzt aktiv"), where: profileLocation || "Hamburg" },
                { device: "Android · Chrome", when: t("settingsSessionToday", "Heute, 08:12"), where: profileLocation || "Hamburg" },
              ].map((s) => (
                <div
                  key={s.device}
                  className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-semibold text-slate-800">{s.device}</span>
                  <span className="text-slate-500">{s.when}</span>
                  <span className="text-slate-500">{s.where}</span>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-slate-500">{t("settingsSessionsDemoNote", "Abmeldung einzelner Sitzungen folgt mit Backend-Anbindung.")}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-12">
          <h2 className="text-base font-bold text-slate-900">{t("settingsLiveActivity", "Live Aktivitaet")}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {(activity.length ? activity : [t("settingsNoActions", "Noch keine Aktionen")]).map((item) => (
              <div key={item} className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

