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
        const res = await fetch("/api/payment-confirmation", {
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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <SectionPanel>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-neutral-900 sm:text-4xl">
            Payment History
          </h1>
          <Button
            variant="soft"
            onClick={() => router.push("/post-ad")}
            className="!text-black"
          >
            Back
          </Button>
        </div>

        {loading ? (
          <PaymentHistorySkeleton />
        ) : history.length === 0 ? (
          <p className="mt-6 rounded-[1.5rem] bg-neutral-100 p-5 text-neutral-600">
            You have no payments yet.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {history.map((item) => (
              <div
                key={item._id || item.transactionId}
                className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 text-sm text-neutral-800 min-w-0 flex-1">
                    <p className="break-all">
                      <span className="font-semibold text-neutral-900">Transaction ID:</span> {item.transactionId}
                    </p>
                    <p>
                      <span className="font-semibold text-neutral-900">Money Paid:</span> ₹{Number(item.amount || 0).toFixed(2)}
                    </p>
                    <p>
                      <span className="font-semibold text-neutral-900">Coins:</span> {item.coins}
                    </p>
                    <p>
                      <span className="font-semibold text-neutral-900">Status:</span>{" "}
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                          item.status === "confirmed"
                            ? "bg-neutral-900 text-white"
                            : item.status === "declined"
                              ? "bg-neutral-300 text-neutral-800"
                              : "bg-neutral-200 text-neutral-800"
                        }`}
                      >
                        {item.status === "confirmed"
                          ? "Confirmed"
                          : item.status === "declined"
                            ? "Declined"
                            : "Pending"}
                      </span>
                    </p>
                    {item.status === "declined" && (
                      <div className="mt-2 rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-2 text-xs text-neutral-800">
                        <span className="font-bold text-neutral-900">Message: </span>
                        {item.declinedReason || "Wrong Transaction ID"}
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-neutral-500">
                    <p>
                      <span className="font-semibold text-neutral-700">Date:</span>{" "}
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-GB") : "—"}
                    </p>
                    <p>
                      <span className="font-semibold text-neutral-700">Time:</span>{" "}
                      {item.createdAt ? new Date(item.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
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
