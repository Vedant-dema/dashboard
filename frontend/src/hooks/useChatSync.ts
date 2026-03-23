import { useEffect, useReducer } from "react";
import { loadChatState, subscribeChat, type ChatState } from "../store/chatStore";
import { CHAT_PRESENCE_STORAGE_KEY } from "../store/chatPresence";

/** Re-render when chat or presence storage changes (cross-tab + BroadcastChannel). */
export function useChatSync(): ChatState {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const onBump = () => bump();
    const off = subscribeChat(onBump);
    window.addEventListener("dema-chat-changed", onBump);
    window.addEventListener("dema-presence-changed", onBump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CHAT_PRESENCE_STORAGE_KEY) onBump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      off();
      window.removeEventListener("dema-chat-changed", onBump);
      window.removeEventListener("dema-presence-changed", onBump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return loadChatState();
}
