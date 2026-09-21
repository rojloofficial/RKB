import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  findUserByEmail,
  issueUserSession,
  normalizeEmail,
  toPublicUser,
} from "@/lib/models/user";
import { generateJWT } from "@/lib/jwt";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`login:${ip}`, 10);
    if (!rate.ok) {
      return NextResponse.json(
        {
          error:
            "Too many login attempts. Please try again in a few minutes.",
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password } = body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const publicUser = toPublicUser(user);
    const sessionToken = user._id ? await issueUserSession(user._id) : null;

    // Generate JWT token
    const jwtToken = user._id
      ? generateJWT({
          _id: user._id,
          email: user.email,
          name: user.name,
        })
      : null;

    const response = NextResponse.json({
      message: "Logged in successfully.",
      user: publicUser,
      token: jwtToken, // JWT token in response
    });

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
    const errorCode = error && typeof error === "object" && "code" in error
      ? (error as { code?: string | number }).code
      : undefined;

    console.error("[login] Error details:", {
      message: errorMsg,
      code: errorCode,
      name: error instanceof Error ? error.name : "Unknown",
    });

    // Check if it's a filesystem/storage error
    const isStorageError =
      errorMsg.includes("EROFS") ||
      errorMsg.includes("EACCES") ||
      errorMsg.includes("EPERM") ||
      errorMsg.includes("writeStore");

    // Check if it's a database connection error
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
      { error: "Unable to log in. Please try again." },
      { status: 500 }
    );
  }
}

