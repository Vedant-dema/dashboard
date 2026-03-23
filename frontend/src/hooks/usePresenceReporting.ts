import { useEffect, useRef } from "react";
import { reportPresence } from "../store/chatPresence";

const HEARTBEAT_MS = 25_000;
const ACTIVITY_THROTTLE_MS = 25_000;

/**
 * Pushes presence for the logged-in user while the dashboard is open (any page).
 * Heartbeat keeps “session alive”; throttled input marks activity for online vs away.
 */
export function usePresenceReporting(userEmail: string | undefined): void {
  const lastActivityThrottle = useRef(0);

  useEffect(() => {
    if (!userEmail) return;

    const ping = (bumpActivity: boolean) => reportPresence(userEmail, bumpActivity);

    ping(true);

    const interval = window.setInterval(() => ping(false), HEARTBEAT_MS);

    const onVisibility = () => ping(false);

    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityThrottle.current < ACTIVITY_THROTTLE_MS) return;
      lastActivityThrottle.current = now;
      ping(true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("pointerdown", onActivity, { passive: true });

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("pointerdown", onActivity);
    };
  }, [userEmail]);
}
