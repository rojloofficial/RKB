import { NextRequest, NextResponse } from "next/server";
import {
  createUser,
  findUserByEmail,
  normalizeEmail,
} from "@/lib/models/user";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";
import {
  createAndSendOtp,
  otpCooldownRemainingMs,
} from "@/lib/verification";

/**
 * Step 1 of the signup flow: the user enters their email. This reserves the
 * email (as a pending, email-only user if not already registered), sends an OTP,
 * and returns `needsVerification` so the client can show the OTP step.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`start-register:${ip}`, 15);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email } = body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(normalizedEmail);
    const now = new Date();

    // Check if user already has an established account
    if (
      existing &&
      ((existing.passwordHash && existing.passwordHash.trim().length > 0) || existing.emailVerified)
    ) {
      return NextResponse.json(
        {
          error: "Use other email, this email already have account.",
          alreadyExists: true,
        },
        { status: 409 }
      );
    }

    let userId: string;
    if (existing && existing._id) {
      userId = String(existing._id);
      const cooldown = otpCooldownRemainingMs(existing.otpLastSentAt, now);
      if (cooldown > 0) {
        return NextResponse.json(
          {
            error: `Please wait ${Math.ceil(cooldown / 1000)} seconds before requesting a new code.`,
            needsVerification: true,
            email: normalizedEmail,
            resendInMs: cooldown,
          },
          { status: 429 }
        );
      }
    } else {
      // Create a pending, email-only user. Password/name/service are added on
      // the final signup step once the OTP has been verified.
      const user = await createUser({
        name: "",
        email: normalizedEmail,
        passwordHash: "",
        emailVerified: false,
      });
      if (!user._id) {
        return NextResponse.json(
          { error: "Unable to start registration. Please try again." },
          { status: 500 }
        );
      }
      userId = String(user._id);
    }

    const otpResult = await createAndSendOtp(userId, normalizedEmail, now);
    if (!otpResult.ok || !otpResult.sent) {
      return NextResponse.json(
        {
          error:
            otpResult.error ||
            "Failed to send verification code to your email. Please check your email address and try again.",
          emailSent: false,
        },
        { status: otpResult.status || 502 }
      );
    }

    return NextResponse.json(
      {
        message: "We sent a verification code to your email.",
        needsVerification: true,
        email: normalizedEmail,
        emailSent: true,
        isExistingUser: false,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[start-register] Error details:", {
      message: errorMsg,
      name: error instanceof Error ? error.name : "Unknown",
    });

    const isStorageError =
      errorMsg.includes("EROFS") ||
      errorMsg.includes("EACCES") ||
      errorMsg.includes("EPERM") ||
      errorMsg.includes("writeStore");

    const isDbConnectionError =
      errorMsg.includes("MongoDB") ||
      errorMsg.includes("ECONNREFUSED") ||
      errorMsg.includes("ETIMEDOUT") ||
      errorMsg.includes("MongoNetworkError") ||
      errorMsg.includes("MongoServerSelectionError") ||
      errorMsg.includes("ENOTFOUND") ||
      errorMsg.includes("getaddrinfo");

    if (isStorageError || isDbConnectionError) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Unable to start registration. Please try again." },
      { status: 500 }
    );
  }
}
