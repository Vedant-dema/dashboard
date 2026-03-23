/**
 * Demo chat: persisted in localStorage + BroadcastChannel for instant cross-tab sync.
 * Replace with WebSocket + API when the backend is available.
 */

import { getPresenceStatus } from "./chatPresence";

const STORAGE_KEY = "dema-chat-v1";
const BC_NAME = "dema-dashboard-chat";
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export type ChatMessageAttachment = {
  kind: "image" | "file";
  fileName: string;
  mimeType: string;
  dataUrl: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderEmail: string;
  senderName: string;
  text: string;
  attachment?: ChatMessageAttachment;
  createdAt: string;
};

export type ChatConversation = {
  id: string;
  kind: "direct" | "group";
  title: string;
  memberEmails: string[];
  memberNames: Record<string, string>;
  messages: ChatMessage[];
  updatedAt: string;
};

export type ChatState = {
  conversations: ChatConversation[];
  /** viewer email (lowercase) -> conversation id -> unread count */
  unreadByUser: Record<string, Record<string, number>>;
  /**
   * conversation id -> user email -> id of newest message they have opened (inclusive).
   * Used for outgoing tick marks (read receipts demo).
   */
  readCursor: Record<string, Record<string, string>>;
};

/** WhatsApp-style ticks for messages you sent */
export type OutgoingMessageTick = "single_grey" | "double_grey" | "double_blue";

const listeners = new Set<() => void>();

let bc: BroadcastChannel | null = null;
try {
  bc = new BroadcastChannel(BC_NAME);
  bc.onmessage = () => {
    listeners.forEach((fn) => fn());
    window.dispatchEvent(new CustomEvent("dema-chat-changed"));
  };
} catch {
  bc = null;
}

function emit() {
  listeners.forEach((fn) => fn());
  window.dispatchEvent(new CustomEvent("dema-chat-changed"));
  try {
    bc?.postMessage({ t: 1 });
  } catch {
    // ignore
  }
}

function emptyState(): ChatState {
  return { conversations: [], unreadByUser: {}, readCursor: {} };
}

export function loadChatState(): ChatState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return emptyState();
    const o = parsed as Partial<ChatState>;
    if (!Array.isArray(o.conversations)) return emptyState();
    const unreadByUser =
      o.unreadByUser && typeof o.unreadByUser === "object" ? o.unreadByUser : {};
    const readCursor =
      o.readCursor && typeof o.readCursor === "object" ? o.readCursor : {};
    return {
      conversations: o.conversations as ChatConversation[],
      unreadByUser,
      readCursor,
    };
  } catch {
    return emptyState();
  }
}

function saveChatState(state: ChatState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded etc.
  }
  emit();
}

export function subscribeChat(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function normEmail(e: string): string {
  return e.trim().toLowerCase();
}

function directConversationId(a: string, b: string): string {
  const [x, y] = [normEmail(a), normEmail(b)].sort();
  return `dm:${x}::${y}`;
}

function newId(): string {
  return crypto.randomUUID();
}

export function getUnreadTotalForUser(userEmail: string): number {
  const u = normEmail(userEmail);
  const map = loadChatState().unreadByUser[u] || {};
  return Object.values(map).reduce((s, n) => s + (typeof n === "number" ? n : 0), 0);
}

export function getOrCreateDirectConversation(
  currentEmail: string,
  currentName: string,
  otherEmail: string,
  otherName: string
): ChatConversation {
  const state = loadChatState();
  const id = directConversationId(currentEmail, otherEmail);
  let conv = state.conversations.find((c) => c.id === id);
  if (conv) return conv;

  const ne = normEmail(currentEmail);
  const no = normEmail(otherEmail);
  const emails = ne === no ? [ne] : [ne, no].sort((a, b) => a.localeCompare(b));
  conv = {
    id,
    kind: "direct",
    title: otherName,
    memberEmails: emails,
    memberNames: {
      [ne]: currentName,
      [no]: otherName,
    },
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  state.conversations.unshift(conv);
  saveChatState(state);
  return conv;
}

export function createGroupConversation(
  currentEmail: string,
  currentName: string,
  title: string,
  members: { email: string; name: string }[]
): ChatConversation {
  const state = loadChatState();
  const ne = normEmail(currentEmail);
  const memberNames: Record<string, string> = { [ne]: currentName };
  const emailsSet = new Set<string>([ne]);
  for (const m of members) {
    const e = normEmail(m.email);
    emailsSet.add(e);
    memberNames[e] = m.name;
  }
  const conv: ChatConversation = {
    id: `grp:${newId()}`,
    kind: "group",
    title: title.trim() || "Gruppe",
    memberEmails: [...emailsSet],
    memberNames,
    messages: [],
    updatedAt: new Date().toISOString(),
  };
  state.conversations.unshift(conv);
  saveChatState(state);
  return conv;
}

function bumpUnread(
  unreadByUser: Record<string, Record<string, number>>,
  convId: string,
  senderEmail: string,
  memberEmails: string[]
): void {
  const ns = normEmail(senderEmail);
  for (const raw of memberEmails) {
    const m = normEmail(raw);
    if (m === ns) continue;
    if (!unreadByUser[m]) unreadByUser[m] = {};
    unreadByUser[m][convId] = (unreadByUser[m][convId] || 0) + 1;
  }
}

export function sendChatMessage(
  conversationId: string,
  senderEmail: string,
  senderName: string,
  text: string,
  attachment?: ChatMessageAttachment
): { ok: true } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed && !attachment) return { ok: false, error: "empty" };
  if (attachment && attachment.dataUrl.length > MAX_ATTACHMENT_BYTES * 1.37) {
    return { ok: false, error: "too_large" };
  }

  const state = loadChatState();
  const idx = state.conversations.findIndex((c) => c.id === conversationId);
  if (idx < 0) return { ok: false, error: "not_found" };

  const conv = state.conversations[idx];
  const msg: ChatMessage = {
    id: newId(),
    conversationId,
    senderEmail: normEmail(senderEmail),
    senderName: senderName,
    text: trimmed,
    attachment,
    createdAt: new Date().toISOString(),
  };
  conv.messages = [...conv.messages, msg];
  conv.updatedAt = msg.createdAt;
  bumpUnread(state.unreadByUser, conv.id, senderEmail, conv.memberEmails);
  state.conversations = [conv, ...state.conversations.filter((_, i) => i !== idx)];
  saveChatState(state);
  return { ok: true };
}

function messageIndex(conv: ChatConversation, messageId: string): number {
  return conv.messages.findIndex((m) => m.id === messageId);
}

/** True if this message is at or before the peer's read cursor in the conversation order. */
export function isMessageReadByUser(
  conv: ChatConversation,
  messageId: string,
  readerEmail: string,
  state: ChatState
): boolean {
  const cursorId = state.readCursor[conv.id]?.[normEmail(readerEmail)];
  if (!cursorId) return false;
  const mi = messageIndex(conv, messageId);
  const ci = messageIndex(conv, cursorId);
  if (mi < 0 || ci < 0) return false;
  return mi <= ci;
}

export function markConversationRead(userEmail: string, conversationId: string): void {
  const state = loadChatState();
  const u = normEmail(userEmail);
  if (!state.unreadByUser[u]) state.unreadByUser[u] = {};
  state.unreadByUser[u][conversationId] = 0;

  const conv = state.conversations.find((c) => c.id === conversationId);
  const last = conv?.messages.length ? conv.messages[conv.messages.length - 1] : null;
  if (last) {
    if (!state.readCursor[conversationId]) state.readCursor[conversationId] = {};
    state.readCursor[conversationId][u] = last.id;
  }

  saveChatState(state);
}

export function unreadForConversation(userEmail: string, conversationId: string): number {
  const u = normEmail(userEmail);
  return loadChatState().unreadByUser[u]?.[conversationId] || 0;
}

/**
 * Outgoing message ticks (WhatsApp-style):
 * - single grey: recipient(s) offline — “sent”
 * - double grey: recipient reachable but chat not read to this message — “delivered”
 * - double blue: read (read cursor past this message)
 */
export function getOutgoingMessageTick(
  conv: ChatConversation,
  message: ChatMessage,
  myEmail: string,
  state: ChatState
): OutgoingMessageTick {
  if (normEmail(message.senderEmail) !== normEmail(myEmail)) {
    return "double_grey";
  }

  const others = conv.memberEmails.filter((e) => normEmail(e) !== normEmail(myEmail));
  if (others.length === 0) return "double_blue";

  if (conv.kind === "direct") {
    const peer = others[0];
    if (getPresenceStatus(peer) === "offline") {
      return "single_grey";
    }
    if (isMessageReadByUser(conv, message.id, peer, state)) {
      return "double_blue";
    }
    return "double_grey";
  }

  const allOffline = others.every((e) => getPresenceStatus(e) === "offline");
  if (allOffline) return "single_grey";
  const allRead = others.every((e) => isMessageReadByUser(conv, message.id, e, state));
  if (allRead) return "double_blue";
  return "double_grey";
}

export async function compressImageFile(file: File, maxW = 1200, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxW / bitmap.width);
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return fileToDataUrl(file);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

export async function fileToChatAttachment(file: File): Promise<
  { ok: true; attachment: ChatMessageAttachment } | { ok: false; error: "too_large" | "read" }
> {
  if (file.size > MAX_ATTACHMENT_BYTES) return { ok: false, error: "too_large" };
  try {
    if (file.type.startsWith("image/")) {
      const dataUrl = await compressImageFile(file);
      return {
        ok: true,
        attachment: {
          kind: "image",
          fileName: file.name || "image.jpg",
          mimeType: "image/jpeg",
          dataUrl,
        },
      };
    }
    const dataUrl = await fileToDataUrl(file);
    return {
      ok: true,
      attachment: {
        kind: "file",
        fileName: file.name || "file",
        mimeType: file.type || "application/octet-stream",
        dataUrl,
      },
    };
  } catch {
    return { ok: false, error: "read" };
  }
}
