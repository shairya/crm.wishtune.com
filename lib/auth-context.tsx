"use client";

// Access token lives in memory only; the refresh token is an httpOnly
// cookie set by the API. apiFetch refreshes once on 401 and retries.

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5100/api/v1";

export type AuthUser = { id: number; fullName: string; email: string; role: string };

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const refreshing = useRef<Promise<boolean> | null>(null);

  const refresh = useCallback(async () => {
    // One refresh at a time, shared by every request that hit a 401.
    if (!refreshing.current) {
      refreshing.current = (async () => {
        try {
          const res = await fetch(`${API_URL}/auth/refresh-token`, { method: "POST", credentials: "include" });
          const data = await readJson(res);
          tokenRef.current = data.accessToken;
          setUser(data.user);
          return true;
        } catch {
          tokenRef.current = null;
          setUser(null);
          return false;
        } finally {
          setTimeout(() => {
            refreshing.current = null;
          }, 0);
        }
      })();
    }
    return refreshing.current;
  }, []);

  useEffect(() => {
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await readJson(res);
    tokenRef.current = data.accessToken;
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: "POST", credentials: "include" });
    } finally {
      tokenRef.current = null;
      setUser(null);
    }
  }, []);

  const apiFetch = useCallback(
    async (path: string, options: RequestInit = {}) => {
      const send = () =>
        fetch(`${API_URL}${path}`, {
          ...options,
          credentials: "include",
          headers: {
            ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {}),
            ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
          },
        });
      let res = await send();
      if (res.status === 401 && (await refresh())) res = await send();
      return res;
    },
    [refresh],
  );

  return <AuthContext.Provider value={{ user, isLoading, login, logout, apiFetch }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** GET helper with loading/error state. Pass null to skip. */
export function useApi<T>(path: string | null) {
  const { apiFetch } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiFetch(path)
      .then(readJson)
      .then((d) => !cancelled && setData(d as T))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [path, apiFetch, tick]);

  return { data, error, loading, reload: () => setTick((t) => t + 1) };
}

/** POST/PUT/PATCH/DELETE helper that throws the API's error message. */
export function useMutate() {
  const { apiFetch } = useAuth();
  return useCallback(
    async <T = unknown,>(path: string, method: string, body?: unknown): Promise<T> => {
      const res = await apiFetch(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      return (await readJson(res)) as T;
    },
    [apiFetch],
  );
}
