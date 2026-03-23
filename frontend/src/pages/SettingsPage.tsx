import { useEffect, useState } from "react";
import { Bell, Globe2, KeyRound, Monitor, Moon, Shield, Sun, UserCog } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

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

export function SettingsPage() {
  const { user } = useAuth();
  const { language, setLanguage, languageOptions, t } = useLanguage();
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
  });
  const [hint, setHint] = useState<string | null>(null);
  const [activity, setActivity] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("dema-app-settings");
      if (!raw) return;
      const s = JSON.parse(raw) as {
        theme?: "light" | "dark" | "system";
        dateFormat?: string;
        notify?: typeof notify;
        mfaEnabled?: boolean;
        roleProfile?: string;
        passwordUpdatedAt?: string;
        quietHours?: boolean;
        region?: string;
        activity?: string[];
      };
      if (s.theme) setTheme(s.theme);
      if (s.dateFormat) setDateFormat(s.dateFormat);
      if (s.notify) setNotify(s.notify);
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
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{t("settingsSystemAccount", "System & Konto")}</h1>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 py-6 xl:grid-cols-12">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-4">
          <h2 className="text-base font-bold text-slate-900">{t("settingsAccount", "Konto")}</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("commonName", "Name")}</p>
              <p className="mt-1 font-semibold text-slate-800">{user?.name ?? t("commonUser", "User")}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">{t("commonEmail", "E-Mail")}</p>
              <p className="mt-1 font-semibold text-slate-800">{user?.email ?? "—"}</p>
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
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-8">
          <h2 className="text-base font-bold text-slate-900">{t("settingsNotifications", "Benachrichtigungen")}</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              { label: t("settingsNotifySalesAlerts", "Sales alerts"), enabled: notify.sales, onToggle: () => setNotify((s) => ({ ...s, sales: !s.sales })) },
              { label: t("settingsNotifyHrmApprovals", "HRM approvals"), enabled: notify.hrm, onToggle: () => setNotify((s) => ({ ...s, hrm: !s.hrm })) },
              { label: t("settingsNotifyPayrollErrors", "Payroll errors"), enabled: notify.payroll, onToggle: () => setNotify((s) => ({ ...s, payroll: !s.payroll })) },
              { label: t("settingsNotifyB2bLeads", "B2B leads"), enabled: notify.b2b, onToggle: () => setNotify((s) => ({ ...s, b2b: !s.b2b })) },
            ].map(({ label, enabled, onToggle }) => (
              <div key={label} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <Toggle checked={enabled} onToggle={onToggle} />
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

