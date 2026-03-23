import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useAuth, consumeReturnHash } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { AuthMarketingPanel } from "../components/auth/AuthMarketingPanel";
import { AuthFormShell } from "../components/auth/AuthFormShell";

const inputClass =
  "auth-input-glow h-12 w-full rounded-xl border border-slate-200/90 bg-white/80 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15";

export function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const ret = consumeReturnHash();
      window.location.hash = ret && ret.length > 1 ? ret : "#/";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-slate-950 lg:flex-row">
      <AuthMarketingPanel />

      <AuthFormShell>
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-2xl backdrop-blur-xl auth-card-glow sm:p-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600/10 to-violet-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-500/15">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
            </span>
            {t("loginSecureBadge", "Secure sign-in")}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t("loginTitle", "Sign in")}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {t("loginSubtitle", "Use your business email to open the dashboard — or try the demo account.")}
          </p>

          <div className="group mt-5 rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 via-indigo-50/80 to-violet-50/60 px-4 py-3 text-xs text-slate-700 shadow-inner shadow-blue-500/5 transition duration-300 hover:border-blue-300/80 hover:shadow-blue-500/10">
            <p className="font-semibold text-blue-900">{t("loginDemoTitle", "Demo access")}</p>
            <p className="mt-1 font-mono text-[11px] text-slate-600">demo@dema.de · demo123</p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-700">
                {t("loginEmail", "Email")}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="login-email"
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
              <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-slate-700">
                {t("loginPassword", "Password")}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${inputClass} pl-4 pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label={showPw ? t("loginHidePassword", "Hide password") : t("loginShowPassword", "Show password")}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group auth-btn-shimmer relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {t("loginSubmit", "Continue to dashboard")}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </>
                )}
              </span>
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            {t("loginNoAccount", "No account yet?")}{" "}
            <a
              href="#/signup"
              className="font-semibold text-blue-600 transition hover:text-violet-600 hover:underline"
            >
              {t("loginRegister", "Register")}
            </a>
          </p>
          <p className="mt-4 text-center text-xs text-slate-400">
            <a href="#/b2b-portal" className="transition hover:text-slate-600 hover:underline">
              {t("loginB2bPortalLink", "B2B vehicle portal (public)")}
            </a>
          </p>
        </div>
      </AuthFormShell>
    </div>
  );
}
