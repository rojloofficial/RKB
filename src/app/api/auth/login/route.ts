import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import {
  findUserByEmail,
  issueUserSession,
  normalizeEmail,
  toPublicUser,
  updateUserFields,
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

    const storedHash = String(user.passwordHash || (user as { password?: string }).password || "").trim();
    if (!storedHash) {
      return NextResponse.json(
        { error: "Account registration is incomplete. Please sign up to set your password." },
        { status: 400 }
      );
    }
    let valid = false;

    if (
      storedHash.startsWith("$2a$") ||
      storedHash.startsWith("$2b$") ||
      storedHash.startsWith("$2y$")
    ) {
      try {
        valid = await bcrypt.compare(password, storedHash);
      } catch {
        valid = false;
      }
    }

    if (!valid && (storedHash === password || storedHash === password.trim())) {
      valid = true;
      try {
        const newHash = await bcrypt.hash(password, 10);
        await updateUserFields(String(user._id), { passwordHash: newHash }, user.email);
      } catch (err) {
        console.error("[login] Failed to auto-upgrade plain password hash:", err);
      }
    }

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const userIdStr = String(user._id || "");
    const loginDate = new Date();

    // Save login date to database and store
    try {
      await updateUserFields(
        userIdStr,
        { lastLogin: loginDate },
        user.email
      );
    } catch (loginDateErr) {
      console.warn("[login] Notice: could not update lastLogin date:", loginDateErr);
    }

    const publicUser = toPublicUser({
      ...user,
      lastLogin: loginDate,
    });
    const sessionToken = userIdStr ? await issueUserSession(userIdStr) : null;

    // Generate JWT token
    const jwtToken = userIdStr
      ? generateJWT({
          _id: userIdStr,
          email: user.email,
          name: user.name,
        })
      : null;

    const response = NextResponse.json({
      message: "Logged in successfully.",
      user: {
        ...publicUser,
        _id: userIdStr,
        lastLogin: loginDate.toISOString(),
      },
      token: jwtToken, // JWT token in response
    });

    const authCookieVal = sessionToken || jwtToken;
    if (authCookieVal) {
      response.cookies.set("rojlo_auth", authCookieVal, {
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

    return NextResponse.json(
      { error: "Unable to log in. Please check your credentials and try again." },
      { status: 500 }
    );
  }
}

