const STORAGE_KEY = "dema-punch-clock";

export type PunchClockState = {
  workDate: string;
  punchInIso: string | null;
  punchOutIso: string | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadPunchClock(): PunchClockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { workDate: todayIso(), punchInIso: null, punchOutIso: null };
    const s = JSON.parse(raw) as PunchClockState;
    if (s.workDate === todayIso()) {
      return {
        workDate: s.workDate,
        punchInIso: s.punchInIso ?? null,
        punchOutIso: s.punchOutIso ?? null,
      };
    }
  } catch {
    // ignore
  }
  return { workDate: todayIso(), punchInIso: null, punchOutIso: null };
}

function savePunchClock(s: PunchClockState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("dema-punch-changed"));
}

/** Start work: first stamp of the session; ignores repeat while already in. */
export function punchInNow(): void {
  const day = todayIso();
  let s = loadPunchClock();
  if (s.workDate !== day) {
    s = { workDate: day, punchInIso: null, punchOutIso: null };
  }
  if (s.punchInIso && !s.punchOutIso) return;
  s.punchInIso = new Date().toISOString();
  s.punchOutIso = null;
  savePunchClock(s);
}

/** End work: only while stamped in and not already stamped out. */
export function punchOutNow(): void {
  const day = todayIso();
  const s = loadPunchClock();
  if (s.workDate !== day || !s.punchInIso || s.punchOutIso) return;
  s.punchOutIso = new Date().toISOString();
  savePunchClock(s);
}
