"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import { useAuthGuard } from "@/components/post-ad/use-auth-guard";
import { PaymentHistorySkeleton } from "@/components/skeletons/post-ad-skeletons";

type PaymentHistoryItem = {
  _id?: string;
  userEmail: string;
  userId: string;
  transactionId: string;
  upiId?: string;
  upiName?: string;
  coins: number;
  amount: number;
  discount?: number;
  finalAmount?: number;
  couponCode?: string;
  status?: "pending" | "confirmed" | "declined";
  createdAt?: string;
  confirmedAt?: string;
  declinedReason?: string;
};

export default function Page() {
  const router = useRouter();
  const ready = useAuthGuard();
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function load() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("rojlo_auth_token") : null;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        let storedEmail = "";
        let storedId = "";
        try {
          const parsed = JSON.parse(localStorage.getItem("rojlo_auth_user") || "{}");
          storedEmail = parsed?.email || "";
          storedId = parsed?._id || "";
        } catch {}

        const queryParams = new URLSearchParams();
        if (storedEmail) queryParams.set("email", storedEmail);
        if (storedId) queryParams.set("userId", storedId);
        const queryStr = queryParams.toString() ? `?${queryParams.toString()}` : "";

        const res = await fetch(`/api/payment-confirmation${queryStr}`, {
          headers,
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.replace("/login");
            return;
          }
          if (!cancelled) setHistory([]);
          return;
        }

        const data = await res.json();
        const requests = Array.isArray(data.requests) ? data.requests : [];
        if (!cancelled) {
          setHistory(requests);
          if (requests.some((r: PaymentHistoryItem) => r.status === "confirmed")) {
            window.dispatchEvent(new CustomEvent("coins:updated"));
          }
        }
      } catch {
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    // Auto-refresh every 5 seconds so status changes (Pending -> Confirmed/Declined) reflect live
    const interval = setInterval(load, 5000);
    const onFocus = () => void load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "rojlo_coin_update") void load();
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [ready, router]);

  if (!ready) return null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionPanel className="p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Transaction Records
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Live ledger of coin purchases, UPI references, and verification statuses.
            </p>
          </div>
          <Button
            variant="soft"
            size="sm"
            onClick={() => router.push("/post-ad")}
            className="border border-white/10 text-slate-300 hover:text-white"
          >
            Back to Hub
          </Button>
        </div>

        {loading ? (
          <div className="mt-6">
            <PaymentHistorySkeleton />
          </div>
        ) : history.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-white/15 bg-slate-950/40 p-8 text-center sm:p-12">
            <span className="text-3xl">🧾</span>
            <p className="mt-2 text-base font-bold text-white">No transactions recorded yet</p>
            <p className="mt-1 text-xs text-slate-400">When you buy coins, your payment references and approvals will appear here.</p>
            <div className="mt-5">
              <Button href="/post-ad/buy-coin" variant="solid" size="sm" className="!text-white font-bold">
                Buy Coins
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {history.map((item) => (
              <div
                key={item._id || item.transactionId}
                className="rounded-2xl border border-white/10 bg-slate-950/70 p-5 shadow-lg transition hover:border-amber-500/30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 text-xs sm:text-sm text-slate-300 min-w-0 flex-1">
                    <p className="break-all">
                      <span className="font-bold text-slate-400 uppercase tracking-wider text-[11px]">UTR / Txn ID:</span>{" "}
                      <span className="font-mono text-white font-bold">{item.transactionId}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <p>
                        <span className="text-slate-400 text-xs">Amount:</span>{" "}
                        <strong className="text-white font-black">₹{Number(item.amount || 0).toFixed(2)}</strong>
                      </p>
                      <p>
                        <span className="text-slate-400 text-xs">Coins:</span>{" "}
                        <strong className="text-amber-400 font-black">{item.coins}</strong>
                      </p>
                    </div>
                    <div>
                      <span
                        className={`rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-sm ${
                          item.status === "confirmed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : item.status === "declined"
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        <span className={`size-1.5 rounded-full ${
                          item.status === "confirmed"
                            ? "bg-emerald-400"
                            : item.status === "declined"
                              ? "bg-rose-400"
                              : "bg-amber-400 animate-pulse"
                        }`} />
                        {item.status === "confirmed"
                          ? "Confirmed"
                          : item.status === "declined"
                            ? "Declined"
                            : "Pending Verification"}
                      </span>
                    </div>
                    {item.status === "declined" && (
                      <div className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
                        <span className="font-bold text-rose-200">Decline Reason: </span>
                        {item.declinedReason || "Wrong Transaction ID"}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 sm:text-right space-y-0.5">
                    <p>
                      Date: <span className="text-white font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "—"}</span>
                    </p>
                    <p>
                      Time: <span className="text-white font-medium">{item.createdAt ? new Date(item.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
    </main>
  );
}
