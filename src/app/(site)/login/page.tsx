"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/button";
import { TextInput } from "@/components/ui/field";
import { serviceNames } from "@/lib/services";
import { useAuth } from "@/lib/auth-context";
import { FormSkeleton } from "@/components/ui/skeleton";

const serviceOptions = Object.values(serviceNames);
const OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 15; // 15 seconds fast resend cooldown

function sanitizeEmail(val: string): string {
  let s = String(val || "").trim().toLowerCase();
  s = s.replace(/@gmail\.ocm$/i, "@gmail.com");
  s = s.replace(/@gamil\.com$/i, "@gmail.com");
  s = s.replace(/@gmai\.com$/i, "@gmail.com");
  s = s.replace(/@gmial\.com$/i, "@gmail.com");
  s = s.replace(/@gmaill\.com$/i, "@gmail.com");
  s = s.replace(/@gmail\.co$/i, "@gmail.com");
  s = s.replace(/@yahoo\.ocm$/i, "@yahoo.com");
  s = s.replace(/@yaho\.com$/i, "@yahoo.com");
  s = s.replace(/@hotmail\.ocm$/i, "@hotmail.com");
  s = s.replace(/@hotmial\.com$/i, "@hotmail.com");
  s = s.replace(/\.ocm$/i, ".com");
  s = s.replace(/\.con$/i, ".com");
  s = s.replace(/\.cmo$/i, ".com");
  return s;
}

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
  const [timerTrigger, setTimerTrigger] = useState(0);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [serviceOpen, setServiceOpen] = useState(false);
  const serviceRef = useRef<HTMLDivElement | null>(null);

  const expiresUntilRef = useRef<number>(0);
  const resendUntilRef = useRef<number>(0);

  useEffect(() => {
    if (!otpSent) return;

    function tick() {
      const now = Date.now();
      if (expiresUntilRef.current > 0) {
        const remExpires = Math.max(0, Math.ceil((expiresUntilRef.current - now) / 1000));
        setExpiresIn(remExpires);
      }
      if (resendUntilRef.current > 0) {
        const remResend = Math.max(0, Math.ceil((resendUntilRef.current - now) / 1000));
        setResendIn(remResend);
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [otpSent, timerTrigger]);

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
    expiresUntilRef.current = 0;
    resendUntilRef.current = 0;
    setTimerTrigger(0);
  }

  const checkEmailExists = useCallback(async (checkVal: string) => {
    if (mode !== "signup") return;
    const clean = sanitizeEmail(checkVal);
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
        resetOtp();
      } else {
        setEmailWarning("");
      }
    } catch {
      // Ignore background check failure
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "signup") {
      queueMicrotask(() => setEmailWarning(""));
      return;
    }
    const clean = email.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      queueMicrotask(() => setEmailWarning(""));
      return;
    }
    const timer = setTimeout(() => {
      void checkEmailExists(clean);
    }, 350);
    return () => clearTimeout(timer);
  }, [email, mode, checkEmailExists]);

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

    const cleanEmail = sanitizeEmail(email);
    if (cleanEmail !== email) {
      setEmail(cleanEmail);
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter a valid email address to send the OTP.");
      return;
    }

    if (emailWarning) {
      setError("Use other email, this email already have account.");
      return;
    }

    setSending(true);
    try {
      const endpoint = otpSent ? "/api/auth/resend-otp" : "/api/auth/start-register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 || data.alreadyExists) {
          setEmailWarning(data.error || "Use other email, this email already have account.");
          setError("");
          resetOtp();
        } else if (res.status === 429 && data.resendInMs) {
          // Cooldown active: a code was already sent and is still valid!
          setOtpSent(true);
          setOtpEmail(cleanEmail);
          const cooldownSecs = Math.ceil(data.resendInMs / 1000);
          resendUntilRef.current = Date.now() + data.resendInMs;
          if (expiresUntilRef.current <= Date.now()) {
            expiresUntilRef.current = Date.now() + OTP_TTL_SECONDS * 1000;
          }
          setResendIn(cooldownSecs);
          setTimerTrigger((prev) => prev + 1);
          setError(data.error || `Please wait ${cooldownSecs}s before requesting a new code. You can enter the code already sent to your email.`);
        } else {
          setError(data.error || data.message || "Unable to send the verification code.");
          setOtpSent(false);
        }
        setSending(false);
        return;
      }

      if (data.emailSent === false) {
        setError(data.error || data.message || "Failed to deliver OTP to your email. Please try again.");
        setOtpSent(false);
        setSending(false);
        return;
      }

      setEmailWarning("");
      setOtpSent(true);
      setOtpEmail(cleanEmail);
      setDigits(["", "", "", "", "", ""]);
      expiresUntilRef.current = Date.now() + OTP_TTL_SECONDS * 1000;
      resendUntilRef.current = Date.now() + RESEND_COOLDOWN_SECONDS * 1000;
      setExpiresIn(OTP_TTL_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      setTimerTrigger((prev) => prev + 1);
      digitRefs.current[0]?.focus();
    } catch {
      setError("Network error. Please try again.");
      setOtpSent(false);
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
      const cleanEmail = sanitizeEmail(email);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: cleanEmail, password }),
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
    <main className="relative flex min-h-[85vh] items-center justify-center px-4 py-12 sm:py-16">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-96 w-96 rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />
      </div>

      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        {/* Mode Toggle Switcher */}
        <div className="mb-6 flex rounded-2xl border border-white/10 bg-slate-950/80 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              mode === "login"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
              mode === "signup"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400">
            {mode === "login"
              ? "Access your dashboard to manage listings, credits, and profile."
              : "Verify your email to post ads and reach verified clients across India."}
          </p>
        </div>

        <form
          onSubmit={mode === "login" ? handleLogin : handleSignup}
          className="mt-6 space-y-4"
        >
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Full Name
              </label>
              <TextInput
                onlyLetters
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                placeholder="e.g. Rahul Sharma"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
              Email Address
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && mode === "signup" && !otpSent) {
                    e.preventDefault();
                    void handleSendCode();
                  }
                }}
                placeholder="you@example.com"
                className="flex-1 min-w-0"
                required
              />
              {mode === "signup" && (
                <button
                  type="button"
                  disabled={sending || resendIn > 0 || Boolean(emailWarning)}
                  onClick={(e) => {
                    e.preventDefault();
                    void handleSendCode();
                  }}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold shadow-md transition-all whitespace-nowrap w-full sm:w-auto shrink-0 select-none cursor-pointer ${
                    sending || resendIn > 0 || Boolean(emailWarning)
                      ? "border border-white/10 bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed"
                      : "bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 active:scale-95"
                  }`}
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-3.5 w-3.5 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : resendIn > 0 ? (
                    `Resend (${resendIn}s)`
                  ) : otpSent ? (
                    "Resend OTP"
                  ) : (
                    "Send OTP"
                  )}
                </button>
              )}
            </div>

            {mode === "signup" && emailWarning && (
              <div
                role="alert"
                className="mt-2.5 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200 text-xs sm:text-sm animate-in fade-in"
              >
                <span className="text-lg shrink-0 select-none" aria-hidden="true">⚠️</span>
                <div>
                  <p className="font-bold text-amber-300">
                    Account Already Exists
                  </p>
                  <p className="mt-0.5 text-xs text-amber-200/80 leading-relaxed">
                    This email is already associated with an account. Please{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="font-bold text-amber-400 underline hover:text-amber-300 cursor-pointer"
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
                  <p className="text-xs font-semibold text-emerald-400">
                    ✓ OTP sent to {otpEmail}. Check your inbox or spam folder.
                  </p>
                ) : (
                  <p className="text-xs text-slate-400">
                    Click <strong>&quot;Send OTP&quot;</strong> to receive your 6-digit verification code.
                  </p>
                )}
                {otpError && (
                  <p className="mt-1 text-xs font-semibold text-red-400">
                    {otpError}
                  </p>
                )}
              </div>
            )}
          </div>

          {mode === "signup" && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300 text-center">
                Enter 6-Digit OTP Code
              </label>
              <div className="flex justify-center gap-1.5 sm:gap-2">
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
                    className="h-12 w-10 sm:h-14 sm:w-12 rounded-xl border border-white/15 bg-slate-900 text-center text-xl sm:text-2xl font-black text-amber-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
                {otpSent ? (
                  expiresIn > 0 ? (
                    <span>
                      Expires in:{" "}
                      <span className="font-bold text-amber-400 font-mono">
                        {expiresMins}:{expiresSecs}
                      </span>
                    </span>
                  ) : (
                    <span className="font-semibold text-rose-400">
                      Code has expired.
                    </span>
                  )
                ) : (
                  <span>Code will be valid for 10 minutes</span>
                )}
                {otpSent && (
                  <>
                    <span aria-hidden="true">•</span>
                    {sending ? (
                      <span>Sending...</span>
                    ) : resendIn > 0 ? (
                      <span className="font-medium text-slate-400 font-mono">
                        Resend in {resendIn}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleSendCode(e as unknown as React.MouseEvent)}
                        className="font-bold text-amber-400 underline underline-offset-2 hover:text-amber-300 cursor-pointer"
                      >
                        Resend OTP
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-amber-400 cursor-pointer"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
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
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 hover:text-amber-400 cursor-pointer"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-300">
                Primary Service Offering
              </label>
              <div ref={serviceRef} className="relative">
                <button
                  type="button"
                  onClick={() => setServiceOpen((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={serviceOpen}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-left text-sm text-white outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <span>{service}</span>
                  <span
                    className={`text-slate-400 transition-transform ${
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
                    className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
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
                        className={`cursor-pointer px-4 py-2.5 text-xs sm:text-sm text-slate-200 hover:bg-white/10 ${
                          service === name ? "bg-amber-500/20 font-bold text-amber-400" : ""
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
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-400" role="alert">
              {otpError}
            </p>
          )}
          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-semibold text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="solid"
            fullWidth
            size="lg"
            disabled={busy}
            loading={busy}
            loadingText={mode === "login" ? "Logging in..." : "Creating account..."}
            className="mt-2 !font-black !text-white"
          >
            {mode === "login" ? "Sign In to RKB" : "Complete Registration"}
          </Button>

          <p className="text-center text-xs text-slate-400">
            By proceeding, you confirm that you are at least 18 years of age and agree to our{" "}
            <Link href="/terms" className="text-amber-400 underline hover:text-amber-300">Terms of Service</Link> &{" "}
            <Link href="/privacy-policy" className="text-amber-400 underline hover:text-amber-300">Privacy Policy</Link>.
          </p>
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
