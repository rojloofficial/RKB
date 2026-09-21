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

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`resend-otp:${ip}`, 15);
    if (!rate.ok) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again in a few minutes.",
        },
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

    // If an established account already exists, prompt user to use another email
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
            resendInMs: cooldown,
          },
          { status: 429 }
        );
      }
    } else {
      const newUser = await createUser({
        name: "",
        email: normalizedEmail,
        passwordHash: "",
        emailVerified: false,
      });
      if (!newUser._id) {
        return NextResponse.json(
          { error: "Unable to resend verification code. Please try again." },
          { status: 500 }
        );
      }
      userId = String(newUser._id);
    }

    const otpResult = await createAndSendOtp(userId, normalizedEmail, now);
    if (!otpResult.ok || !otpResult.sent) {
      return NextResponse.json(
        {
          error:
            otpResult.error ||
            "Failed to send verification code to your email. Please try again.",
          emailSent: false,
        },
        { status: otpResult.status || 502 }
      );
    }

    return NextResponse.json(
      {
        message: "A new verification code has been sent to your email.",
        emailSent: true,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[resend-otp] Error details:", {
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
      { error: "Unable to resend the verification code. Please try again." },
      { status: 500 }
    );
  }
}
