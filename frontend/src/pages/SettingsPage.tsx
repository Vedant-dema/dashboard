import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Bell,
  Briefcase,
  Camera,
  Gauge,
  Globe2,
  KeyRound,
  Mail,
  MapPin,
  Minus,
  Monitor,
  Moon,
  Phone,
  Plus,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  Trash2,
  Type,
  UserCog,
  ZapOff,
} from "lucide-react";
import {
  applyMotionFromIntent,
  clampMotionIntent,
  readMotionIntentFromStorage,
  subscribeSystemMotionPreference,
  type MotionIntent,
} from "../common/utils/appMotion";
import {
  applyFontFamilyPreset,
  clampFontFamilyPreset,
  FONT_FAMILY_PRESET_IDS,
  FONT_FAMILY_STACKS,
  readFontFamilyPresetFromStorage,
  type FontFamilyPresetId,
} from "../common/utils/appFontFamily";
import {
  applyFontSizeStepIndex,
  clampFontSizeStepIndex,
  FONT_SIZE_STEP_MULTIPLIERS,
  fontSizeStepLabelPercent,
  readFontSizeStepIndexFromStorage,
} from "../common/utils/appFontScale";
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

type DemoSessionRow = { id: string; device: string; whenKind: "now" | "today" };

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
  const [motionIntent, setMotionIntent] = useState<MotionIntent>(() => readMotionIntentFromStorage());
  const [fontSizeStepIndex, setFontSizeStepIndex] = useState(() => readFontSizeStepIndexFromStorage());
  const [fontFamilyPreset, setFontFamilyPreset] = useState<FontFamilyPresetId>(() =>
    readFontFamilyPresetFromStorage()
  );
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
  const [demoSessions, setDemoSessions] = useState<DemoSessionRow[]>([
    { id: "s1", device: "Windows · Chrome", whenKind: "now" },
    { id: "s2", device: "Android · Chrome", whenKind: "today" },
  ]);

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
        fontSizeStepIndex?: number;
        fontFamilyPreset?: string;
        motionIntent?: unknown;
      };
      if (s.theme) setTheme(s.theme);
      if (s.motionIntent !== undefined) setMotionIntent(clampMotionIntent(s.motionIntent));
      if (typeof s.fontSizeStepIndex === "number") {
        setFontSizeStepIndex(clampFontSizeStepIndex(s.fontSizeStepIndex));
      }
      if (s.fontFamilyPreset) setFontFamilyPreset(clampFontFamilyPreset(s.fontFamilyPreset));
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
          motionIntent,
          fontSizeStepIndex,
          fontFamilyPreset,
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
  }, [
    theme,
    motionIntent,
    fontSizeStepIndex,
    fontFamilyPreset,
    language,
    dateFormat,
    notify,
    mfaEnabled,
    roleProfile,
    passwordUpdatedAt,
    quietHours,
    region,
    activity,
  ]);

  useLayoutEffect(() => {
    applyMotionFromIntent(motionIntent);
  }, [motionIntent]);

  useEffect(() => {
    if (motionIntent !== "system") return;
    return subscribeSystemMotionPreference(() => {
      applyMotionFromIntent(readMotionIntentFromStorage());
    });
  }, [motionIntent]);

  useLayoutEffect(() => {
    applyFontSizeStepIndex(fontSizeStepIndex);
  }, [fontSizeStepIndex]);

  useLayoutEffect(() => {
    applyFontFamilyPreset(fontFamilyPreset);
  }, [fontFamilyPreset]);

  const fontFamilyOptions = useMemo(
    () =>
      FONT_FAMILY_PRESET_IDS.map((id) => ({
        id,
        label:
          id === "inter"
            ? t("settingsFontFamilyInter", "Inter")
            : id === "system"
              ? t("settingsFontFamilySystem", "System UI")
              : id === "serif"
                ? t("settingsFontFamilySerif", "Serif")
                : t("settingsFontFamilyMono", "Monospace"),
        description:
          id === "inter"
            ? t("settingsFontFamilyDescInter", "Clean sans-serif tuned for dashboards and dense UIs.")
            : id === "system"
              ? t("settingsFontFamilyDescSystem", "Uses your operating system’s interface font.")
              : id === "serif"
                ? t("settingsFontFamilyDescSerif", "Source Serif 4 — editorial serif for comfortable reading.")
                : t(
                    "settingsFontFamilyDescMono",
                    "JetBrains Mono — technical monospace across the entire UI."
                  ),
      })),
    [t]
  );

  const motionRadioOptions = useMemo(
    () =>
      [
        { id: "system" as const, icon: Monitor, label: t("settingsMotionSystem", "Match system") },
        { id: "full" as const, icon: Sparkles, label: t("settingsMotionFull", "Full") },
        { id: "balanced" as const, icon: Gauge, label: t("settingsMotionBalanced", "Optimized") },
        { id: "minimal" as const, icon: ZapOff, label: t("settingsMotionMinimal", "Minimal") },
      ] as const,
    [t]
  );

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
      setStoredProfileAvatarDataUrl(res.dataUrl, user?.email);
      if (getStoredProfileAvatarDataUrl(user?.email) !== res.dataUrl) {
        ping(t("settingsAvatarSaveFailed", "Could not save photo. Try a smaller image."));
        return;
      }
      ping(t("settingsAvatarSaved", "Profile photo updated."));
    });
  }

  function clearAvatar() {
    setStoredProfileAvatarDataUrl(null, user?.email);
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
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{t("settingsTitle", "Settings")}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {t("settingsProfileAndSettingsHeadline", "Profile & Settings")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            {t(
              "settingsProfileAndSettingsSub",
              "Manage your personal details, security, notifications, and display settings in one place."
            )}
          </p>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-6 xl:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4">
          <h2 className="text-base font-bold text-slate-900">{t("settingsProfileAndAccount", "Profile & Account")}</h2>
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
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("settingsInternalId", "Internal ID")}</p>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Mail className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                EMP-1042
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{t("settingsInternalIdHint", "Demo — later from directory service.")}</p>
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
              {t("settingsSaveProfile", "Save profile")}
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-6 xl:col-span-8 xl:col-start-5">
          <section className="h-fit w-full self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">{t("settingsNotifications", "Notifications")}</h2>
            <div className="mt-2 space-y-1">
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

          <section className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-900">{t("settingsDisplay", "Display")}</h2>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Gauge className="h-4 w-4 shrink-0" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t("settingsMotionTitle", "Motion & effects")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t(
                      "settingsMotionSubtitle",
                      "Match system, Full, Optimized, and Minimal all keep full motion while the operating system allows it. Loading spinners always stay visible."
                    )}
                  </p>
                </div>
              </div>
              <p id="settings-motion-label" className="sr-only">
                {t("settingsMotionTitle", "Motion & effects")}
              </p>
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                role="radiogroup"
                aria-labelledby="settings-motion-label"
              >
                {motionRadioOptions.map(({ id, icon: Icon, label }) => {
                  const selected = motionIntent === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setMotionIntent(id)}
                      className={`rounded-xl border p-3 text-center text-xs font-semibold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 ${
                        selected
                          ? "border-blue-200 bg-blue-50 text-blue-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <Icon className="mx-auto mb-1.5 h-4 w-4 shrink-0" aria-hidden />
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                {t(
                  "settingsMotionHelp",
                  "Match system reads the OS “reduce motion” accessibility setting. Stronger reduction comes from the OS — the in-app Minimal choice no longer disables all animations when the OS still allows motion. Full, Optimized, and Minimal look the same until the system requests less motion. Identical smoothness on every device is not technically guaranteed."
                )}
              </p>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-6">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Type className="h-4 w-4 shrink-0" aria-hidden />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {t("settingsTypographyTitle", "Typography")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t("settingsTypographySubtitle", "Fine-tune how text appears everywhere in the app.")}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                <p
                  id="settings-font-family-label"
                  className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {t("settingsFontFamily", "Typeface")}
                </p>
                <p className="mt-1 max-w-prose text-xs leading-relaxed text-slate-600">
                  {t(
                    "settingsFontFamilyHelp",
                    "Applies instantly across the whole dashboard, including tables and modals. The preview line shows each face."
                  )}
                </p>
                <div
                  className="mt-4 grid gap-3 sm:grid-cols-2"
                  role="radiogroup"
                  aria-labelledby="settings-font-family-label"
                >
                  {fontFamilyOptions.map(({ id, label, description }) => {
                    const selected = fontFamilyPreset === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setFontFamilyPreset(id)}
                        className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 ${
                          selected
                            ? "border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-500/15"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80"
                        }`}
                      >
                        <span
                          className={`block text-base font-semibold ${selected ? "text-blue-900" : "text-slate-900"}`}
                          style={{ fontFamily: FONT_FAMILY_STACKS[id] }}
                        >
                          {label}
                        </span>
                        <span className="mt-1.5 block text-xs leading-snug text-slate-600">{description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p
                      id="settings-font-size-label"
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      {t("settingsFontSize", "Text size")}
                    </p>
                    <p className="mt-1 max-w-prose text-xs leading-relaxed text-slate-600">
                      {t(
                        "settingsFontSizeHelp",
                        "Scales text only — spacing and icons stay aligned. Applies immediately."
                      )}
                    </p>
                  </div>
                  <p
                    className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-slate-800 sm:mt-0.5 sm:text-right"
                    role="status"
                    aria-live="polite"
                    aria-labelledby="settings-font-size-label"
                  >
                    {t("settingsFontSizePercent", "{n}%").replace(
                      "{n}",
                      String(fontSizeStepLabelPercent(fontSizeStepIndex))
                    )}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    disabled={fontSizeStepIndex <= 0}
                    onClick={() =>
                      setFontSizeStepIndex((i) => Math.max(0, i - 1))
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t("settingsFontSizeDecrease", "Decrease text size")}
                  >
                    <Minus className="h-4 w-4" aria-hidden />
                  </button>
                  <input
                    id="dema-font-size-slider"
                    type="range"
                    min={0}
                    max={FONT_SIZE_STEP_MULTIPLIERS.length - 1}
                    step={1}
                    value={fontSizeStepIndex}
                    onChange={(e) =>
                      setFontSizeStepIndex(clampFontSizeStepIndex(Number(e.target.value)))
                    }
                    aria-valuemin={0}
                    aria-valuemax={FONT_SIZE_STEP_MULTIPLIERS.length - 1}
                    aria-valuenow={fontSizeStepIndex}
                    aria-valuetext={t("settingsFontSizePercent", "{n}%").replace(
                      "{n}",
                      String(fontSizeStepLabelPercent(fontSizeStepIndex))
                    )}
                    aria-label={t("settingsFontSizeSlider", "Text size")}
                    className="h-2 w-full min-w-0 flex-1 cursor-pointer accent-blue-600"
                  />
                  <button
                    type="button"
                    disabled={fontSizeStepIndex >= FONT_SIZE_STEP_MULTIPLIERS.length - 1}
                    onClick={() =>
                      setFontSizeStepIndex((i) =>
                        Math.min(FONT_SIZE_STEP_MULTIPLIERS.length - 1, i + 1)
                      )
                    }
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t("settingsFontSizeIncrease", "Increase text size")}
                  >
                    <Plus className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-3 flex justify-between text-xs font-medium text-slate-500">
                  <span>{t("settingsFontSizeSmaller", "Smaller")}</span>
                  <span>{t("settingsFontSizeLarger", "Larger")}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left">
                <label className="text-xs uppercase tracking-wide text-slate-400" htmlFor="language-select">
                  {t("settingsLanguage", "Language")}
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
                  {t("settingsLanguageHelp", "The selected language is applied across the dashboard.")}
                </p>
                {import.meta.env.VITE_ENABLE_LIVE_UI_TRANSLATION === "true" ? (
                  <p className="mt-2 rounded-lg border border-amber-100 bg-amber-50/80 px-2 py-1.5 text-[11px] text-amber-900">
                    {t(
                      "settingsLiveTranslationBanner",
                      "Live translation is on: strings are translated from English via the API and applied in batches across the dashboard."
                    )}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setDateFormat((v) => (v === "TT.MM.JJJJ" ? "DD/MM/YYYY" : "TT.MM.JJJJ"))}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-left hover:bg-slate-100"
              >
                <p className="text-xs uppercase tracking-wide text-slate-400">{t("settingsDateFormat", "Date format")}</p>
                <p className="mt-1 font-semibold text-slate-800">{dateFormat}</p>
              </button>
            </div>
          </section>

          <section className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                  type="button"
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
        </div>

        {activeAction === "password" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-8 xl:col-start-5">
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
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-8 xl:col-start-5">
            <h2 className="text-base font-bold text-slate-900">{t("settingsNotificationRules", "Notification rules")}</h2>
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
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-8 xl:col-start-5">
            <h2 className="text-base font-bold text-slate-900">{t("settingsLanguageRegion", "Language & region")}</h2>
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
            <h2 className="text-base font-bold text-slate-900">{t("settingsSessionsDevices", "Sessions & devices")}</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {t("settingsSessionsIntro", "Devices recently used with this account (demo).")}
          </p>
          <button
            type="button"
            onClick={() => setShowSessions((v) => !v)}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:w-auto"
          >
            {showSessions ? t("settingsHideSessions", "Hide sessions") : t("settingsShowSessions", "Show sessions")}
          </button>
          {showSessions ? (
            <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              {demoSessions.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-500">{t("settingsSessionsEmpty", "No sessions in this list.")}</p>
              ) : (
                demoSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-col gap-2 rounded-lg bg-white px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:gap-3"
                  >
                    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <span className="font-semibold text-slate-800">{s.device}</span>
                      <span className="text-slate-500">
                        {s.whenKind === "now"
                          ? t("settingsSessionNow", "Jetzt aktiv")
                          : t("settingsSessionToday", "Heute, 08:12")}
                      </span>
                      <span className="text-slate-500">{profileLocation || "Hamburg"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoSessions((prev) => prev.filter((row) => row.id !== s.id));
                        ping(t("settingsSessionRemoved", "Session removed from list (demo)."));
                      }}
                      title={t("settingsSessionRemove", "Remove device")}
                      aria-label={t("settingsSessionRemove", "Remove device")}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 self-end rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 sm:self-center"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      <span className="sm:hidden">{t("settingsSessionRemove", "Remove device")}</span>
                    </button>
                  </div>
                ))
              )}
              <p className="pt-1 text-[11px] text-slate-500">{t("settingsSessionsDemoNote", "Per-device sign-out will be available once backend integration is connected.")}</p>
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

