"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function useAuthGuard() {
  const router = useRouter();
  const { user, isLoading, refreshAuth } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    if (isLoading) {
      return;
    }

    // If user is already loaded from context, we're ready
    if (user) {
      if (active) {
        queueMicrotask(() => {
          if (active) setReady(true);
        });
      }
      return;
    }

    // Otherwise, try to refresh from server
    refreshAuth().then((authenticated) => {
      if (active && authenticated === false) {
        router.replace("/login");
      } else if (active) {
        setReady(true);
      }
    });

    return () => {
      active = false;
    };
  }, [user, isLoading, router, refreshAuth]);

  return ready;
}
