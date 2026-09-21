"use client";

import { useEffect, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminContext, type AdminMe } from "@/components/admin/admin-context";

export type { AdminMe };

export function useAdminContext(redirectIfUnauthenticated = true) {
  const ctx = useContext(AdminContext);
  const me = ctx?.me ?? null;
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (
      redirectIfUnauthenticated &&
      me &&
      !me.authenticated &&
      pathname !== "/admin/login"
    ) {
      router.replace("/admin/login");
    }
  }, [me, redirectIfUnauthenticated, router, pathname]);

  return me;
}
