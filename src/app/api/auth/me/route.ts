import { NextRequest, NextResponse } from "next/server";
import {
  findUserByEmail,
  findUserById,
  findUserBySessionToken,
  issueUserSession,
  toPublicUser,
  type PublicUser,
} from "@/lib/models/user";
import { verifyJWT, extractJWTFromHeader } from "@/lib/jwt";

export async function GET(request: NextRequest) {
  try {
    const rawCookie = request.cookies.get("rojlo_auth")?.value;
    const authHeader = request.headers.get("Authorization");

    // 1. Try JWT token first from Authorization header
    if (authHeader) {
      const jwtToken = extractJWTFromHeader(authHeader);
      if (jwtToken) {
        const payload = verifyJWT(jwtToken);
        if (payload && (payload._id || payload.email)) {
          let user = payload._id ? await findUserById(payload._id) : null;
          if (!user && payload.email) {
            user = await findUserByEmail(payload.email);
          }
          if (user) {
            return NextResponse.json({ user: toPublicUser(user), success: true });
          }
          // If valid, unexpired JWT signature but DB lookup is temporarily slow,
          // return authenticated state from payload to avoid false client-side logouts.
          return NextResponse.json({
            user: {
              _id: String(payload._id || ""),
              name: String(payload.name || "User"),
              email: String(payload.email || ""),
              coins: 0,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            success: true,
          });
        }
      }
    }

    // 2. Try session cookie
    const raw = rawCookie ? rawCookie.trim() : "";
    if (!raw) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // 2a. Check sessionToken in DB/store
    let user = await findUserBySessionToken(raw);
    if (user) {
      return NextResponse.json({ user: toPublicUser(user), success: true });
    }

    // 2b. Check if cookie is a JWT token
    const cookieJwtPayload = verifyJWT(raw);
    if (cookieJwtPayload && (cookieJwtPayload._id || cookieJwtPayload.email)) {
      if (cookieJwtPayload._id) {
        user = await findUserById(cookieJwtPayload._id);
      }
      if (!user && cookieJwtPayload.email) {
        user = await findUserByEmail(cookieJwtPayload.email);
      }
      if (user) {
        return NextResponse.json({ user: toPublicUser(user), success: true });
      }
      return NextResponse.json({
        user: {
          _id: String(cookieJwtPayload._id || ""),
          name: String(cookieJwtPayload.name || "User"),
          email: String(cookieJwtPayload.email || ""),
          coins: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        success: true,
      });
    }

    // 2c. Check JSON-encoded cookie
    let legacyUser: PublicUser | null = null;
    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as PublicUser;
      if (parsed && parsed._id && parsed.email) {
        legacyUser = parsed;
      }
    } catch {}

    if (legacyUser?._id) {
      const freshUser = await findUserById(legacyUser._id);
      if (freshUser) {
        legacyUser = toPublicUser(freshUser);
      }
    }

    // 2d. Check raw ID
    if (!legacyUser && !raw.includes(".")) {
      const freshById = await findUserById(raw);
      if (freshById) {
        legacyUser = toPublicUser(freshById);
      }
    }

    if (!legacyUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const issued = legacyUser._id ? await issueUserSession(legacyUser._id) : null;
    const response = NextResponse.json({ user: legacyUser, success: true });
    if (issued) {
      response.cookies.set("rojlo_auth", issued, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  } catch (error) {
    console.error("[auth/me] Error in auth/me verification:", error);
    return NextResponse.json(
      { error: "Authentication service temporarily unavailable." },
      { status: 503 }
    );
  }
}

