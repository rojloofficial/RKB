"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { formatDisplayDateTime } from "@/lib/date";
import { AdminPaymentHistoryCardsSkeleton } from "@/components/skeletons/admin-skeletons";

type PaymentHistory = {
  _id?: string;
  userEmail: string;
  userName?: string;
  userId: string;
  transactionId: string;
  upiId: string;
  upiName?: string;
  coins: number;
  amount: number;
  discount?: number;
  finalAmount: number;
  couponCode?: string;
  paymentRequestId: string;
  createdAt: string;
};

export default function PaymentHistoryPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/payment-history", {
        credentials: "include",
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await response.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
      setError("");
    } catch (err) {
      setError("Failed to load payment history");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (me === null) return;
    if (!me.authenticated) {
      router.replace("/admin/login");
      return;
    }

    queueMicrotask(() => {
      void loadHistory();
    });
  }, [loadHistory, me, router]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  async function handleDeleteByRange() {
    if (!deleteStartDate && !deleteEndDate) {
      setDeleteError("Please select at least a From Date or a To Date.");
      return;
    }
    if (deleteStartDate && deleteEndDate && deleteStartDate > deleteEndDate) {
      setDeleteError("From Date cannot be after To Date.");
      return;
    }
    const confirmMsg = `Are you sure you want to permanently delete payment history records between ${deleteStartDate || "the beginning"} and ${deleteEndDate || "today"} from the database?`;
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/payment-history", {
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
        setDeleteError(data.error || "Failed to delete payment history");
        return;
      }
      setFeedback({
        type: "success",
        message: `${data.count ?? 0} payment history record(s) deleted permanently from database!`,
      });
      setIsDeleteModalOpen(false);
      setDeleteStartDate("");
      setDeleteEndDate("");
      void loadHistory();
    } catch (err) {
      setDeleteError("Network error while deleting payment history");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAll() {
    if (!window.confirm("WARNING: Are you sure you want to delete ALL payment history from the database? This action cannot be undone.")) return;
    if (!window.confirm("Final Confirmation: Please confirm again to delete ALL payment history.")) return;

    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/payment-history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete all payment history");
        return;
      }
      setFeedback({
        type: "success",
        message: `All payment history records (${data.count ?? 0}) were deleted permanently from database!`,
      });
      setIsDeleteModalOpen(false);
      void loadHistory();
    } catch (err) {
      setDeleteError("Network error while deleting all payment history");
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const filteredHistory = history.filter((payment) => {
    const searchValue = searchEmail.toLowerCase();
    const nameValue = (payment.userName || "").toLowerCase();
    const emailValue = payment.userEmail.toLowerCase();
    return nameValue.includes(searchValue) || emailValue.includes(searchValue);
  });

  const totalAmount = filteredHistory.reduce((sum, p) => sum + p.amount, 0);
  const totalCoins = filteredHistory.reduce((sum, p) => sum + p.coins, 0);
  const totalDiscount = filteredHistory.reduce((sum, p) => sum + (p.discount || 0), 0);

  if (!me?.authenticated) return null;

  return (
    <main className="min-h-screen bg-red-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 min-w-0">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-black text-red-950">Payment History</h1>
          <div className="flex items-center gap-2">
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
            <button
              onClick={loadHistory}
              className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 cursor-pointer"
            >
              Refresh
            </button>
          </div>
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
          <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-900">
            {error}
          </div>
        )}

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-green-200 bg-white p-4">
            <p className="text-sm font-semibold text-green-700">Total Amount</p>
            <p className="mt-2 text-2xl font-black text-green-950">
              ₹{totalAmount.toFixed(2)}
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-white p-4">
            <p className="text-sm font-semibold text-blue-700">Total Coins</p>
            <p className="mt-2 text-2xl font-black text-blue-950">
              {totalCoins}
            </p>
          </div>
          <div className="rounded-2xl border border-yellow-200 bg-white p-4">
            <p className="text-sm font-semibold text-yellow-700">Total Discount</p>
            <p className="mt-2 text-2xl font-black text-yellow-950">
              ₹{totalDiscount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-6">
          <input
            type="text"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 placeholder-red-400 focus:border-red-500 focus:outline-none"
          />
        </div>

        {/* Payment History List */}
        <div className="mt-8 space-y-4">
          {loading ? (
            <AdminPaymentHistoryCardsSkeleton />
          ) : filteredHistory.length === 0 ? (
            <p className="text-red-900">
              No payment history found{searchEmail ? " for this name/email" : ""}.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((payment) => (
                <div
                  key={payment._id}
                  className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6 shadow-sm"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Email
                      </p>
                      <p className="mt-2 text-sm font-bold text-red-950 break-all">
                        {payment.userEmail}
                      </p>
                    </div>

                    <div className="rounded-xl bg-orange-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                        UPI Account
                      </p>
                      <p className="mt-2 text-base font-bold text-orange-950">
                        {payment.upiName || "Manual / Not provided"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        UPI ID
                      </p>
                      <p className="mt-2 text-sm font-bold break-all text-red-950">
                        {payment.upiId || "N/A"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        Amount Paid
                      </p>
                      <p className="mt-2 text-xl font-black text-green-950">
                        ₹{Number(payment.amount || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-red-200 pt-4 text-sm text-red-800">
                    <div>
                      <span className="font-semibold text-red-900">Coins:</span>{" "}
                      {payment.coins}
                    </div>
                    <div>
                      <span className="font-semibold text-red-900">Final Amount:</span>{" "}
                      ₹{Number(payment.finalAmount || 0).toFixed(2)}
                    </div>
                    <div>
                      <span className="font-semibold text-red-900">Date:</span>{" "}
                      {formatDisplayDateTime(payment.createdAt)}
                    </div>
                  </div>

                  {payment.discount && payment.discount > 0 && (
                    <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-900">
                      <span className="font-semibold">Discount:</span> ₹{Number(payment.discount).toFixed(2)}
                      {payment.couponCode ? ` • Coupon: ${payment.couponCode}` : ""}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-red-700">
                    <span className="font-semibold">Transaction ID:</span>{" "}
                    <span className="break-all">{payment.transactionId}</span>
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
                <h2 className="text-xl font-bold text-red-950">Delete Payment History</h2>
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
                Select from which date to date to delete payment history.
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
                ⚠️ This will permanently delete <strong>all payment history records</strong> from the database.
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
