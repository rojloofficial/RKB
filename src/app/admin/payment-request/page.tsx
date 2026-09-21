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
    if (me === null) return; // Auth still resolving, wait
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }

    queueMicrotask(() => {
      void loadRequests(false);
      void loadUPIs();
    });

    // Visibility-aware background polling every 5 seconds (zero flicker)
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
      upiId: "surajkumar40407@ybl",
      name: "suraj",
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

      // Optimistic update
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

    setProcessingIds((prev) => ({ ...prev, [reqId]: "decline" }));

    try {
      const response = await fetch("/api/admin/payment-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action: "decline",
          id: reqId,
          reason: "Wrong Transaction ID",
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setFeedback({ type: "error", message: data.error || "Failed to decline payment" });
        return;
      }

      // Optimistic update
      setRequests((prev) =>
        prev.map((r) =>
          r._id === reqId
            ? { ...r, status: "declined", declinedReason: "Wrong Transaction ID" }
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
        return "bg-yellow-100 text-yellow-900";
      case "confirmed":
        return "bg-green-100 text-green-900";
      case "declined":
        return "bg-red-100 text-red-900";
      default:
        return "bg-gray-100 text-gray-900";
    }
  };

  if (!me?.authenticated) return null;

  return (
    <main className="min-h-screen bg-red-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 min-w-0">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-black text-red-950">Payment Requests</h1>
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900 transition-colors shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete History
          </button>
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-lg p-4 font-semibold text-sm transition-all shadow-xs ${
              feedback.type === "success"
                ? "bg-green-100 text-green-950 border border-green-300"
                : "bg-red-100 text-red-950 border border-red-300"
            }`}
          >
            {feedback.message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-900 border border-red-200">
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-2 flex-wrap">
          {(["all", "pending", "confirmed", "declined"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-4 py-2 font-semibold capitalize transition-colors ${
                filter === tab
                  ? "bg-red-600 text-white"
                  : "bg-white text-red-950 border border-red-200 hover:bg-red-50"
              }`}
            >
              {tab}
              <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-black/10 px-1.5 py-0.5 text-xs">
                {counts[tab]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          {loading ? (
            <AdminPaymentRequestCardsSkeleton />
          ) : filteredRequests.length === 0 ? (
            <p className="text-red-900">
              No payment requests found for {filter} status.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((request) => (
                <div
                  key={request._id}
                  className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                        <h3 className="text-lg font-bold text-red-950 break-all">
                          {request.userEmail}
                        </h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusBadge(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <span className="font-semibold text-red-700">
                            Transaction ID:
                          </span>{" "}
                          <span className="break-all text-red-900">
                            {request.transactionId}
                          </span>
                        </div>
                        <div>
                          <span className="font-semibold text-red-700">
                            Coins:
                          </span>{" "}
                          <span className="text-red-900">{request.coins}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-red-700">
                            Amount:
                          </span>{" "}
                          <span className="text-red-900">₹{request.amount}</span>
                        </div>
                        {request.discount && (
                          <div>
                            <span className="font-semibold text-red-700">
                              Discount:
                            </span>{" "}
                            <span className="text-red-900">₹{request.discount}</span>
                          </div>
                        )}
                        {request.couponCode && (
                          <div>
                            <span className="font-semibold text-red-700">
                              Coupon:
                            </span>{" "}
                            <span className="text-red-900">{request.couponCode}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-red-700">
                            Submitted:
                          </span>{" "}
                          <span className="text-red-900">
                            {formatDisplayDateTime(request.createdAt)}
                          </span>
                        </div>
                      </div>

                      {request.status === "declined" && (
                        <div className="mt-3 rounded-lg bg-red-50 p-3">
                          <p className="text-xs font-semibold text-red-700">
                            Decline Reason:
                          </p>
                          <p className="mt-1 text-sm text-red-900">
                            {request.declinedReason || "Wrong Transaction ID"}
                          </p>
                        </div>
                      )}

                      {request.status === "confirmed" && request.confirmedAt && (
                        <div className="mt-3 text-xs text-green-700">
                          Confirmed on {formatDisplayDateTime(request.confirmedAt)}
                        </div>
                      )}
                    </div>

                    {request.status === "pending" && (
                      <div className="flex w-full flex-col gap-2 sm:ml-4 sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleConfirm(request)}
                          disabled={Boolean(request._id && processingIds[request._id])}
                          className="whitespace-nowrap rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {request._id && processingIds[request._id] === "confirm" && (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          {request._id && processingIds[request._id] === "confirm" ? "Confirming..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecline(request)}
                          disabled={Boolean(request._id && processingIds[request._id])}
                          className="whitespace-nowrap rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {request._id && processingIds[request._id] === "decline" && (
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          )}
                          {request._id && processingIds[request._id] === "decline" ? "Declining..." : "Decline"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-red-200">
            <div className="flex items-start justify-between border-b border-red-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-red-950">Delete Payment Requests</h2>
                <p className="mt-1 text-xs text-red-700">Permanently remove records from the database.</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsDeleteModalOpen(false); setDeleteError(""); }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 cursor-pointer"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-lg bg-red-100 p-3 text-xs font-semibold text-red-900 border border-red-200">
                {deleteError}
              </div>
            )}

            {/* Option 1: Date Range Deletion */}
            <div className="mt-5 rounded-xl border border-red-100 bg-red-50/50 p-4">
              <h3 className="text-sm font-bold text-red-950">Option 1: Delete by Date Range</h3>
              <p className="mt-1 text-xs text-red-700">
                Select from which date to date to delete payment requests.
              </p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-red-900 mb-1">From Date</label>
                  <input
                    type="date"
                    value={deleteStartDate}
                    onChange={(e) => setDeleteStartDate(e.target.value)}
                    className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-950 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-red-900 mb-1">To Date</label>
                  <input
                    type="date"
                    value={deleteEndDate}
                    onChange={(e) => setDeleteEndDate(e.target.value)}
                    className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-950 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={deleting || (!deleteStartDate && !deleteEndDate)}
                onClick={handleDeleteByRange}
                className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {deleting ? "Deleting from database..." : "Delete History in Selected Date Range"}
              </button>
            </div>

            {/* Option 2: Delete All */}
            <div className="mt-4 rounded-xl border border-red-200 bg-red-100/60 p-4">
              <h3 className="text-sm font-bold text-red-950">Option 2: Delete All Payment History</h3>
              <p className="mt-1 text-xs text-red-800">
                ⚠️ This will permanently delete <strong>all payment requests</strong> from the database.
              </p>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAll}
                className="mt-3 w-full rounded-lg bg-red-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {deleting ? "Deleting from database..." : "Delete All Payment History"}
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={deleting}
                onClick={() => { setIsDeleteModalOpen(false); setDeleteError(""); }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
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

