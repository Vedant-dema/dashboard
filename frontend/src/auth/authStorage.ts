/**
 * Demo-only auth: localStorage. Replace with a real API + httpOnly cookies in production.
 */

const USERS_KEY = "dema-auth-users";
const SESSION_KEY = "dema-auth-session";
const RETURN_KEY = "dema-auth-return-hash";

export type StoredUser = {
  email: string;
  password: string;
  name: string;
  createdAt: string;
};

export type SessionUser = {
  email: string;
  name: string;
};

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (u): u is StoredUser =>
        u != null &&
        typeof u === "object" &&
        typeof (u as StoredUser).email === "string" &&
        typeof (u as StoredUser).password === "string" &&
        typeof (u as StoredUser).name === "string"
    );
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Seed demo account on first run (no users yet). */
export function ensureDemoUser(): void {
  const users = loadUsers();
  if (users.length > 0) return;
  const demo: StoredUser = {
    email: "demo@dema.de",
    password: "demo123",
    name: "Tom Müller",
    createdAt: new Date().toISOString(),
  };
  saveUsers([demo]);
}

export function registerUser(email: string, password: string, name: string): { ok: true } | { ok: false; error: string } {
  ensureDemoUser();
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, error: "Bitte eine gültige E-Mail eingeben." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Passwort mindestens 6 Zeichen." };
  }
  if (!name.trim()) {
    return { ok: false, error: "Bitte Ihren Namen eingeben." };
  }
  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === normalized)) {
    return { ok: false, error: "Diese E-Mail ist bereits registriert." };
  }
  users.push({
    email: normalized,
    password,
    name: name.trim(),
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);
  return { ok: true };
}

export function loginWithPassword(
  email: string,
  password: string
): { ok: true; user: SessionUser } | { ok: false; error: string } {
  ensureDemoUser();
  const normalized = email.trim().toLowerCase();
  const users = loadUsers();
  const found = users.find((u) => u.email.toLowerCase() === normalized);
  if (!found || found.password !== password) {
    return { ok: false, error: "E-Mail oder Passwort ist ungültig." };
  }
  const session: SessionUser = { email: found.email, name: found.name };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { ok: true, user: session };
}

export function getSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as unknown;
    if (o == null || typeof o !== "object") return null;
    const email = (o as SessionUser).email;
    const name = (o as SessionUser).name;
    if (typeof email !== "string" || typeof name !== "string") return null;
    return { email, name };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function setReturnHash(hash: string): void {
  if (hash && hash !== "#/login" && hash !== "#/signup") {
    sessionStorage.setItem(RETURN_KEY, hash);
  }
}

export function consumeReturnHash(): string | null {
  const h = sessionStorage.getItem(RETURN_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  return h || null;
}
