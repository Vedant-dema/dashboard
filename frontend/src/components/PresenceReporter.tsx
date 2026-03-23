import { useAuth } from "../contexts/AuthContext";
import { usePresenceReporting } from "../hooks/usePresenceReporting";

/** Mount inside authenticated shell so every page updates presence. */
export function PresenceReporter() {
  const { user } = useAuth();
  usePresenceReporting(user?.email);
  return null;
}
