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

  const totalAmount = filteredHistory.reduce((sum, p) => sum + (p.finalAmount ?? p.amount), 0);
  const totalCoins = filteredHistory.reduce((sum, p) => sum + p.coins, 0);
  const totalDiscount = filteredHistory.reduce((sum, p) => sum + (p.discount || 0), 0);

  if (!me?.authenticated) return null;

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Payment <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">History</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Archived record of all verified coin purchases, transaction IDs, and discounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={loadHistory}
            className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 cursor-pointer transition"
          >
            Refresh
          </button>
        </div>
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

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Net Amount</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
            ₹{totalAmount.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Coins Credited</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            🪙 {totalCoins}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Discount Given</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">
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
          className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 outline-none transition"
        />
      </div>

      {/* Payment History List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <AdminPaymentHistoryCardsSkeleton />
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
            No payment history found{searchEmail ? " matching this query" : ""}.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((payment) => (
              <div
                key={payment._id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/30"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      User Email
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white break-all">
                      {payment.userEmail}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      UPI Gateway Name
                    </p>
                    <p className="mt-2 text-sm font-bold text-slate-200">
                      {payment.upiName || "Direct / Manual"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Merchant UPI ID
                    </p>
                    <p className="mt-2 text-sm font-mono text-amber-400 break-all">
                      {payment.upiId || "N/A"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                      Amount Paid
                    </p>
                    <p className="mt-2 text-xl font-black text-emerald-400">
                      ₹{Number(payment.amount || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs sm:text-sm text-slate-300">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Coins:</span>{" "}
                    <span className="font-bold text-white">🪙 {payment.coins}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Final Amount:</span>{" "}
                    <span className="font-bold text-white">₹{Number(payment.finalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Date:</span>{" "}
                    <span className="text-slate-300">{formatDisplayDateTime(payment.createdAt)}</span>
                  </div>
                </div>

                {payment.discount && payment.discount > 0 && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
                    <span className="font-bold uppercase tracking-wider">Discount:</span> ₹{Number(payment.discount).toFixed(2)}
                    {payment.couponCode ? ` • Coupon: ${payment.couponCode}` : ""}
                  </div>
                )}

                <div className="mt-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-400">Transaction ID:</span>{" "}
                  <span className="font-mono text-slate-300 break-all">{payment.transactionId}</span>
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
                <h2 className="text-xl font-bold text-white">Delete Payment History</h2>
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
                Select from which date to date to delete payment history.
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
                ⚠️ This will permanently delete <strong>all payment history records</strong> from the database.
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
