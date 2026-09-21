import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  findUserByEmail,
  issueUserSession,
  normalizeEmail,
  setUserEmailVerified,
  toPublicUser,
  updateUserFields,
} from "@/lib/models/user";
import { generateJWT, verifyJWT } from "@/lib/jwt";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";

/**
 * Final step of the signup flow: the user submits name/password/service plus a
 * signupToken (proving their email was OTP-verified). This completes the
 * pending account and logs the user in.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`signup:${ip}`, 10);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, email, password, service, signupToken } = body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password || !signupToken) {
      return NextResponse.json(
        { error: "Name, email, password and verification are required." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // The signupToken must be a valid JWT that proves this email was verified
    // via OTP (purpose = "signup"). Never trust a client-supplied email alone.
    const token = verifyJWT(String(signupToken));
    if (
      !token ||
      token.purpose !== "signup" ||
      normalizeEmail(token.email) !== normalizedEmail
    ) {
      return NextResponse.json(
        { error: "Email verification is invalid or expired. Please register again." },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(normalizedEmail);
    if (!existing || !existing._id) {
      return NextResponse.json(
        { error: "Registration session not found. Please start again." },
        { status: 400 }
      );
    }
    if (existing.passwordHash && existing.passwordHash.length > 0) {
      return NextResponse.json(
        {
          error: "Use other email, this email already have account.",
          alreadyExists: true,
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const loginDate = new Date();
    const updated = await updateUserFields(existing._id, {
      name: String(name).trim(),
      passwordHash,
      service: service ? String(service).trim() : undefined,
      lastLogin: loginDate,
      emailVerified: true,
    });
    await setUserEmailVerified(existing._id, true);
    if (!updated) {
      return NextResponse.json(
        { error: "Unable to create account. Please try again." },
        { status: 500 }
      );
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user || !user._id) {
      return NextResponse.json(
        { error: "Unable to create account. Please try again." },
        { status: 500 }
      );
    }

    const publicUser = toPublicUser({ ...user, emailVerified: true, lastLogin: loginDate });
    const sessionToken = await issueUserSession(user._id);
    const jwtToken = generateJWT({
      _id: user._id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json(
      {
        message: "Account created successfully.",
        user: publicUser,
        token: jwtToken,
      },
      { status: 201 }
    );

    if (sessionToken) {
      response.cookies.set("rojlo_auth", sessionToken, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? (error as { code?: string | number }).code
        : undefined;

    console.error("[signup] Error details:", {
      message: errorMsg,
      code: errorCode,
      name: error instanceof Error ? error.name : "Unknown",
    });

    if (errorCode === 11000) {
      return NextResponse.json(
        {
          error: "Use other email, this email already have account.",
          alreadyExists: true,
        },
        { status: 409 }
      );
    }

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

    if (isStorageError) {
      console.error(
        "[signup] Storage error detected - likely Vercel environment. " +
          "Ensure MONGODB_URI is configured in Vercel environment variables."
      );
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    if (isDbConnectionError) {
      console.error(
        "[signup] Database connection error. " +
          "Check MongoDB Atlas IP whitelist and connection string."
      );
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Unable to create account. Please try again." },
      { status: 500 }
    );
  }
}
