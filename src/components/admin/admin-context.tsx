"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AdminMe = {
  authenticated: boolean;
  role?: "main" | "subadmin";
  email?: string;
  permissions?: string[];
};

type AdminCtx = {
  me: AdminMe | null;
  refresh: () => Promise<void>;
};

const AdminContext = createContext<AdminCtx | null>(null);

const ADMIN_STORAGE_KEY = "rojlo_admin_me";

export function AdminProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AdminMe | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          setMe({ authenticated: false });
          try {
            localStorage.removeItem(ADMIN_STORAGE_KEY);
          } catch {}
        }
        return;
      }

      const data = (await res.json()) as AdminMe;
      setMe(data);
      if (data && data.authenticated) {
        try {
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      } else {
        try {
          localStorage.removeItem(ADMIN_STORAGE_KEY);
        } catch {}
      }
    } catch {
      setMe((prev) => prev ?? { authenticated: false });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed.authenticated === "boolean") {
            setMe(parsed);
          }
        }
      } catch {}
      void refresh();
    });
  }, [refresh]);

  return (
    <AdminContext.Provider value={{ me, refresh }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminRefresh() {
  const ctx = useContext(AdminContext);
  return ctx ? ctx.refresh : async () => {};
}

export { AdminContext };
