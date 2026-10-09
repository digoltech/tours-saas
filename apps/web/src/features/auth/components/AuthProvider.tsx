"use client";

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  logout as requestLogout,
} from "../services/api-client";
import type { AuthStatus, AuthUser } from "../types";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [status, setStatus] = useState<AuthStatus>(
    initialUser ? "authenticated" : "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (initialUser) return;
    let active = true;
    getCurrentUser()
      .then((nextUser) => {
        if (active) {
          setUser(nextUser);
          setStatus("authenticated");
        }
      })
      .catch(() => {
        if (active) {
          setStatus("unauthenticated");
          setError(null);
        }
      });
    return () => {
      active = false;
    };
  }, [initialUser]);

  const logout = useCallback(async () => {
    await requestLogout();
    setUser(null);
    setStatus("unauthenticated");
    router.push("/auth/login");
    router.refresh();
  }, [router]);

  const refreshUser = useCallback(async () => {
    setUser(await getCurrentUser());
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, status, error, logout, refreshUser }),
    [user, status, error, logout, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
