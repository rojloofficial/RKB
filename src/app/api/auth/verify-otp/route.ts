import { NextRequest, NextResponse } from "next/server";
import {
  clearUserOtp,
  findUserByEmail,
  incrementUserOtpAttempts,
  issueUserSession,
  normalizeEmail,
  setUserEmailVerified,
  toPublicUser,
} from "@/lib/models/user";
import { OTP_MAX_ATTEMPTS } from "@/lib/otp";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";
import { generateJWT } from "@/lib/jwt";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`verify-otp:${ip}`, 10);
    if (!rate.ok) {
      return NextResponse.json(
        {
          error: "Too many verification attempts. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, otp } = body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { error: "Enter the 6-digit verification code." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(normalizedEmail);

    // User must exist and have an active OTP
    if (!user || !user._id) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    const now = new Date();

    // Expired OTP — clear it and ask for a new one.
    if (!user.otpExpires || new Date(user.otpExpires).getTime() < now.getTime()) {
      await clearUserOtp(String(user._id));
      return NextResponse.json(
        { error: "This verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Too many failed attempts — invalidate and require a new OTP.
    if (Number(user.otpAttempts ?? 0) >= OTP_MAX_ATTEMPTS) {
      await clearUserOtp(String(user._id));
      return NextResponse.json(
        { error: "Too many incorrect attempts. Please request a new code." },
        { status: 429 }
      );
    }

    // Collect all candidate valid hashes (supports resend / out-of-order delivery)
    const validHashes: string[] = [];
    if (user.otpHash) validHashes.push(user.otpHash);
    if (Array.isArray(user.otpHashes)) {
      for (const h of user.otpHashes) {
        if (h && !validHashes.includes(h)) {
          validHashes.push(h);
        }
      }
    }

    if (validHashes.length === 0) {
      await clearUserOtp(String(user._id));
      return NextResponse.json(
        { error: "This verification code has expired. Please request a new code." },
        { status: 400 }
      );
    }

    const isMatch = validHashes.some((expectedHash) =>
      verifyOtp(otp, expectedHash, normalizedEmail)
    );

    if (!isMatch) {
      const attempts = await incrementUserOtpAttempts(String(user._id));
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await clearUserOtp(String(user._id));
        return NextResponse.json(
          { error: "Too many incorrect attempts. Please request a new code." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 }
      );
    }

    // OTP correct -> invalidate the OTP
    await clearUserOtp(String(user._id));
    await setUserEmailVerified(String(user._id), true);

    // If this is an existing user who already set up a password, log them in immediately!
    if (user.passwordHash) {
      const sessionToken = await issueUserSession(String(user._id));
      const jwtToken = generateJWT({
        _id: String(user._id),
        email: user.email,
        name: user.name || "User",
      });

      const response = NextResponse.json({
        message: "Logged in successfully.",
        otpVerified: true,
        isNewUser: false,
        user: toPublicUser({ ...user, emailVerified: true }),
        token: jwtToken,
      });

      response.cookies.set("rojlo_auth", sessionToken || jwtToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });

      return response;
    }

    // Otherwise, this is a new user -> issue short-lived signupToken to complete registration
    const signupToken = generateJWT({
      _id: String(user._id),
      email: user.email,
      name: "signup",
      purpose: "signup",
    });

    return NextResponse.json({
      message: "Email verified successfully.",
      otpVerified: true,
      isNewUser: true,
      email: user.email,
      signupToken,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[verify-otp] Error details:", {
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
      { error: "Unable to verify the code. Please try again." },
      { status: 500 }
    );
  }
}
