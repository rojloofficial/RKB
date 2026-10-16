"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/button";
import { SectionPanel } from "@/components/ui/card";
import { useAuthGuard } from "@/components/post-ad/use-auth-guard";
import { useAuth } from "@/lib/auth-context";
import { paymentInfo, siteInfo } from "@/lib/site";
import { PaymentOptionsSkeleton } from "@/components/skeletons/post-ad-skeletons";
import { PaymentSkeleton } from "@/components/ui/skeleton";

type UPI = {
  _id?: string;
  upiId: string;
  name: string;
  qrCode: string;
};

interface EligibilityState {
  allowed: boolean;
  remainingMs: number;
  remainingFormatted: string;
  lastPurchaseAt: string | null;
  nextAllowedAt: string | null;
  reason?: string;
}

function PaymentView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ready = useAuthGuard();
  const { user } = useAuth();
  const [upis, setUpis] = useState<UPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountError, setDiscountError] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTxId, setSubmittedTxId] = useState("");
  const [submittedStatus, setSubmittedStatus] = useState<"pending" | "confirmed" | "declined">("pending");
  const [declineReason, setDeclineReason] = useState("");
  const [eligibility, setEligibility] = useState<EligibilityState | null>(null);
  const [liveCountdown, setLiveCountdown] = useState<string>("");

  const coins = Number(searchParams.get("coins") ?? "0");
  const price = searchParams.get("price") ?? "";

  useEffect(() => {
    if (!submitted || !submittedTxId || submittedStatus !== "pending") return;

    let cancelled = false;
    async function checkStatus() {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("rojlo_auth_token") : null;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const query = user?.email ? `?email=${encodeURIComponent(user.email)}` : "";
        const res = await fetch(`/api/payment-confirmation${query}`, {
          headers,
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const requests = Array.isArray(data.requests) ? data.requests : [];
        const current = requests.find(
          (r: { transactionId?: string; status?: string; declinedReason?: string }) =>
            r.transactionId?.trim().toLowerCase() === submittedTxId.trim().toLowerCase()
        );
        if (current && !cancelled) {
          if (current.status === "declined") {
            setSubmittedStatus("declined");
            setDeclineReason(current.declinedReason || "Wrong Transaction ID");
          } else if (current.status === "confirmed") {
            setSubmittedStatus("confirmed");
            window.dispatchEvent(new CustomEvent("coins:updated"));
            window.localStorage.setItem("rojlo_coin_update", String(Date.now()));
          }
        }
      } catch {}
    }

    const interval = setInterval(checkStatus, 3000);
    void checkStatus();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [submitted, submittedTxId, submittedStatus, user?.email]);

  const userEmail = user?.email;
  const checkEligibility = useCallback(async () => {
    let emailToUse = userEmail || user?.email;
    if (!emailToUse && typeof window !== "undefined") {
      try {
        emailToUse = JSON.parse(localStorage.getItem("rojlo_auth_user") || "{}")?.email || "";
      } catch {}
    }
    if (!emailToUse) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("rojlo_auth_token") : null;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(
        `/api/payment-confirmation/eligibility?email=${encodeURIComponent(emailToUse)}&_t=${Date.now()}`,
        {
          headers,
          cache: "no-store",
          credentials: "include",
        }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setEligibility({
          allowed: Boolean(data.allowed),
          remainingMs: Number(data.remainingMs || 0),
          remainingFormatted: String(data.remainingFormatted || ""),
          lastPurchaseAt: data.lastPurchaseAt || null,
          nextAllowedAt: data.nextAllowedAt || null,
          reason: data.reason || "",
        });
      }
    } catch (err) {
      console.error("Failed to check coin purchase eligibility:", err);
    }
  }, [userEmail, user?.email]);

  useEffect(() => {
    if (userEmail) {
      queueMicrotask(() => {
        void checkEligibility();
      });
    }
  }, [userEmail, checkEligibility]);

  useEffect(() => {
    if (!eligibility || eligibility.allowed || !eligibility.nextAllowedAt) {
      return;
    }

    const targetMs = new Date(eligibility.nextAllowedAt).getTime();
    if (isNaN(targetMs)) return;

    const updateTimer = () => {
      const remaining = targetMs - Date.now();
      if (remaining <= 0) {
        setLiveCountdown("");
        setEligibility((prev) => (prev ? { ...prev, allowed: true, remainingMs: 0, remainingFormatted: "" } : null));
        void checkEligibility();
        return;
      }
      const totalSecs = Math.floor(remaining / 1000);
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      const parts: string[] = [];
      if (h > 0) parts.push(`${h}h`);
      if (m > 0 || h > 0) parts.push(`${m}m`);
      parts.push(`${s}s`);
      setLiveCountdown(parts.join(" "));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => {
      clearInterval(interval);
      setLiveCountdown("");
    };
  }, [eligibility, checkEligibility]);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function loadUPIs() {
      try {
        const res = await fetch("/api/admin/upi?mode=payment");
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUpis(data.upis || (data.upi ? [data.upi] : []));
        }
      } catch (err) {
        console.error("Failed to load UPIs:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUPIs();

    return () => {
      cancelled = true;
    };
  }, [ready]);

  async function applyCoupon() {
    if (!couponCode.trim()) {
      setDiscountError("Please enter a coupon code");
      return;
    }

    setApplyingCoupon(true);
    try {
      setDiscountError("");
      const amount = parseFloat(price.replace(/[^\d.]/g, "")) || 0;
      const response = await fetch("/api/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), amount }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDiscountError(data.error || "Invalid coupon code");
        setDiscount(0);
        return;
      }

      const data = await response.json();
      setDiscount(data.discount);
      setDiscountError("");
    } catch (err) {
      setDiscountError("Failed to validate coupon");
      console.error(err);
    } finally {
      setApplyingCoupon(false);
    }
  }

  async function handleSubmitTransaction() {
    if (eligibility && !eligibility.allowed) {
      const timeLeft = liveCountdown || eligibility.remainingFormatted || "some time";
      const limitMsg = `Purchase Limit Active: You can only purchase coins once every 24 hours per email address. Please wait ${timeLeft} before purchasing again.`;
      setSubmitError(limitMsg);
      alert(limitMsg);
      return;
    }

    if (!transactionId.trim()) {
      setSubmitError("Please enter a transaction ID");
      return;
    }

    const txnToSubmit = transactionId.trim();
    setSubmitting(true);
    setSubmitError("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("rojlo_auth_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      let currentEmail = user?.email || "";
      let currentId = user?._id || "";
      if (!currentEmail && typeof window !== "undefined") {
        try {
          const parsed = JSON.parse(localStorage.getItem("rojlo_auth_user") || "{}");
          currentEmail = parsed?.email || "";
          currentId = parsed?._id || "";
        } catch {}
      }

      const response = await fetch("/api/payment-confirmation", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          coins,
          amount: price.replace(/[^\d.]/g, ""),
          transactionId: txnToSubmit,
          couponCode: couponCode.trim() || null,
          discount,
          userId: currentId,
          userEmail: currentEmail,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSubmitError(data.error || "Failed to record transaction");
        return;
      }

      setSubmitted(true);
      setSubmittedTxId(txnToSubmit);
      setSubmittedStatus("pending");
      setDeclineReason("");

      // Start 24h countdown immediately
      const nowDate = new Date();
      const nowIso = nowDate.toISOString();
      const nextAllowedIso = new Date(nowDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
      setEligibility({
        allowed: false,
        remainingMs: 24 * 60 * 60 * 1000,
        remainingFormatted: "24h 0m 0s",
        lastPurchaseAt: nowIso,
        nextAllowedAt: nextAllowedIso,
        reason: "You can only purchase coins once every 24 hours per email address.",
      });

      window.dispatchEvent(new CustomEvent("coins:updated"));
      window.localStorage.setItem("rojlo_coin_update", String(nowDate.getTime()));
      void checkEligibility();
      setTransactionId("");
      setCouponCode("");
      setDiscount(0);
    } catch (err) {
      setSubmitError("Failed to submit transaction. Please check your network and try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return <PaymentSkeleton />;

  const amount = price.replace(/[^\d.]/g, "");
  const finalAmount = Math.max(0, parseFloat(amount) - discount);
  const upiLink = `upi://pay?pa=${encodeURIComponent(
    paymentInfo.upiId
  )}&pn=${encodeURIComponent(paymentInfo.upiName)}&am=${encodeURIComponent(
    finalAmount.toString()
  )}&cu=INR&tn=${encodeURIComponent(`Buy ${coins} coins on ${siteInfo.name}`)}`;
  const defaultQrSrc = "/surajkumar40407@ybl.jpeg";

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <SectionPanel className="p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Complete Payment
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Scan the verified UPI QR code or transfer directly to recharge your wallet.
            </p>
          </div>
          <Button
            variant="soft"
            size="sm"
            onClick={() => router.push("/post-ad/buy-coin")}
            className="border border-white/10 text-slate-300 hover:text-white"
          >
            Back to Packs
          </Button>
        </div>

        <div className="mt-6">
          {/* 24h Cooldown Alert Banner */}
          {eligibility && !eligibility.allowed && (
            <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-left text-amber-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="shrink-0 rounded-full bg-amber-500/20 p-2 text-amber-300">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
                    <h3 className="text-sm sm:text-base font-bold text-white">
                      24-Hour Purchase Cooldown Active
                    </h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/20 px-2.5 py-0.5 text-xs font-black text-amber-300 w-fit">
                      <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                      Next purchase in: {liveCountdown || eligibility.remainingFormatted}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
                    Accounts can only purchase coins once every 24 hours. Your last transaction was recorded on{" "}
                    <strong className="text-white">
                      {eligibility.lastPurchaseAt
                        ? new Date(eligibility.lastPurchaseAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "recently"}
                    </strong>
                    . Submissions are temporarily paused until the timer finishes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!submitted && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-center sm:p-6 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Selected Package</span>
              <p className="mt-1 text-2xl font-black text-white sm:text-3xl">
                Pay ₹{finalAmount.toFixed(2)} &nbsp;•&nbsp; Receive <span className="text-amber-400">{coins} Coins</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Scan with PhonePe, Google Pay, Paytm, BHIM, or any UPI banking app.
              </p>
            </div>
          )}

          {submitted && submittedStatus === "pending" && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center sm:p-8">
              <span className="text-4xl">⏳</span>
              <p className="mt-3 text-xl font-black text-white">Transaction Under Verification</p>
              <p className="mt-2 text-sm text-slate-300">
                Your payment has been logged (ID: <strong className="text-amber-400 font-mono">{submittedTxId}</strong>). Our verification system confirms payments automatically within a few minutes.
              </p>
              <p className="mt-1 text-xs text-amber-300">Please do not submit duplicate payments.</p>
              {eligibility && !eligibility.allowed && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-1.5 text-xs font-bold text-amber-300">
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  Next purchase in: {liveCountdown || eligibility.remainingFormatted}
                </div>
              )}
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => router.push("/post-ad/payment-history")}
                  className="!text-white font-bold"
                >
                  View Transaction History
                </Button>
              </div>
            </div>
          )}

          {submitted && submittedStatus === "declined" && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center sm:p-8">
              <span className="text-4xl">❌</span>
              <p className="mt-3 text-xl font-black text-white">Payment Declined</p>
              <p className="mt-2 text-sm font-semibold text-rose-300">
                Reason: {declineReason || "Invalid or Unmatched Transaction Reference"}
              </p>
              <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => {
                    setSubmitted(false);
                    setSubmittedTxId("");
                    setSubmittedStatus("pending");
                    setDeclineReason("");
                  }}
                  className="!text-white font-bold"
                >
                  Re-enter Reference ID
                </Button>
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => router.push("/post-ad/payment-history")}
                  className="border border-white/10 text-slate-300 hover:text-white"
                >
                  Show History
                </Button>
              </div>
            </div>
          )}

          {submitted && submittedStatus === "confirmed" && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center sm:p-8">
              <span className="text-4xl">🎉</span>
              <p className="mt-3 text-xl font-black text-white">Payment Confirmed!</p>
              <p className="mt-2 text-sm text-emerald-300">
                {coins} coins have been successfully added to your wallet!
              </p>
              <div className="mt-6 flex justify-center">
                <Button
                  type="button"
                  variant="solid"
                  onClick={() => router.push("/post-ad/your-ads")}
                  className="!text-white font-bold"
                >
                  Go to Your Ads
                </Button>
              </div>
            </div>
          )}

          {!submitted && (
            <div className="space-y-6">
              {/* Coupon Section */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 sm:p-5">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Have a Promo / Coupon Code?
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={couponCode}
                    disabled={applyingCoupon}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="ENTER CODE (OPTIONAL)"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none disabled:opacity-60 font-mono"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={applyingCoupon}
                    className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {applyingCoupon ? "Verifying..." : "Apply Discount"}
                  </button>
                </div>
                {discountError && (
                  <p className="mt-2 text-xs font-semibold text-rose-400">{discountError}</p>
                )}
                {discount > 0 && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs sm:text-sm">
                    <p className="font-semibold text-emerald-300">Discount Applied</p>
                    <p className="font-bold text-emerald-400">-₹{discount.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* QR and Payment Details Container */}
              {loading ? (
                <PaymentOptionsSkeleton />
              ) : upis.length > 0 ? (
                <div className="space-y-6">
                  {upis.map((upi) => (
                    <div key={upi._id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
                      {/* White backdrop container for QR to ensure scannability */}
                      <div className="flex justify-center">
                        <div className="rounded-2xl bg-white p-3 shadow-xl">
                          {upi.qrCode ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={upi.qrCode}
                              alt={`UPI payment QR code for ${upi.upiId}`}
                              width={240}
                              height={240}
                              className="h-52 w-52 sm:h-60 sm:w-60 max-w-full object-contain"
                            />
                          ) : (
                            <div className="h-52 w-52 sm:h-60 sm:w-60 flex items-center justify-center text-slate-600 text-xs">
                              No QR Code
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Official UPI ID
                        </p>
                        <p className="mt-1 text-base sm:text-lg font-black text-amber-400 font-mono break-all">
                          {upi.upiId}
                        </p>
                      </div>

                      <div className="mt-5 flex justify-center">
                        <Button
                          type="button"
                          variant="solid"
                          size="md"
                          className="!text-white font-bold w-full sm:w-auto"
                          onClick={() => {
                            const link = `upi://pay?pa=${encodeURIComponent(
                              upi.upiId
                            )}&pn=${encodeURIComponent(upi.name)}&am=${encodeURIComponent(
                              finalAmount.toString()
                            )}&cu=INR&tn=${encodeURIComponent(
                              `Buy ${coins} coins on ${siteInfo.name}`
                            )}`;
                            window.location.href = link;
                          }}
                        >
                          📲 Open UPI App Directly
                        </Button>
                      </div>

                      <div className="mt-8 border-t border-white/10 pt-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                          Enter 12-Digit UPI Transaction Reference (UTR)
                        </label>
                        <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="text"
                            inputMode="numeric"
                            disabled={submitting}
                            value={transactionId}
                            onKeyDown={(e) => {
                              if (
                                e.ctrlKey ||
                                e.metaKey ||
                                [
                                  "Backspace", "Delete", "Tab", "Escape", "Enter",
                                  "ArrowLeft", "ArrowRight", "Home", "End"
                                ].includes(e.key)
                              ) return;
                              if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                            }}
                            onChange={(e) => {
                              setTransactionId(e.target.value.replace(/\D/g, ""));
                              if (submitError) setSubmitError("");
                            }}
                            placeholder="e.g. 412345678901"
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleSubmitTransaction}
                            disabled={submitting || Boolean(eligibility && !eligibility.allowed)}
                            className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 cursor-pointer sm:whitespace-nowrap"
                          >
                            {submitting
                              ? "Submitting..."
                              : eligibility && !eligibility.allowed
                              ? `Cooldown (${liveCountdown || eligibility.remainingFormatted})`
                              : "Submit Verification"}
                          </button>
                        </div>
                        {submitError && (
                          <p className="mt-2 text-xs font-semibold text-rose-400">{submitError}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 sm:p-8">
                  <div className="flex justify-center">
                    <div className="rounded-2xl bg-white p-3 shadow-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={defaultQrSrc}
                        alt="UPI payment QR code"
                        width={240}
                        height={240}
                        className="h-52 w-52 sm:h-60 sm:w-60 max-w-full object-contain"
                      />
                    </div>
                  </div>

                  <div className="mt-6 text-center">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      UPI ID
                    </p>
                    <p className="mt-1 text-base sm:text-lg font-black text-amber-400 font-mono break-all">
                      {paymentInfo.upiId}
                    </p>
                  </div>

                  <div className="mt-5 flex justify-center">
                    <Button
                      type="button"
                      variant="solid"
                      size="md"
                      className="!text-white font-bold w-full sm:w-auto"
                      onClick={() => {
                        window.location.href = upiLink;
                      }}
                    >
                      📲 Open UPI App Directly
                    </Button>
                  </div>

                  <div className="mt-8 border-t border-white/10 pt-6">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                      Enter 12-Digit UPI Transaction Reference (UTR)
                    </label>
                    <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={submitting}
                        value={transactionId}
                        onKeyDown={(e) => {
                          if (
                            e.ctrlKey ||
                            e.metaKey ||
                            [
                              "Backspace", "Delete", "Tab", "Escape", "Enter",
                              "ArrowLeft", "ArrowRight", "Home", "End"
                            ].includes(e.key)
                          ) return;
                          if (!/^[0-9]$/.test(e.key)) e.preventDefault();
                        }}
                        onChange={(e) => {
                          setTransactionId(e.target.value.replace(/\D/g, ""));
                          if (submitError) setSubmitError("");
                        }}
                        placeholder="e.g. 412345678901"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleSubmitTransaction}
                        disabled={submitting || Boolean(eligibility && !eligibility.allowed)}
                        className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-60 cursor-pointer sm:whitespace-nowrap"
                      >
                        {submitting
                          ? "Submitting..."
                          : eligibility && !eligibility.allowed
                          ? `Cooldown (${liveCountdown || eligibility.remainingFormatted})`
                          : "Submit Verification"}
                      </button>
                    </div>
                    {submitError && (
                      <p className="mt-2 text-xs font-semibold text-rose-400">{submitError}</p>
                    )}
                  </div>
                </div>
              )}

              <p className="text-center text-xs text-slate-400">
                Please retain your UPI transfer screenshot until verification completes.
              </p>
            </div>
          )}
        </div>
      </SectionPanel>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PaymentSkeleton />}>
      <PaymentView />
    </Suspense>
  );
}
