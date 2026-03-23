/** Abstract dashboard preview — decorative SVG with CSS-driven draw / bar animations. */
export function AuthDashboardGraphic({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 440 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="authDashLine" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#93c5fd" />
          <stop offset="0.5" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#67e8f9" />
        </linearGradient>
        <linearGradient id="authDashBar" x1="0" y1="1" x2="0" y2="0">
          <stop stopColor="#3b82f6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0.5" />
        </linearGradient>
        <filter id="authDashGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main “window” */}
      <rect
        x="4"
        y="8"
        width="210"
        height="184"
        rx="14"
        className="stroke-white/15"
        strokeWidth="1"
        fill="rgb(255 255 255 / 0.04)"
      />
      <rect x="20" y="24" width="88" height="6" rx="3" fill="rgb(255 255 255 / 0.18)" className="auth-pulse-dot" />
      <rect x="20" y="38" width="120" height="4" rx="2" fill="rgb(255 255 255 / 0.08)" />

      {/* Mini KPI pills */}
      <rect x="20" y="56" width="52" height="28" rx="8" fill="rgb(59 130 246 / 0.25)" />
      <rect x="80" y="56" width="52" height="28" rx="8" fill="rgb(139 92 246 / 0.2)" />
      <rect x="140" y="56" width="52" height="28" rx="8" fill="rgb(34 211 238 / 0.15)" />

      {/* Bars chart */}
      <g transform="translate(20, 100)">
        <rect
          className="auth-svg-bar"
          x="0"
          y="44"
          width="14"
          height="40"
          rx="4"
          fill="url(#authDashBar)"
          style={{ animationDelay: "0.45s" }}
        />
        <rect
          className="auth-svg-bar"
          x="22"
          y="28"
          width="14"
          height="56"
          rx="4"
          fill="url(#authDashBar)"
          style={{ animationDelay: "0.58s" }}
        />
        <rect
          className="auth-svg-bar"
          x="44"
          y="36"
          width="14"
          height="48"
          rx="4"
          fill="url(#authDashBar)"
          style={{ animationDelay: "0.71s" }}
        />
        <rect
          className="auth-svg-bar"
          x="66"
          y="12"
          width="14"
          height="72"
          rx="4"
          fill="url(#authDashBar)"
          style={{ animationDelay: "0.84s" }}
        />
      </g>

      {/* Second panel — list */}
      <rect
        x="228"
        y="8"
        width="208"
        height="184"
        rx="14"
        className="stroke-white/10"
        strokeWidth="1"
        fill="rgb(255 255 255 / 0.03)"
      />
      <rect x="244" y="28" width="72" height="5" rx="2.5" fill="rgb(255 255 255 / 0.14)" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(244, ${48 + i * 34})`}>
          <rect width="160" height="8" rx="4" fill="rgb(255 255 255 / 0.06)" />
          <rect width="100" height="8" rx="4" y="12" fill="rgb(255 255 255 / 0.04)" />
        </g>
      ))}

      {/* Trend line spanning both panels */}
      <path
        className="auth-svg-line"
        d="M 32 168 C 100 130, 160 150, 230 120 S 360 100, 408 88"
        stroke="url(#authDashLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#authDashGlow)"
      />
    </svg>
  );
}
