import "server-only";

import { createHmac, randomInt } from "crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

function cleanEnv(val?: string): string {
  return (val ?? "").trim().replace(/^['"]|['"]$/g, "");
}

// Server-side secret used to create an HMAC binding the OTP to the user email.
// Falling back to JWT_SECRET keeps a single secret in environments that don't
// define a dedicated OTP secret. A deterministic fallback prevents unhandled
// 500 errors if env variables are missing or quoted.
export function otpHashSecret(): string {
  const secret = cleanEnv(process.env.OTP_HASH_SECRET) || cleanEnv(process.env.JWT_SECRET);
  if (secret) {
    return secret;
  }
  return "rojlo-secure-otp-hmac-sha256-secret-fallback-key-2025";
}

/**
 * Generate a cryptographically secure 6-digit OTP.
 */
export function generateOtp(): string {
  // randomInt(0, 1_000_000) returns a uniformly distributed value in [0, 1e6).
  // Pad with leading zeros so the result is always exactly 6 digits.
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, "0");
}

/**
 * HMAC the OTP with the user's email so a stored hash cannot be used against a
 * different account and cannot be brute-forced without the server secret.
 */
export function hashOtp(otp: string, email: string): string {
  return createHmac("sha256", otpHashSecret())
    .update(`${email.trim().toLowerCase()}:${otp}`)
    .digest("hex");
}

/**
 * Constant-time-ish comparison of the stored hash against a candidate OTP.
 * Uses timingSafeEqual-style digest from the HMAC to avoid leaking timing.
 */
export function verifyOtp(candidate: string, expectedHash: string, email: string): boolean {
  const candidateHash = hashOtp(candidate, email);
  if (candidateHash.length !== expectedHash.length) return false;

  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(expectedHash, "hex");
  if (a.length !== b.length) return false;

  // timingSafeEqual to avoid leaking partial-match timing.
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
