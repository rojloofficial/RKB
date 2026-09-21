"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type VipMe = {
  authenticated: boolean;
  role?: "vip" | "admin";
  email?: string;
  hasStateAccess?: boolean;
  states?: string[];
  cities?: string[];
};

type VipCtx = {
  me: VipMe | null;
  refresh: () => Promise<void>;
};

const VipContext = createContext<VipCtx | null>(null);

const VIP_STORAGE_KEY = "rojlo_vip_me";

export function VipProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<VipMe | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/vip/me", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          setMe({ authenticated: false });
          try {
            localStorage.removeItem(VIP_STORAGE_KEY);
          } catch {}
        }
        return;
      }

      const data = (await res.json()) as VipMe;
      setMe(data);
      if (data && data.authenticated) {
        try {
          localStorage.setItem(VIP_STORAGE_KEY, JSON.stringify(data));
        } catch {}
      } else {
        try {
          localStorage.removeItem(VIP_STORAGE_KEY);
        } catch {}
      }
    } catch {
      setMe((prev) => prev ?? { authenticated: false });
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem(VIP_STORAGE_KEY);
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
    <VipContext.Provider value={{ me, refresh }}>
      {children}
    </VipContext.Provider>
  );
}

export function useVipRefresh() {
  const ctx = useContext(VipContext);
  return ctx ? ctx.refresh : async () => {};
}

export { VipContext };
