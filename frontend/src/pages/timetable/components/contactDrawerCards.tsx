import { Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Staggered entrance for smart summary (motion-safe). */
export function overviewStaggerClass(ms: number): string {
  return `motion-safe:animate-contact-card-in motion-reduce:animate-none [animation-delay:${ms}ms]`;
}

export function ContactSmartSummaryCard({
  bullets,
  t,
  variant = 'inline',
}: {
  bullets: string[];
  t: (key: string, fallback: string) => string;
  variant?: 'inline' | 'dropdown';
}) {
  const shell =
    variant === 'dropdown'
      ? 'relative overflow-hidden rounded-2xl border border-blue-200/45 bg-gradient-to-br from-blue-50/90 via-white/75 to-slate-50/50 p-3.5 shadow-none ring-1 ring-blue-500/[0.08] backdrop-blur-md sm:p-4'
      : `relative overflow-hidden rounded-3xl border border-blue-200/45 bg-gradient-to-br from-blue-50/85 via-white/60 to-indigo-50/40 p-4 shadow-[0_24px_56px_-24px_rgba(30,58,138,0.22)] backdrop-blur-xl ring-1 ring-blue-500/[0.08] sm:p-5 ${overviewStaggerClass(0)}`;

  return (
    <div className={shell}>
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-blue-400/20 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-8 left-1/4 h-24 w-40 rounded-full bg-indigo-400/18 blur-3xl motion-safe:animate-timetable-blob motion-reduce:animate-none [animation-delay:-11s]"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div
          className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-blue-600/35 ring-2 ring-white/30 ${variant === 'dropdown' ? 'h-9 w-9' : 'h-11 w-11'}`}
        >
          <Sparkles
            className={variant === 'dropdown' ? 'h-4 w-4' : 'h-5 w-5'}
            strokeWidth={2}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-bold tracking-tight text-slate-900 ${variant === 'dropdown' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}
            >
              {t('timetableContactAiTitle', 'Smart summary')}
            </h3>
            <span className="rounded-full bg-blue-600/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-900 ring-1 ring-blue-500/25">
              {t('timetableContactAiBadge', 'Live')}
            </span>
          </div>
          <ul className="mt-3 space-y-2.5" aria-label={t('timetableContactAiAria', 'Smart summary bullets')}>
            {bullets.map((line, i) => (
              <li
                key={`${i}-${line.slice(0, 12)}`}
                className={`flex gap-2.5 leading-snug text-slate-700 ${variant === 'dropdown' ? 'text-xs sm:text-sm' : 'text-sm'} ${variant === 'inline' ? overviewStaggerClass(70 + i * 55) : ''}`}
              >
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-blue-500 to-sky-400 shadow-sm shadow-blue-500/40"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <p
            className={`mt-3.5 leading-relaxed text-slate-500 ${variant === 'dropdown' ? 'text-[10px] sm:text-[11px]' : 'text-[11px] sm:text-xs'}`}
          >
            {t(
              'timetableContactAiDisclaimer',
              'Built from your fields on this device — no cloud AI, nothing sent online.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContactCard({
  title,
  subtitle,
  titleId,
  icon: Icon,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  /** Optional id for the title heading (region `aria-labelledby`). */
  titleId?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/55 bg-white/70 p-6 shadow-[0_16px_48px_-20px_rgba(15,23,42,0.12)] ring-1 ring-blue-500/[0.06] backdrop-blur-xl md:p-7 ${className}`}
    >
      <div className="flex gap-4">
        {Icon ? (
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-sky-500/15 text-blue-800 ring-1 ring-blue-300/45"
            aria-hidden
          >
            <Icon className="h-5 w-5" strokeWidth={2} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 id={titleId} className="text-base font-semibold tracking-tight text-slate-900">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          ) : null}
          <div className={subtitle ? 'mt-6' : 'mt-5'}>{children}</div>
        </div>
      </div>
    </div>
  );
}
