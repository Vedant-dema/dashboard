import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SessionUser } from "../auth/authStorage";
import {
  clearSession,
  ensureDemoUser,
  getSession,
  loginWithPassword,
  registerUser,
} from "../auth/authStorage";

type AuthContextValue = {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signup: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => getSession());

  useEffect(() => {
    ensureDemoUser();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = loginWithPassword(email, password);
    if (result.ok) {
      setUser(result.user);
      return { ok: true as const };
    }
    return result;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const reg = registerUser(email, password, name);
    if (!reg.ok) return reg;
    const result = loginWithPassword(email.trim().toLowerCase(), password);
    if (result.ok) {
      setUser(result.user);
      return { ok: true as const };
    }
    return { ok: false as const, error: result.error };
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    window.location.hash = "#/login";
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user != null,
      login,
      signup,
      logout,
    }),
    [user, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { setReturnHash, consumeReturnHash } from "../auth/authStorage";
