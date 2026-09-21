"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { serviceNames } from "@/lib/services";
import { useAuth } from "@/lib/auth-context";
import { FormSkeleton } from "@/components/ui/skeleton";

const serviceOptions = Object.values(serviceNames);
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;

function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("from") || "/post-ad";
  const { setUser, setToken } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [service, setService] = useState<string>(serviceOptions[0]);
  const [error, setError] = useState("");
  const [emailWarning, setEmailWarning] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP (shown inline below the email field)
  const [otpSent, setOtpSent] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [sending, setSending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [expiresIn, setExpiresIn] = useState(OTP_TTL_SECONDS);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [serviceOpen, setServiceOpen] = useState(false);
  const serviceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!otpSent) return;
    const timer = setInterval(() => {
      setExpiresIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpSent]);

  useEffect(() => {
    if (!otpSent || resendIn <= 0) return;
    const cooldown = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(cooldown);
  }, [otpSent, resendIn]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (serviceRef.current && !serviceRef.current.contains(e.target as Node)) {
        setServiceOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function switchMode(next: "login" | "signup") {
    setError("");
    setOtpError("");
    setEmailWarning("");
    resetOtp();
    setMode(next);
  }

  function resetOtp() {
    setOtpSent(false);
    setOtpEmail("");
    setDigits(["", "", "", "", "", ""]);
    setResendIn(0);
    setExpiresIn(OTP_TTL_SECONDS);
  }

  async function checkEmailExists(checkVal: string) {
    if (mode !== "signup") return;
    const clean = checkVal.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json();
      if (data.exists) {
        setEmailWarning("Use other email, this email already have account.");
      } else {
        setEmailWarning("");
      }
    } catch {
      // Ignore background check failure
    }
  }

  function handleDigitChange(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = clean;
      return next;
    });
    if (clean && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }

  function handleDigitPaste(index: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!paste) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < 6; i++) {
        next[i] = paste[i] ?? "";
      }
      return next;
    });
    digitRefs.current[5]?.focus();
  }

  // Send / resend the OTP for the signup email (reserves the email)
  async function handleSendCode(e?: React.MouseEvent) {
    e?.preventDefault();
    setOtpError("");
    setError("");
    if (resendIn > 0 || sending) return;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address to send the code.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/auth/start-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.alreadyExists) {
          setEmailWarning(data.error || "Use other email, this email already have account.");
          setError("");
        } else {
          setError(data.error || data.message || "Unable to send the code.");
        }
        if (data.resendInMs) setResendIn(Math.ceil(data.resendInMs / 1000));
        setSending(false);
        return;
      }
      setEmailWarning("");
      setOtpSent(true);
      setOtpEmail(email);
      setDigits(["", "", "", "", "", ""]);
      setExpiresIn(OTP_TTL_SECONDS);
      if (data.emailSent === false) {
        setOtpError(
          data.message ||
          "We couldn't send the code right now. Please check your email configuration and resend below."
        );
      } else {
        setResendIn(RESEND_COOLDOWN_SECONDS);
      }
      digitRefs.current[0]?.focus();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  // Login (existing single form)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || "Something went wrong.");
        setBusy(false);
        return;
      }
      if (data.token) setToken(data.token);
      if (data.user) setUser(data.user);
      router.push(returnTo);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Signup: verify the OTP, then complete the account
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOtpError("");

    if (!name) {
      setError("Name is required.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!otpSent || otpEmail !== email) {
      await handleSendCode();
      setError("We just sent a 6-digit verification code to your email. Enter it below to finish creating your account.");
      return;
    }
    const otp = digits.join("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code sent to your email.");
      return;
    }

    setBusy(true);
    try {
      // 1) Verify the OTP to obtain a signup token
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(
          verifyData.error || verifyData.message || "Invalid verification code."
        );
        if (verifyData.resendInMs) setResendIn(Math.ceil(verifyData.resendInMs / 1000));
        setDigits(["", "", "", "", "", ""]);
        digitRefs.current[0]?.focus();
        return;
      }

      // If user is an existing verified user, log them in immediately!
      if (verifyData.user) {
        if (verifyData.token) setToken(verifyData.token);
        setUser(verifyData.user);
        router.push(returnTo);
        return;
      }

      if (!verifyData.signupToken) {
        setError("Verification failed. Please try sending a new code.");
        return;
      }

      // 2) Complete the account with the signup token
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
          service,
          signupToken: verifyData.signupToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.alreadyExists) {
          setEmailWarning(data.error || "Use other email, this email already have account.");
          setError("");
        } else {
          setError(data.error || data.message || "Something went wrong.");
        }
        return;
      }
      setEmailWarning("");
      if (data.token) setToken(data.token);
      if (data.user) setUser(data.user);
      router.push(returnTo);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const expiresMins = Math.floor(expiresIn / 60);
  const expiresSecs = String(expiresIn % 60).padStart(2, "0");

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-8 sm:py-10">
      <section className="w-full max-w-md rounded-3xl border border-neutral-200/90 bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6 flex gap-2">
          <Button
            variant="soft"
            active={mode === "login"}
            onClick={() => switchMode("login")}
            className={mode === "login" ? "!bg-neutral-900 !text-white" : "!text-neutral-700 !bg-neutral-100"}
          >
            Login
          </Button>
          <Button
            variant="soft"
            active={mode === "signup"}
            onClick={() => switchMode("signup")}
            className={mode === "signup" ? "!bg-neutral-900 !text-white" : "!text-neutral-700 !bg-neutral-100"}
          >
            Sign up
          </Button>
        </div>

        <h1 className="text-2xl font-black text-neutral-900">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          {mode === "login"
            ? "Log in to manage your ads and profile."
            : "Enter your details, verify your email, and create your account."}
        </p>

        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="mt-6 space-y-4"
        >
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Name
              </label>
              <TextInput
                onlyLetters
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                placeholder="Your name"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">
              Email
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailWarning("");
                  if (otpSent && otpEmail !== e.target.value) resetOtp();
                }}
                onBlur={() => {
                  if (mode === "signup") checkEmailExists(email);
                }}
                placeholder="you@example.com"
                className="flex-1 min-w-0"
                required
              />
              {mode === "signup" && (
                <Button
                  type="button"
                  variant={otpSent ? "soft" : "solid"}
                  size="sm"
                  disabled={sending || resendIn > 0}
                  onClick={(e) => handleSendCode(e as unknown as React.MouseEvent)}
                  className="!text-white whitespace-nowrap w-full sm:w-auto shrink-0"
                >
                  {sending
                    ? "Sending..."
                    : resendIn > 0
                    ? `Resend in ${resendIn}s`
                    : otpSent
                    ? "Resend Code"
                    : "Send Code"}
                </Button>
              )}
            </div>
            {mode === "signup" && emailWarning && (
              <div
                role="alert"
                className="mt-2.5 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-xs animate-in fade-in"
              >
                <span className="text-xl shrink-0 select-none" aria-hidden="true">⚠️</span>
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-amber-950">
                    Use other email, this email already have account.
                  </p>
                  <p className="mt-1 text-amber-800 leading-relaxed">
                    This email is already associated with an account. Please use another email address to register, or{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-bold underline hover:text-amber-950 cursor-pointer"
                    >
                      click here to log in
                    </button>.
                  </p>
                </div>
              </div>
            )}
            {mode === "signup" && !emailWarning && (
              <div className="mt-1.5">
                {otpSent ? (
                  <p className="text-xs font-semibold text-neutral-800">
                    ✓ Code sent to {otpEmail}. Check your inbox or spam folder.
                  </p>
                ) : (
                  <p className="text-xs text-neutral-600">
                    Click <strong>&quot;Send Code&quot;</strong> to receive your 6-digit verification code.
                  </p>
                )}
                {otpError && (
                  <p className="mt-1 text-xs font-semibold text-neutral-800">
                    {otpError}
                  </p>
                )}
              </div>
            )}
          </div>

          {mode === "signup" && (
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-800">
                Enter verification code
              </label>
              <div className="flex justify-between gap-1 sm:gap-2">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      digitRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    onPaste={(e) => handleDigitPaste(index, e)}
                    aria-label={`Digit ${index + 1}`}
                    className="h-12 w-9 sm:h-14 sm:w-12 rounded-xl border border-neutral-300 bg-white text-center text-xl sm:text-2xl font-bold text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition"
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-sm text-neutral-600">
                {expiresIn > 0 ? (
                  <span>
                    Code expires in:{" "}
                    <span className="font-semibold text-neutral-900">
                      {expiresMins}:{expiresSecs}
                    </span>
                  </span>
                ) : (
                  <span className="font-medium text-neutral-700">
                    This code has expired.
                  </span>
                )}
                <span aria-hidden="true">•</span>
                {sending ? (
                  <span>Sending...</span>
                ) : resendIn > 0 ? (
                  <span>Resend in {resendIn}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => handleSendCode(e as unknown as React.MouseEvent)}
                    className="font-semibold text-neutral-900 underline underline-offset-2 hover:text-black"
                  >
                    Resend code
                  </button>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">
              Password
            </label>
            <div className="relative">
              <TextInput
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Confirm Password
              </label>
              <div className="relative">
                <TextInput
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-neutral-500 hover:text-neutral-900"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">
                Service
              </label>
              <div ref={serviceRef} className="relative">
                <button
                  type="button"
                  onClick={() => setServiceOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={serviceOpen}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-300 bg-white px-4 py-3 text-left text-neutral-900 outline-none focus:border-neutral-900"
                >
                  <span>{service}</span>
                  <span
                    className={`text-neutral-500 transition-transform ${
                      serviceOpen ? "rotate-180" : ""
                    }`}
                    aria-hidden="true"
                  >
                    ▾
                  </span>
                </button>
                {serviceOpen && (
                  <ul
                    role="listbox"
                    className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
                  >
                    {serviceOptions.map((name) => (
                      <li
                        key={name}
                        role="option"
                        aria-selected={service === name}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setService(name);
                          setServiceOpen(false);
                        }}
                        onClick={() => {
                          setService(name);
                          setServiceOpen(false);
                        }}
                        className={`cursor-pointer px-4 py-3 text-neutral-900 hover:bg-neutral-100 ${
                          service === name ? "bg-neutral-100 font-semibold" : ""
                        }`}
                      >
                        {name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {otpSent && otpError && (
            <p className="text-sm font-medium text-neutral-800" role="alert">
              {otpError}
            </p>
          )}
          {error && (
            <p className="text-sm font-medium text-neutral-800" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="solid"
            fullWidth
            disabled={busy}
            loading={busy}
            loadingText={mode === "login" ? "Logging in..." : "Creating account..."}
            className="!text-white"
          >
            {mode === "login" ? "Log in" : "Create account"}
          </Button>
        </form>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[80vh] items-center justify-center px-4 py-8 sm:py-10">
          <FormSkeleton fields={3} />
        </main>
      }
    >
      <AuthPage />
    </Suspense>
  );
}
