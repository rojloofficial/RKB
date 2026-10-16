"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminContext } from "@/components/admin/use-admin-context";
import { EditDeleteButtons } from "@/components/ui/action-buttons";
import { formatDisplayDate } from "@/lib/date";
import { AdminCouponCardsSkeleton } from "@/components/skeletons/admin-skeletons";

type Coupon = {
  _id?: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  validTill?: string;
  active: boolean;
  createdAt: string;
};

export default function CouponPage() {
  const router = useRouter();
  const me = useAdminContext();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [minPurchase, setMinPurchase] = useState<number | "">("");
  const [maxDiscount, setMaxDiscount] = useState<number | "">("");
  const [validTill, setValidTill] = useState("");

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/coupon", {
        credentials: "include",
      });

      if (response.status === 401) {
        router.replace("/admin/login");
        return;
      }

      const data = await response.json();
      setCoupons(data.coupons || []);
      setError("");
    } catch (err) {
      setError("Failed to load coupons");
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
      void loadCoupons();
    });
  }, [loadCoupons, me, router]);

  function handleEdit(coupon: Coupon) {
    setCode(coupon.code);
    setDiscountType(coupon.discountType);
    setDiscountValue(coupon.discountValue);
    setMinPurchase(coupon.minPurchase || "");
    setMaxDiscount(coupon.maxDiscount || "");
    setValidTill(coupon.validTill || "");
    setEditingId(coupon._id || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancel() {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMinPurchase("");
    setMaxDiscount("");
    setValidTill("");
    setEditingId(null);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      if (!code.trim() || discountValue === "") {
        setError("Code and discount value are required");
        return;
      }

      const response = await fetch("/api/admin/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountType,
          discountValue: Number(discountValue),
          minPurchase: minPurchase ? Number(minPurchase) : undefined,
          maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
          validTill: validTill || undefined,
          id: editingId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save coupon");
      }

      await loadCoupons();
      handleCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save coupon");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string | undefined) {
    if (!id) return;

    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const response = await fetch("/api/admin/coupon", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id }),
      });

      if (!response.ok) throw new Error("Failed to delete coupon");

      await loadCoupons();
      if (editingId === id) handleCancel();
    } catch (err) {
      setError("Failed to delete coupon");
      console.error(err);
    }
  }

  async function handleToggleActive(coupon: Coupon) {
    if (!coupon._id) return;

    try {
      setTogglingId(coupon._id);
      const response = await fetch("/api/admin/coupon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: coupon._id,
          active: !coupon.active,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update coupon status");
      }

      await loadCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update coupon status");
      console.error(err);
    } finally {
      setTogglingId(null);
    }
  }

  if (!me?.authenticated) return null;

  return (
    <main className="p-4 sm:p-6 lg:p-10 min-w-0 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Coupon <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Management</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Create discount promotional codes, percentages, and purchase caps.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs sm:text-sm font-semibold text-rose-300">
          {error}
        </div>
      )}

      {/* Add/Edit Coupon Form */}
      <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md">
        <h2 className="text-base sm:text-lg font-bold text-white">
          {editingId ? "Edit Coupon" : "Add New Coupon"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Coupon Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g., SUMMER50"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/40 transition"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/40 transition"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Discount Value
              </label>
              <input
                type="number"
                value={discountValue}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                }}
                onChange={(e) => setDiscountValue(e.target.value ? Number(e.target.value) : "")}
                placeholder={discountType === "percentage" ? "e.g., 10" : "e.g., 100"}
                min="0"
                step={discountType === "percentage" ? "0.5" : "1"}
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/40 transition"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Minimum Purchase (₹)
              </label>
              <input
                type="number"
                value={minPurchase}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                }}
                onChange={(e) => setMinPurchase(e.target.value ? Number(e.target.value) : "")}
                placeholder="Optional"
                min="0"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/40 transition"
              />
            </div>
          </div>

          {discountType === "percentage" && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Maximum Discount (₹)
              </label>
              <input
                type="number"
                value={maxDiscount}
                onKeyDown={(e) => {
                  if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
                }}
                onChange={(e) => setMaxDiscount(e.target.value ? Number(e.target.value) : "")}
                placeholder="Optional"
                min="0"
                className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/40 transition"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Valid Till (Date)
            </label>
            <input
              type="date"
              value={validTill}
              onChange={(e) => setValidTill(e.target.value)}
              className="w-full rounded-xl border border-white/15 bg-slate-800/90 px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-hidden focus:ring-1 focus:ring-amber-500/40 transition"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 px-6 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50 shadow-md transition cursor-pointer active:scale-[0.98]"
            >
              {submitting ? "Saving..." : editingId ? "Update Coupon" : "Add Coupon"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-6 py-2.5 text-sm font-semibold text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Coupons List */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-extrabold text-white">Active Coupons</h2>

        {loading ? (
          <AdminCouponCardsSkeleton />
        ) : coupons.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
            No coupons configured yet.
          </div>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <div
                key={coupon._id}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6 shadow-xl backdrop-blur-md transition-all hover:border-amber-500/30"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <h3 className="font-mono text-lg font-black text-amber-400 tracking-wider break-all">
                        {coupon.code}
                      </h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        coupon.active
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                          : "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                      }`}>
                        {coupon.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-slate-300">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Discount:</span>{" "}
                        <span className="font-bold text-white">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}%`
                            : `₹${coupon.discountValue}`}
                        </span>
                      </div>
                      {coupon.minPurchase && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Min Purchase:</span> ₹
                          {coupon.minPurchase}
                        </div>
                      )}
                      {coupon.maxDiscount && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Max Discount:</span> ₹
                          {coupon.maxDiscount}
                        </div>
                      )}
                      {coupon.validTill && (
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Valid Till:</span>{" "}
                          {formatDisplayDate(coupon.validTill)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-0 sm:ml-4 flex flex-wrap gap-2 shrink-0 items-center">
                    <EditDeleteButtons
                      onEdit={() => handleEdit(coupon)}
                      onDelete={() => handleDelete(coupon._id)}
                      direction="row"
                    />
                    <button
                      onClick={() => handleToggleActive(coupon)}
                      disabled={togglingId === coupon._id}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
                        coupon.active
                          ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
                          : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                      } disabled:opacity-60`}
                    >
                      {togglingId === coupon._id
                        ? "Updating..."
                        : coupon.active
                          ? "Deactivate"
                          : "Activate"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
