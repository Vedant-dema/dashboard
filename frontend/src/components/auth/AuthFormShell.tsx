import type { ReactNode } from "react";

export function AuthFormShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[70vh] flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-8 lg:min-h-screen">
      <div className="pointer-events-none absolute inset-0 auth-ambient-light" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-50 bg-[linear-gradient(rgb(59_130_246_/_0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(59_130_246_/_0.04)_1px,transparent_1px)] bg-[size:36px_36px] auth-grid-drift"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-[12%] h-[420px] w-[420px] rounded-full bg-blue-500/20 blur-[100px] auth-float-orb-1"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 bottom-[8%] h-[360px] w-[360px] rounded-full bg-violet-500/18 blur-[88px] auth-float-orb-2"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-[35%] top-[40%] h-[280px] w-[280px] -translate-x-1/2 rounded-full bg-cyan-400/14 blur-[72px] auth-float-orb-3"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[15%] top-[20%] h-24 w-24 rounded-2xl border border-white/40 bg-white/20 shadow-lg backdrop-blur-sm auth-float-orb-2 opacity-60"
        style={{ animationDelay: "-5s" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[25%] left-[20%] h-16 w-16 rounded-full border border-blue-300/30 bg-blue-400/10 backdrop-blur-sm auth-float-orb-1 opacity-70"
        style={{ animationDelay: "-8s" }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-[440px] animate-auth-card-in">{children}</div>
    </div>
  );
}
