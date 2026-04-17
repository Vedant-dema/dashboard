import { useEffect, useMemo, useReducer } from "react";
import { getUnreadTotalForUser, loadChatState, subscribeChat, type ChatState } from "../store/chatStore";
import { CHAT_PRESENCE_STORAGE_KEY } from "../store/chatPresence";

function useChatVersion(includePresence: boolean): number {
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onBump = () => bump();
    const off = subscribeChat(onBump);
    if (includePresence) {
      window.addEventListener("dema-presence-changed", onBump);
    }
    const onStorage = (e: StorageEvent) => {
      if (includePresence && e.key === CHAT_PRESENCE_STORAGE_KEY) onBump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      off();
      if (includePresence) {
        window.removeEventListener("dema-presence-changed", onBump);
      }
      window.removeEventListener("storage", onStorage);
    };
  }, [includePresence]);
  return version;
}

/** Re-render when chat or presence storage changes (cross-tab + BroadcastChannel). */
export function useChatSync(): ChatState {
  const version = useChatVersion(true);
  return useMemo(() => loadChatState(), [version]);
}

/** Header only needs unread count, so presence heartbeats should not re-render it. */
export function useChatUnreadTotal(userEmail: string | undefined): number {
  const version = useChatVersion(false);
  return useMemo(() => (userEmail ? getUnreadTotalForUser(userEmail) : 0), [userEmail, version]);
}
