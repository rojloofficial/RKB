"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { SectionPanel } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";

function CreatePasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const tokenParam = searchParams.get("token") || "";

  const hasParams = Boolean(tokenParam && emailParam);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    hasParams ? "" : "Invalid or missing password creation link."
  );
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(hasParams);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!tokenParam || !emailParam) {
      return;
    }

    let isMounted = true;
    // Verify token validity
    fetch(`/api/vip/create-password?token=${encodeURIComponent(tokenParam)}&email=${encodeURIComponent(emailParam)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.valid) {
          setTokenValid(true);
        } else {
          setError(data.error || "This password setup link is invalid or has expired.");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Network error while validating setup link.");
      })
      .finally(() => {
        if (isMounted) {
          setValidatingToken(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [tokenParam, emailParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/vip/create-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailParam,
          token: tokenParam,
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to set password.");
        return;
      }

      setSuccess("Password created successfully! Redirecting to VIP login...");
      setTimeout(() => {
        router.push(`/vip/login?email=${encodeURIComponent(emailParam)}`);
      }, 1500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <SectionPanel className="w-full max-w-md">
        <Eyebrow>VIP Portal</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-red-950">Create Password</h1>
        <p className="mt-2 text-red-900">
          Set your new password to activate your VIP control panel account.
        </p>

        {validatingToken ? (
          <div className="mt-8 text-center text-sm text-red-800 animate-pulse">
            Validating invitation link...
          </div>
        ) : error && !tokenValid ? (
          <div className="mt-6 rounded-xl bg-red-100 p-4 text-sm font-medium text-red-800">
            <p>{error}</p>
            <p className="mt-2 text-xs text-red-700">
              Please check the email link or contact your administrator to generate a new invitation.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-red-950">
                VIP Account Email
              </label>
              <TextInput
                type="email"
                value={emailParam}
                disabled
                className="bg-gray-50 opacity-80 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-950">
                New Password
              </label>
              <div className="relative">
                <TextInput
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-red-500 transition hover:text-red-700"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M3 3l18 18M10.5 10.6A2.5 2.5 0 0 0 12 15a2.5 2.5 0 0 0 2.4-1.8M6.5 6.8C4 8.6 2.5 12 2.5 12s3.5 7 9.5 7a10.5 10.5 0 0 0 4.8-1.1M14.2 4.6A11.4 11.4 0 0 1 12 4C6 4 2.5 12 2.5 12a18.7 18.7 0 0 0 3.7 4.7M9.3 5.1A9.3 9.3 0 0 1 12 4c6 0 9.5 8 9.5 8a17.7 17.7 0 0 1-3.2 4.2" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M2.5 12s3.5-8 9.5-8 9.5 8 9.5 8-3.5 8-9.5 8-9.5-8-9.5-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-red-950">
                Confirm New Password
              </label>
              <TextInput
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
              />
            </div>

            {error && <p className="text-sm font-medium text-red-700">{error}</p>}
            {success && <p className="text-sm font-semibold text-green-700">{success}</p>}

            <Button
              type="submit"
              variant="solid"
              disabled={loading || Boolean(success)}
              className="!text-white mt-2"
            >
              {loading ? "Creating Password..." : "Set Password & Proceed"}
            </Button>
          </form>
        )}
      </SectionPanel>
    </main>
  );
}

export default function CreatePasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <SectionPanel className="w-full max-w-md">
            <p className="text-center text-sm text-red-800">Loading form...</p>
          </SectionPanel>
        </main>
      }
    >
      <CreatePasswordContent />
    </Suspense>
  );
}
