/** Purchase call / appointment row (legacy Termin-Kalender style). */
export interface TimetableEntry {
  id: number;
  /** Short category e.g. A, KA */
  kaArt: string;
  /** ISO date YYYY-MM-DD */
  datum: string;
  /** HH:mm */
  zeit: string;
  firmenname: string;
  telefon: string;
  ansprechpartner: string;
  zweck: string;
  bemerkung: string;
  erledigt: boolean;
  /** Processor initials / code (vp) */
  vp: string;
  parked: boolean;
  /** When done: whether a follow-up was scheduled */
  hasFollowUp: boolean;
}

export interface TimetableDbState {
  entries: TimetableEntry[];
  nextId: number;
}

export type TimetableFilterMode =
  | 'day'
  | 'unfinished'
  | 'unfinishedOther'
  | 'doneNoFollowUp'
  | 'parked';
