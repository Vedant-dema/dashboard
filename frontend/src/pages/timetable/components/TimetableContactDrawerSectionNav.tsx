import { forwardRef, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { scrollbarHiddenY } from '../contactDrawerFormClasses';
import { CONTACT_DRAWER_SECTION_IDS } from '../contactDrawerSectionIds';

const ACTIVITY_SECTION_ID = CONTACT_DRAWER_SECTION_IDS.activity;

const SECTION_KEYS = [
  'contact',
  'location',
  'people',
  'history',
  'vehicle',
  'activity',
] as const satisfies readonly (keyof typeof CONTACT_DRAWER_SECTION_IDS)[];

const NAV_KEY: Record<(typeof SECTION_KEYS)[number], string> = {
  contact: 'timetableContactSectionNavContact',
  location: 'timetableContactSectionNavLocation',
  people: 'timetableContactSectionNavPeople',
  history: 'timetableContactSectionNavHistory',
  vehicle: 'timetableContactSectionNavVehicle',
  activity: 'timetableContactSectionNavActivity',
};

const NAV_FALLBACK: Record<(typeof SECTION_KEYS)[number], string> = {
  contact: 'Contact',
  location: 'Location',
  people: 'People',
  history: 'Appointments',
  vehicle: 'Vehicle',
  activity: 'Correspondence',
};

const STEP: Record<(typeof SECTION_KEYS)[number], string> = {
  contact: '01',
  location: '02',
  people: '03',
  history: '04',
  vehicle: '05',
  activity: '06',
};

/** Inactive section pills — each hue unique for quick scanning. */
const SECTION_INACTIVE_SHELL: Record<(typeof SECTION_KEYS)[number], string> = {
  contact:
    'bg-violet-50/95 text-violet-950 ring-violet-200/90 hover:bg-violet-100/90 hover:ring-violet-300/80',
  location: 'bg-sky-50/95 text-sky-950 ring-sky-200/90 hover:bg-sky-100/90 hover:ring-sky-300/80',
  people:
    'bg-emerald-50/95 text-emerald-950 ring-emerald-200/90 hover:bg-emerald-100/90 hover:ring-emerald-300/80',
  history:
    'bg-amber-50/95 text-amber-950 ring-amber-200/90 hover:bg-amber-100/90 hover:ring-amber-300/80',
  vehicle: 'bg-rose-50/95 text-rose-950 ring-rose-200/90 hover:bg-rose-100/90 hover:ring-rose-300/80',
  activity: 'bg-cyan-50/95 text-cyan-950 ring-cyan-200/90 hover:bg-cyan-100/90 hover:ring-cyan-300/80',
};

const SECTION_INACTIVE_STEP: Record<(typeof SECTION_KEYS)[number], string> = {
  contact: 'bg-violet-100 text-violet-700 ring-violet-200/90',
  location: 'bg-sky-100 text-sky-700 ring-sky-200/90',
  people: 'bg-emerald-100 text-emerald-700 ring-emerald-200/90',
  history: 'bg-amber-100 text-amber-800 ring-amber-200/90',
  vehicle: 'bg-rose-100 text-rose-800 ring-rose-200/90',
  activity: 'bg-cyan-100 text-cyan-800 ring-cyan-200/90',
};

type Props = {
  t: (key: string, fallback: string) => string;
  children: ReactNode;
};

/** Single scroll column with sticky section pills. */
export const TimetableContactDrawerSectionNav = forwardRef<HTMLDivElement, Props>(
  function TimetableContactDrawerSectionNav({ t, children }, ref) {
    const items = useMemo(
      () =>
        SECTION_KEYS.map((key) => ({
          key,
          id: CONTACT_DRAWER_SECTION_IDS[key],
          label: t(NAV_KEY[key], NAV_FALLBACK[key]),
          step: STEP[key],
        })),
      [t],
    );

    const [activeId, setActiveId] = useState<string>(items[0]?.id ?? CONTACT_DRAWER_SECTION_IDS.contact);

    const updateActiveFromScroll = useCallback(() => {
      const root = ref && 'current' in ref ? ref.current : null;
      if (!root) return;
      const nearBottom = root.scrollTop + root.clientHeight >= root.scrollHeight - 32;
      if (nearBottom) {
        setActiveId(ACTIVITY_SECTION_ID);
        return;
      }
      const marker = root.scrollTop + 120;
      let current = items[0]?.id ?? CONTACT_DRAWER_SECTION_IDS.contact;
      const rootTop = root.getBoundingClientRect().top;
      for (const item of items) {
        if (item.id === ACTIVITY_SECTION_ID) continue;
        const el = document.getElementById(item.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - rootTop + root.scrollTop;
        if (top <= marker) current = item.id;
      }
      setActiveId(current);
    }, [items, ref]);

    useEffect(() => {
      const root = ref && 'current' in ref ? ref.current : null;
      if (!root) return;
      updateActiveFromScroll();
      root.addEventListener('scroll', updateActiveFromScroll, { passive: true });
      return () => root.removeEventListener('scroll', updateActiveFromScroll);
    }, [ref, updateActiveFromScroll]);

    const scrollSectionIntoView = (id: string) => {
      const root = ref && 'current' in ref ? ref.current : null;
      const el = document.getElementById(id);
      if (!root || !el) return;
      if (id === ACTIVITY_SECTION_ID) {
        root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' });
        return;
      }
      const rootRect = root.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const stickyPad = rootRect.height < 520 ? 104 : 88;
      const y = root.scrollTop + (elRect.top - rootRect.top) - stickyPad;
      root.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    };

    return (
      <div
        ref={ref}
        className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain border-t border-slate-200/40 bg-[linear-gradient(180deg,rgba(249,250,255,0.96)_0%,#eef2f7_52%,#edf2f8_100%)] ${scrollbarHiddenY}`}
      >
        <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/92 px-3 py-2 backdrop-blur-md sm:px-4">
          <nav
            className="grid min-w-0 grid-cols-2 gap-1.5 sm:grid-cols-3 xl:grid-cols-6"
            aria-label={t('timetableContactSectionNavAria', 'Jump to form section')}
          >
            {items.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollSectionIntoView(item.id);
                }}
                className={`flex min-h-[2.45rem] min-w-0 items-center justify-start gap-2 rounded-xl px-2.5 py-1.5 text-left text-[10px] font-semibold leading-snug ring-1 transition motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.99] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
                  activeId === item.id
                    ? 'bg-slate-900 text-white shadow-sm ring-slate-900/20'
                    : SECTION_INACTIVE_SHELL[item.key]
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold tabular-nums ring-1 ${
                    activeId === item.id
                      ? 'bg-white/20 text-white ring-white/25'
                      : SECTION_INACTIVE_STEP[item.key]
                  }`}
                  aria-hidden
                >
                  {item.step}
                </span>
                <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="mx-auto w-full max-w-none flex-1 space-y-4 px-3 py-4 sm:px-4 sm:py-5 md:px-6 md:py-6 xl:px-5 2xl:px-6">
          {children}
        </div>
      </div>
    );
  },
);
