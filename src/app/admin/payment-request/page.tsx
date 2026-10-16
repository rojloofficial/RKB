"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";
import { AdminPaymentRequestCardsSkeleton } from "@/components/skeletons/admin-skeletons";

type PaymentRequest = {
  _id?: string;
  userEmail: string;
  userId: string;
  transactionId: string;
  coins: number;
  amount: number;
  discount?: number;
  couponCode?: string;
  status: "pending" | "confirmed" | "declined";
  createdAt: string;
  confirmedAt?: string;
  declinedReason?: string;
};

type UPI = {
  _id?: string;
  upiId: string;
  name: string;
  qrCode: string;
};

export default function PaymentRequestPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [upis, setUpis] = useState<UPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "declined">("pending");
  const [processingIds, setProcessingIds] = useState<Record<string, "confirm" | "decline">>({});
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const isPollingRef = useRef(false);

  const loadRequests = useCallback(async (silent = false) => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    if (!silent) setLoading(true);

    try {
      const response = await fetch("/api/admin/payment-request", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setRequests(Array.isArray(data.requests) ? data.requests : []);
        setError("");
      }
    } catch (err) {
      if (!silent) {
        setError("Failed to load payment requests");
      }
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
      isPollingRef.current = false;
    }
  }, [router]);

  const loadUPIs = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/upi", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUpis(data.upis || []);
      }
    } catch (err) {
      console.error("Failed to load UPIs:", err);
    }
  }, []);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }

    queueMicrotask(() => {
      void loadRequests(false);
      void loadUPIs();
    });

    const interval = setInterval(() => {
      if (!document.hidden) {
        void loadRequests(true);
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void loadRequests(true);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "rojlo_coin_update") {
        void loadRequests(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadRequests, loadUPIs, me, router]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function handleConfirm(request: PaymentRequest) {
    const reqId = request._id;
    if (!reqId || processingIds[reqId]) return;

    setProcessingIds((prev) => ({ ...prev, [reqId]: "confirm" }));

    const upi = upis[0] ?? {
      upiId: "",
      name: "",
    };

    try {
      const response = await fetch("/api/admin/payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "confirm",
          id: reqId,
          coins: request.coins,
          userId: request.userId,
          upiId: upi.upiId,
          upiName: upi.name,
          userName: "",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFeedback({ type: "error", message: data.error || "Failed to confirm payment" });
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r._id === reqId
            ? { ...r, status: "confirmed", confirmedAt: new Date().toISOString() }
            : r
        )
      );

      setFeedback({ type: "success", message: `Payment for ${request.userEmail} confirmed successfully!` });

      window.dispatchEvent(new CustomEvent("coins:updated"));
      window.localStorage.setItem("rojlo_coin_update", "confirmed");

      void loadRequests(true);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to confirm payment" });
      console.error(err);
    } finally {
      setProcessingIds((prev) => {
        const next = { ...prev };
        delete next[reqId];
        return next;
      });
    }
  }

  async function handleDecline(request: PaymentRequest) {
    const reqId = request._id;
    if (!reqId || processingIds[reqId]) return;

    const customReason = window.prompt(
      "Enter decline reason (or click OK for default 'Wrong Transaction ID'):",
      "Wrong Transaction ID"
    );
    if (customReason === null) return;

    const reasonToUse = customReason.trim() || "Wrong Transaction ID";

    setProcessingIds((prev) => ({ ...prev, [reqId]: "decline" }));

    try {
      const response = await fetch("/api/admin/payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "decline",
          id: reqId,
          reason: reasonToUse,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFeedback({ type: "error", message: data.error || "Failed to decline payment" });
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r._id === reqId
            ? { ...r, status: "declined", declinedReason: reasonToUse }
            : r
        )
      );

      setFeedback({ type: "success", message: `Payment for ${request.userEmail} declined.` });

      void loadRequests(true);
    } catch (err) {
      setFeedback({ type: "error", message: "Failed to decline payment" });
      console.error(err);
    } finally {
      setProcessingIds((prev) => {
        const next = { ...prev };
        delete next[reqId];
        return next;
      });
    }
  }

  async function handleDeleteByRange() {
    if (!deleteStartDate && !deleteEndDate) {
      setDeleteError("Please select at least a From Date or a To Date.");
      return;
    }
    if (deleteStartDate && deleteEndDate && deleteStartDate > deleteEndDate) {
      setDeleteError("From Date cannot be after To Date.");
      return;
    }
    const confirmMsg = `Are you sure you want to permanently delete payment requests between ${deleteStartDate || "the beginning"} and ${deleteEndDate || "today"} from the database?`;
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/payment-request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          startDate: deleteStartDate || undefined,
          endDate: deleteEndDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete payment requests");
        return;
      }
      setFeedback({
        type: "success",
        message: `${data.count ?? 0} payment request(s) deleted permanently from database!`,
      });
      setIsDeleteModalOpen(false);
      setDeleteStartDate("");
      setDeleteEndDate("");
      void loadRequests(true);
    } catch (err) {
      setDeleteError("Network error while deleting payment requests");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL payment requests from the database? This action cannot be undone.")) return;
    if (!window.confirm("Final Confirmation: Please confirm again to delete ALL payment requests.")) return;

    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/payment-request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete all payment requests");
        return;
      }
      setFeedback({
        type: "success",
        message: `All payment requests (${data.count ?? 0}) were deleted permanently from database!`,
      });
      setIsDeleteModalOpen(false);
      void loadRequests(true);
    } catch (err) {
      setDeleteError("Network error while deleting all payment requests");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const filteredRequests = requests.filter(
    (r) => filter === "all" || r.status === filter
  );

  const counts = {
    all: requests.length,
    pending: requests.filter((r) => r.status === "pending").length,
    confirmed: requests.filter((r) => r.status === "confirmed").length,
    declined: requests.filter((r) => r.status === "declined").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-amber-500/15 border border-amber-500/30 text-amber-400";
      case "confirmed":
        return "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400";
      case "declined":
        return "bg-rose-500/15 border border-rose-500/30 text-rose-400";
      default:
        return "bg-slate-800 border border-white/10 text-slate-300";
    }
  };

  if (!me?.authenticated) return null;

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Payment <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Requests</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Verify UPI transaction IDs, approve coin credits, or decline invalid submissions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/20 hover:bg-rose-500/30 px-4 py-2.5 text-xs sm:text-sm font-bold text-rose-300 transition shadow-xs cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span>Delete Records</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-xl p-4 font-semibold text-xs sm:text-sm transition-all shadow-xs border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 border-rose-500/30"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 p-4 text-xs sm:text-sm font-semibold text-rose-300 border border-rose-500/30">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mt-6 flex gap-2 flex-wrap">
        {(["all", "pending", "confirmed", "declined"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold capitalize transition-all ${
              filter === tab
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md"
                : "bg-slate-800/70 text-slate-300 border border-white/10 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {tab}
            <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-black/20 px-1.5 py-0.5 text-xs">
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Cards List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <AdminPaymentRequestCardsSkeleton />
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
            No payment requests found for {filter} status.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((request) => (
              <div
                key={request._id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/30"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 className="text-base sm:text-lg font-bold text-white break-all">
                        {request.userEmail}
                      </h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Transaction ID:
                        </span>{" "}
                        <span className="font-mono font-semibold text-amber-400 break-all">
                          {request.transactionId}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Coins:
                        </span>{" "}
                        <span className="font-bold text-white">🪙 {request.coins}</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Amount:
                        </span>{" "}
                        <span className="font-bold text-white">₹{request.amount}</span>
                      </div>
                      {request.discount && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Discount:
                          </span>{" "}
                          <span className="font-semibold text-emerald-400">₹{request.discount}</span>
                        </div>
                      )}
                      {request.couponCode && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Coupon:
                          </span>{" "}
                          <span className="font-mono text-amber-300">{request.couponCode}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Submitted:
                        </span>{" "}
                        <span className="text-slate-300">
                          {formatDisplayDateTime(request.createdAt)}
                        </span>
                      </div>
                    </div>

                    {request.status === "declined" && (
                      <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
                        <p className="text-xs font-bold uppercase tracking-wider text-rose-400">
                          Decline Reason:
                        </p>
                        <p className="mt-1 text-xs sm:text-sm text-rose-200">
                          {request.declinedReason || "Wrong Transaction ID"}
                        </p>
                      </div>
                    )}

                    {request.status === "confirmed" && request.confirmedAt && (
                      <div className="mt-3 text-xs text-emerald-400 font-medium">
                        ✓ Confirmed on {formatDisplayDateTime(request.confirmedAt)}
                      </div>
                    )}
                  </div>

                  {request.status === "pending" && (
                    <div className="flex w-full flex-row sm:flex-col gap-2 sm:ml-4 sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleConfirm(request)}
                        disabled={Boolean(request._id && processingIds[request._id])}
                        className="flex-1 sm:flex-none whitespace-nowrap rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition active:scale-[0.98]"
                      >
                        {request._id && processingIds[request._id] === "confirm" && (
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        <span>{request._id && processingIds[request._id] === "confirm" ? "Confirming..." : "Confirm"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecline(request)}
                        disabled={Boolean(request._id && processingIds[request._id])}
                        className="flex-1 sm:flex-none whitespace-nowrap rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 px-4 py-2 text-xs sm:text-sm font-semibold text-rose-300 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        {request._id && processingIds[request._id] === "decline" && (
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        <span>{request._id && processingIds[request._id] === "decline" ? "Declining..." : "Decline"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 p-6 shadow-2xl border border-white/15 text-white">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Delete Payment Requests</h2>
                <p className="mt-1 text-xs text-slate-400">Permanently remove records from the database.</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsDeleteModalOpen(false); setDeleteError(""); }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer transition"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 border border-rose-500/30">
                {deleteError}
              </div>
            )}

            {/* Option 1: Date Range Deletion */}
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-800/60 p-4">
              <h3 className="text-sm font-bold text-white">Option 1: Delete by Date Range</h3>
              <p className="mt-1 text-xs text-slate-400">
                Select from which date to date to delete payment requests.
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">From Date</label>
                  <input
                    type="date"
                    value={deleteStartDate}
                    onChange={(e) => setDeleteStartDate(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">To Date</label>
                  <input
                    type="date"
                    value={deleteEndDate}
                    onChange={(e) => setDeleteEndDate(e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={deleting || (!deleteStartDate && !deleteEndDate)}
                onClick={handleDeleteByRange}
                className="mt-4 w-full rounded-xl border border-rose-500/30 bg-rose-500/15 hover:bg-rose-500/25 px-4 py-2.5 text-xs sm:text-sm font-semibold text-rose-300 disabled:opacity-50 transition cursor-pointer"
              >
                {deleting ? "Deleting from database..." : "Delete History in Selected Date Range"}
              </button>
            </div>

            {/* Option 2: Delete All */}
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
              <h3 className="text-sm font-bold text-white">Option 2: Delete All Payment History</h3>
              <p className="mt-1 text-xs text-rose-300">
                ⚠️ This will permanently delete <strong>all payment requests</strong> from the database.
              </p>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAll}
                className="mt-3 w-full rounded-xl bg-rose-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition cursor-pointer"
              >
                {deleting ? "Deleting from database..." : "Delete All Payment History"}
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => { setIsDeleteModalOpen(false); setDeleteError(""); }}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/10 cursor-pointer transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
