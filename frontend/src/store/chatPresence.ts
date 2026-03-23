/** Per-user presence for chat (demo: localStorage). Away = idle or tab hidden while heartbeat is fresh. */

export const CHAT_PRESENCE_STORAGE_KEY = "dema-chat-presence-v1";

const HEARTBEAT_STALE_MS = 90_000;
/** No pointer/keyboard activity while session is still “alive” → show as away (sleep). */
const AWAY_IDLE_MS = 120_000;

function norm(e: string): string {
  return e.trim().toLowerCase();
}

export type PresenceStatus = "online" | "away" | "offline";

export type PresenceEntry = {
  heartbeat: string;
  lastActive: string;
  visibility: "visible" | "hidden";
};

function savePresenceMap(map: Record<string, PresenceEntry>): void {
  try {
    localStorage.setItem(CHAT_PRESENCE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("dema-presence-changed"));
}

/** Load map; migrates legacy string-only values (ISO heartbeat). */
export function loadPresenceMap(): Record<string, PresenceEntry> {
  try {
    const raw = localStorage.getItem(CHAT_PRESENCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, PresenceEntry> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") {
        out[k] = { heartbeat: v, lastActive: v, visibility: "visible" };
      } else if (v && typeof v === "object" && "heartbeat" in v) {
        const o = v as Partial<PresenceEntry>;
        const hb = o.heartbeat;
        if (typeof hb !== "string") continue;
        const la = typeof o.lastActive === "string" ? o.lastActive : hb;
        const visibility = o.visibility === "hidden" ? "hidden" : "visible";
        out[k] = { heartbeat: hb, lastActive: la, visibility };
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * @param bumpActivity - true after user interaction; false for periodic heartbeat-only pings.
 */
export function reportPresence(email: string, bumpActivity: boolean): void {
  const map = loadPresenceMap();
  const n = norm(email);
  const now = new Date().toISOString();
  const prev = map[n];
  const visibility =
    typeof document !== "undefined" && document.visibilityState === "hidden" ? "hidden" : "visible";
  map[n] = {
    heartbeat: now,
    lastActive: bumpActivity ? now : prev?.lastActive ?? now,
    visibility,
  };
  savePresenceMap(map);
}

/** @deprecated use reportPresence */
export function touchPresence(email: string): void {
  reportPresence(email, true);
}

export function getPresenceStatus(email: string): PresenceStatus {
  const entry = loadPresenceMap()[norm(email)];
  if (!entry) return "offline";
  const hb = new Date(entry.heartbeat).getTime();
  if (Number.isNaN(hb) || Date.now() - hb > HEARTBEAT_STALE_MS) return "offline";
  const active = new Date(entry.lastActive).getTime();
  const idle = Number.isNaN(active) ? true : Date.now() - active > AWAY_IDLE_MS;
  if (entry.visibility === "hidden" || idle) return "away";
  return "online";
}

export function isLikelyOnline(email: string): boolean {
  return getPresenceStatus(email) === "online";
}
