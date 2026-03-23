import { BarChart3, LayoutDashboard, Lock, Shield, Sparkles } from "lucide-react";
import { AuthDashboardGraphic } from "./AuthDashboardGraphic";
import { AuthTruckBrandAnimation } from "./AuthTruckBrandAnimation";

const highlights = [
  { icon: BarChart3, title: "Echtzeit-Überblick", text: "KPIs, Kunden und Prozesse an einem Ort." },
  { icon: Shield, title: "Rollenbasiert", text: "Zugriff nur auf die Bereiche, die Sie brauchen." },
  { icon: Lock, title: "Sichere Anmeldung", text: "Demo lokal — Produktion mit echtem Backend." },
];

export function AuthMarketingPanel() {
  return (
    <div className="relative flex min-h-[280px] flex-1 flex-col justify-between overflow-hidden bg-slate-950 px-8 py-10 text-white lg:min-h-screen lg:w-[min(46%,600px)] lg:shrink-0 lg:py-14 xl:px-12">
      {/* Slow rotating aurora */}
      <div
        className="pointer-events-none absolute -left-1/2 -top-1/2 h-[200%] w-[200%] opacity-40 auth-dark-aurora"
        style={{
          background:
            "conic-gradient(from 0deg at 50% 50%, rgb(59 130 246 / 0.25), transparent 25%, rgb(168 85 247 / 0.2) 50%, transparent 75%, rgb(34 211 238 / 0.15))",
        }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_30%_-10%,rgb(59_130_246_/_0.4),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_20%,rgb(168_85_247_/_0.25),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 b2b-hero-noise opacity-70" />

      <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-blue-500/20 blur-[100px] auth-dark-blob-1" />
      <div className="pointer-events-none absolute bottom-1/4 left-0 h-64 w-64 rounded-full bg-violet-600/15 blur-[90px] auth-dark-blob-2" />

      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(255_255_255_/_0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255_/_0.04)_1px,transparent_1px)] bg-[size:56px_56px]"
        style={{ maskImage: "linear-gradient(to bottom, black 50%, transparent)" }}
      />

      {/* Floating ring accents */}
      <div
        className="pointer-events-none absolute right-[8%] top-[18%] h-32 w-32 rounded-full border border-white/10 auth-float-orb-1 opacity-50"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[30%] left-[12%] h-20 w-20 rounded-full border border-blue-400/20 auth-float-orb-2"
        aria-hidden
      />

      <div className="relative z-10">
        <a
          href="#/"
          className="group inline-flex items-center gap-3 outline-none ring-offset-2 ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-blue-400"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/50 ring-1 ring-white/15 transition group-hover:ring-white/25">
            <LayoutDashboard className="h-6 w-6 text-white" strokeWidth={2.2} />
          </span>
          <span className="bg-gradient-to-r from-white via-blue-100 to-violet-200 bg-clip-text text-3xl font-black tracking-[0.14em] text-transparent md:text-4xl">
            DEMA
          </span>
        </a>
        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-blue-200 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-300" />
          Internes Management System
        </p>
        <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-6 xl:gap-8">
          <div className="min-w-0 max-w-md">
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Willkommen im{" "}
              <span className="bg-gradient-to-r from-blue-200 via-white to-violet-200 bg-clip-text text-transparent">
                Dashboard
              </span>
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Verkauf, Einkauf, Werkstatt und Waschanlage — strukturiert, schnell und für Ihr Team gebaut.
            </p>
          </div>
          <AuthTruckBrandAnimation className="lg:min-w-0 lg:flex-1 lg:pb-1" />
        </div>

        <div className="mt-8 hidden max-w-[400px] sm:block lg:max-w-none">
          <AuthDashboardGraphic className="w-full drop-shadow-[0_0_28px_rgb(59_130_246_/_0.25)]" />
        </div>
      </div>

      <ul className="auth-highlight-stagger relative z-10 mt-10 space-y-3 lg:mt-8">
        {highlights.map(({ icon: Icon, title, text }) => (
          <li
            key={title}
            className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 shadow-lg shadow-black/20 backdrop-blur-md transition duration-300 hover:border-white/15 hover:bg-white/[0.1]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/50 ring-1 ring-white/10">
              <Icon className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-0.5 text-sm text-slate-400">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
