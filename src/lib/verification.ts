import "server-only";

import {
  generateOtp,
  hashOtp,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from "./otp";
import { setUserOtp } from "./models/user";
import { sendOtpEmail } from "./email";

export type OtpSendResult =
  | { ok: true; sent: boolean; message?: string }
  | { ok: false; error: string; status: number };

/**
 * Generate a new OTP for a user, store its hash, invalidate any previous OTP
 * (overwriting otpHash resets attempts), and email it to them.
 *
 * `now` can be supplied to check the resend cooldown against server time.
 */
export async function createAndSendOtp(
  userId: string,
  email: string,
  now: Date = new Date()
): Promise<OtpSendResult> {
  const otp = generateOtp();

  const stored = await setUserOtp(userId, hashOtp(otp, email), OTP_TTL_MS);
  if (!stored) {
    return { ok: false, error: "Unable to store verification code.", status: 500 };
  }

  // Log on server for debugging and operational visibility
  console.log(`[AUTH] Generated verification OTP for ${email}: ${otp}`);

  let sent = false;
  let sendError: string | undefined;
  try {
    const result = await sendOtpEmail({
      to: email,
      otp,
      expiresInMinutes: Math.floor(OTP_TTL_MS / 60_000),
    });
    sent = result.sent;
    if (!result.sent && "error" in result) {
      sendError = result.error;
    }
  } catch (error: unknown) {
    console.error("[verification] sendOtpEmail uncaught error:", error);
    sent = false;
    sendError = error instanceof Error ? error.message : String(error);
  }

  void now;
  return { ok: true, sent, message: sendError };
}

export function otpCooldownRemainingMs(lastSentAt: Date | undefined, now: Date): number {
  if (!lastSentAt) return 0;
  const remaining = OTP_RESEND_COOLDOWN_MS - (now.getTime() - new Date(lastSentAt).getTime());
  return remaining > 0 ? remaining : 0;
}
