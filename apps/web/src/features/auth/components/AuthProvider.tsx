"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
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
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
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
  }, [pathname]);

  async function logout() {
    await requestLogout();
    setUser(null);
    setStatus("unauthenticated");
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ user, status, error, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
