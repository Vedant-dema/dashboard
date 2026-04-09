import type { TimetableDbState, TimetableEntry } from '../types/timetable';

const STORAGE_KEY = 'dema-purchase-timetable-v1';

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

const SEED_ENTRIES: TimetableEntry[] = [
  {
    id: 1,
    kaArt: 'A',
    datum: isoToday(),
    zeit: '08:30',
    firmenname: 'Dahm GmbH Eis & Tiefk',
    telefon: '+49 123 456789',
    ansprechpartner: 'Mathias Dahm',
    zweck: 'Anruf',
    bemerkung: 'PV waiting for callback — offer requested.',
    erledigt: false,
    vp: 'es',
    parked: false,
    hasFollowUp: false,
  },
  {
    id: 2,
    kaArt: 'KA',
    datum: isoToday(),
    zeit: '09:00',
    firmenname: 'Wichmann Enten GmbH',
    telefon: '+49 987 654321',
    ansprechpartner: 'Frau Heinlein',
    zweck: 'Anruf',
    bemerkung: 'Follow up by email 11 Mar; 2 Transit + 1×18 t mentioned.',
    erledigt: false,
    vp: 'es',
    parked: false,
    hasFollowUp: false,
  },
  {
    id: 3,
    kaArt: 'A',
    datum: isoToday(),
    zeit: '10:15',
    firmenname: 'ABATTOIR ETTELBRUCK',
    telefon: '+352 1234 5678',
    ansprechpartner: 'Zentrale',
    zweck: 'Anruf',
    bemerkung: 'Report availability from Apr; pricing to confirm.',
    erledigt: true,
    vp: 'tk',
    parked: false,
    hasFollowUp: true,
  },
  {
    id: 4,
    kaArt: 'A',
    datum: isoToday(),
    zeit: '11:00',
    firmenname: 'Nordfrost Logistics AG',
    telefon: '+49 40 11223344',
    ansprechpartner: 'Herr Brandt',
    zweck: 'Anruf',
    bemerkung: 'Parked — revisit next quarter.',
    erledigt: false,
    vp: 'sf',
    parked: true,
    hasFollowUp: false,
  },
  {
    id: 5,
    kaArt: 'KA',
    datum: isoToday(),
    zeit: '13:30',
    firmenname: 'FreshCold Spedition',
    telefon: '+49 221 998877',
    ansprechpartner: 'Disposition',
    zweck: 'Anruf',
    bemerkung: 'Completed call; no follow-up slot yet.',
    erledigt: true,
    vp: 'es',
    parked: false,
    hasFollowUp: false,
  },
];

export function loadTimetableDb(): TimetableDbState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { entries: [...SEED_ENTRIES], nextId: 6 };
    }
    const parsed = JSON.parse(raw) as TimetableDbState;
    if (!parsed || !Array.isArray(parsed.entries)) return { entries: [...SEED_ENTRIES], nextId: 6 };
    if (parsed.entries.length === 0) {
      return { entries: [...SEED_ENTRIES], nextId: 6 };
    }
    const nextId =
      typeof parsed.nextId === 'number'
        ? parsed.nextId
        : Math.max(0, ...parsed.entries.map((e) => e.id)) + 1;
    return { entries: parsed.entries, nextId };
  } catch {
    return { entries: [...SEED_ENTRIES], nextId: 6 };
  }
}

export function saveTimetableDb(state: TimetableDbState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function upsertTimetableEntry(
  state: TimetableDbState,
  entry: TimetableEntry
): TimetableDbState {
  const idx = state.entries.findIndex((e) => e.id === entry.id);
  if (idx === -1) {
    return { ...state, entries: [...state.entries, entry] };
  }
  const next = state.entries.slice();
  next[idx] = entry;
  return { ...state, entries: next };
}

export function addTimetableEntries(
  state: TimetableDbState,
  newOnes: Omit<TimetableEntry, 'id'>[]
): TimetableDbState {
  let nextId = state.nextId;
  const added: TimetableEntry[] = newOnes.map((row) => {
    const id = nextId++;
    return { ...row, id };
  });
  return {
    entries: [...state.entries, ...added],
    nextId,
  };
}

