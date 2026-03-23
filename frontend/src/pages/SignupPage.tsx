import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Mail, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { AuthMarketingPanel } from "../components/auth/AuthMarketingPanel";
import { AuthFormShell } from "../components/auth/AuthFormShell";

const inputClass =
  "auth-input-glow h-12 w-full rounded-xl border border-slate-200/90 bg-white/80 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15";

export function SignupPage() {
  const { signup } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("signupPasswordMismatch", "Passwords do not match."));
      return;
    }
    setLoading(true);
    try {
      const result = await signup(email, password, name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.hash = "#/";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-slate-950 lg:flex-row">
      <AuthMarketingPanel />

      <AuthFormShell>
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-2xl backdrop-blur-xl auth-card-glow sm:p-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600/10 to-cyan-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-800 ring-1 ring-violet-500/15">
            <span className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_8px_rgb(139_92_246_/_0.8)]" />
            {t("signupBadge", "New account")}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("signupTitle", "Create account")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {t("signupSubtitle", "Register for the internal dashboard (demo: data stays in this browser).")}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="signup-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                {t("signupName", "Name")}
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={inputClass}
                  placeholder={t("signupPlaceholderName", "First and last name")}
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                {t("loginEmail", "Email")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                  placeholder={t("loginPlaceholderEmail", "name@company.com")}
                />
              </div>
            </div>
            <div>
              <label htmlFor="signup-password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                {t("signupPassword", "Password")}
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`${inputClass} pl-4 pr-12`}
                  placeholder={t("signupPlaceholderPassword", "At least 6 characters")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={
                    showPw ? t("loginHidePassword", "Hide password") : t("loginShowPassword", "Show password")
                  }
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="signup-confirm" className="mb-1.5 block text-sm font-semibold text-slate-700">
                {t("signupConfirmPassword", "Confirm password")}
              </label>
              <input
                id="signup-confirm"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className={`${inputClass} pl-4`}
                placeholder={t("signupPlaceholderConfirm", "Repeat password")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-btn-shimmer relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-sm font-bold text-white shadow-lg shadow-violet-500/30 transition hover:shadow-xl hover:shadow-violet-500/35 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t("signupSubmit", "Create account")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </span>
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            {t("signupHasAccount", "Already registered?")}{" "}
            <a
              href="#/login"
              className="font-semibold text-blue-600 transition hover:text-violet-600 hover:underline"
            >
              {t("signupLogin", "Sign in")}
            </a>
          </p>
          <p className="mt-4 text-center text-xs text-slate-400">
            <a href="#/b2b-portal" className="transition hover:text-slate-600 hover:underline">
              {t("signupB2bLink", "B2B vehicle portal (public)")}
            </a>
          </p>
        </div>
      </AuthFormShell>
    </div>
  );
}
