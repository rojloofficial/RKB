import { NextRequest, NextResponse } from "next/server";
import {
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

    // Try JWT token first (from Authorization header)
    const authHeader = request.headers.get("Authorization");
    if (authHeader) {
      const jwtToken = extractJWTFromHeader(authHeader);
      if (jwtToken) {
        const payload = verifyJWT(jwtToken);
        if (payload?._id) {
          const user = await findUserById(payload._id);
          if (user) {
            // Revocation check: only honor a JWT when the user has an active
            // logged-in session. On logout the sessionToken is cleared, so a
            // stale JWT in localStorage can no longer authenticate.
            if (user.sessionToken) {
              // If a session cookie is also present, it must match the active
              // session token for the JWT+cookie combo to be consistent.
              if (!rawCookie || user.sessionToken === rawCookie) {
                return NextResponse.json({ user: toPublicUser(user) });
              }
            }
          }
        }
      }
    }

    // Fallback to session cookie
    const raw = rawCookie;

    if (!raw) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const current = await findUserBySessionToken(raw);
    if (current) {
      return NextResponse.json({ user: toPublicUser(current) });
    }

    let legacyUser: PublicUser | null = null;

    try {
      const parsed = JSON.parse(decodeURIComponent(raw)) as PublicUser;
      if (parsed && parsed._id && parsed.email) {
        legacyUser = parsed;
      }
    } catch {
      // Legacy cookie format: fall through to a DB lookup by id.
    }

    if (legacyUser?._id) {
      const freshUser = await findUserById(legacyUser._id);
      if (freshUser) {
        legacyUser = toPublicUser(freshUser);
      }
    }

    if (!legacyUser) {
      const user = await findUserById(raw);
      if (!user) {
        return NextResponse.json({ user: null }, { status: 401 });
      }
      legacyUser = toPublicUser(user);
    }

    const issued = legacyUser._id ? await issueUserSession(legacyUser._id) : null;
    const response = NextResponse.json({ user: legacyUser });
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
    console.error("[auth/me] Authentication storage unavailable:", error);
    return NextResponse.json(
      { error: "Authentication service temporarily unavailable." },
      { status: 503 }
    );
  }
}

