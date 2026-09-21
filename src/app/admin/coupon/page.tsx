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
    <main className="min-h-screen bg-red-50 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 min-w-0">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-black text-red-950">Coupon Management</h1>

        {error && (
          <div className="mt-4 rounded-lg bg-red-100 p-4 text-red-900">
            {error}
          </div>
        )}

        {/* Add/Edit Coupon Form */}
        <div className="mt-8 rounded-2xl border border-red-200 bg-white p-4 sm:p-6">
          <h2 className="text-xl font-bold text-red-950">
            {editingId ? "Edit Coupon" : "Add New Coupon"}
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-red-950">
                  Coupon Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g., SUMMER50"
                  className="mt-2 w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 placeholder-red-300 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-950">
                  Discount Type
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                  className="mt-2 w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 focus:border-red-500 focus:outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (₹)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-red-950">
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
                  className="mt-2 w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 placeholder-red-300 focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-red-950">
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
                  className="mt-2 w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 placeholder-red-300 focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            {discountType === "percentage" && (
              <div>
                <label className="block text-sm font-semibold text-red-950">
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
                  className="mt-2 w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 placeholder-red-300 focus:border-red-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-red-950">
                Valid Till (Date)
              </label>
              <input
                type="date"
                value={validTill}
                onChange={(e) => setValidTill(e.target.value)}
                className="mt-2 w-full rounded-lg border border-red-200 px-4 py-2 text-red-950 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-red-600 px-6 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : editingId ? "Update Coupon" : "Add Coupon"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg bg-gray-200 px-6 py-2.5 font-semibold text-gray-900 hover:bg-gray-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Coupons List */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-bold text-red-950">Existing Coupons</h2>

          {loading ? (
            <AdminCouponCardsSkeleton />
          ) : coupons.length === 0 ? (
            <p className="text-red-900">No coupons added yet.</p>
          ) : (
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div
                  key={coupon._id}
                  className="rounded-2xl border border-red-200 bg-white p-4 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h3 className="text-lg font-bold text-red-950 break-all">
                          {coupon.code}
                        </h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          coupon.active
                            ? "bg-green-100 text-green-900"
                            : "bg-red-100 text-red-900"
                        }`}>
                          {coupon.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm text-red-900">
                        <div>
                          <span className="font-semibold">Discount:</span>{" "}
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}%`
                            : `₹${coupon.discountValue}`}
                        </div>
                        {coupon.minPurchase && (
                          <div>
                            <span className="font-semibold">Min Purchase:</span> ₹
                            {coupon.minPurchase}
                          </div>
                        )}
                        {coupon.maxDiscount && (
                          <div>
                            <span className="font-semibold">Max Discount:</span> ₹
                            {coupon.maxDiscount}
                          </div>
                        )}
                        {coupon.validTill && (
                          <div>
                            <span className="font-semibold">Valid Till:</span>{" "}
                            {formatDisplayDate(coupon.validTill)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-0 sm:ml-4 flex flex-wrap gap-2 shrink-0">
                      <EditDeleteButtons
                        onEdit={() => handleEdit(coupon)}
                        onDelete={() => handleDelete(coupon._id)}
                        direction="row"
                      />
                      <button
                        onClick={() => handleToggleActive(coupon)}
                        disabled={togglingId === coupon._id}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                          coupon.active
                            ? "bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
                            : "bg-green-100 text-green-900 hover:bg-green-200"
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
      </div>
    </main>
  );
}
