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
                className={`flex min-h-[2.45rem] min-w-0 items-center justify-start gap-2 rounded-xl px-2.5 py-1.5 text-left text-[10px] font-semibold leading-snug transition motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.99] motion-reduce:hover:scale-100 motion-reduce:active:scale-100 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs ${
                  activeId === item.id
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900/20'
                    : 'bg-white/95 text-slate-700 ring-1 ring-slate-200/80 hover:bg-sky-50/70'
                }`}
              >
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold tabular-nums ${
                    activeId === item.id
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
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
