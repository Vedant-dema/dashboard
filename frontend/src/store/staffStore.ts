const STORAGE_KEY = "dema-staff-db";

export type StaffMember = {
  id: number;
  name: string;
  /** Matches KONTAKT_ROLLEN values in NewCustomerModal */
  rolle: string;
  telefon: string;
  email: string;
};

const SEED_STAFF: StaffMember[] = [
  // Mechaniker
  { id: 1,  name: "Tobias Brandt",      rolle: "Mechaniker",        telefon: "+49 211 100001", email: "t.brandt@dema.de" },
  { id: 2,  name: "Kemal Yıldız",       rolle: "Mechaniker",        telefon: "+49 211 100002", email: "k.yildiz@dema.de" },
  { id: 3,  name: "Sven Hofmann",       rolle: "Mechaniker",        telefon: "+49 211 100003", email: "s.hofmann@dema.de" },
  // Autowäsche
  { id: 4,  name: "Liciu Ana-Maria",    rolle: "Autowäsche",        telefon: "+49 211 200001", email: "a.liciu@dema.de" },
  { id: 5,  name: "Jorge Perreira",     rolle: "Autowäsche",        telefon: "+49 211 200002", email: "j.perreira@dema.de" },
  // Verkauf
  { id: 6,  name: "Anna Schmidt",       rolle: "Verkauf",           telefon: "+49 211 300001", email: "a.schmidt@dema.de" },
  { id: 7,  name: "Mitsos Deligiannis", rolle: "Verkauf",           telefon: "+49 211 300002", email: "m.deligiannis@dema.de" },
  { id: 8,  name: "Laura Weber",        rolle: "Verkauf",           telefon: "+49 211 300003", email: "l.weber@dema.de" },
  // Buchhaltung
  { id: 9,  name: "Petra Krämer",       rolle: "Buchhaltung",       telefon: "+49 211 400001", email: "p.kraemer@dema.de" },
  { id: 10, name: "Frank Neumann",      rolle: "Buchhaltung",       telefon: "+49 211 400002", email: "f.neumann@dema.de" },
  // Einkauf
  { id: 11, name: "Sandra Mayer",       rolle: "Einkauf",           telefon: "+49 211 500001", email: "s.mayer@dema.de" },
  { id: 12, name: "Jürgen Wolf",        rolle: "Einkauf",           telefon: "+49 211 500002", email: "j.wolf@dema.de" },
  // Disposition
  { id: 13, name: "Mehmet Arslan",      rolle: "Disposition",       telefon: "+49 211 600001", email: "m.arslan@dema.de" },
  { id: 14, name: "Christina Bauer",    rolle: "Disposition",       telefon: "+49 211 600002", email: "c.bauer@dema.de" },
  // Geschäftsführung
  { id: 15, name: "Dr. Hans Richter",   rolle: "Geschäftsführung",  telefon: "+49 211 700001", email: "h.richter@dema.de" },
  // Allgemein
  { id: 16, name: "Max Mustermann",     rolle: "Allgemein",         telefon: "+49 211 800001", email: "m.mustermann@dema.de" },
  { id: 17, name: "Erika Musterfrau",   rolle: "Allgemein",         telefon: "+49 211 800002", email: "e.musterfrau@dema.de" },
];

function loadFromStorage(): StaffMember[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StaffMember[];
  } catch { /* ignore */ }
  return SEED_STAFF;
}

function saveToStorage(staff: StaffMember[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
  } catch { /* ignore */ }
}

export function loadStaff(): StaffMember[] {
  const stored = loadFromStorage();
  // Always ensure seed data is present (merge by id)
  const ids = new Set(stored.map((s) => s.id));
  const merged = [...stored, ...SEED_STAFF.filter((s) => !ids.has(s.id))];
  return merged;
}

export function getStaffByRolle(rolle: string): StaffMember[] {
  return loadStaff().filter((s) => s.rolle === rolle);
}

export function getAllStaff(): StaffMember[] {
  return loadStaff();
}

export function upsertStaffMember(member: StaffMember): void {
  const staff = loadStaff();
  const idx = staff.findIndex((s) => s.id === member.id);
  if (idx >= 0) staff[idx] = member;
  else staff.push(member);
  saveToStorage(staff);
}

export function deleteStaffMember(id: number): void {
  const staff = loadStaff().filter((s) => s.id !== id);
  saveToStorage(staff);
}
