import { NextRequest, NextResponse } from "next/server";
import {
  findUserById,
  findUserByEmail,
  findUserBySessionToken,
  type User,
} from "@/lib/models/user";
import { extractJWTFromHeader, verifyJWT } from "@/lib/jwt";
import { checkCoinPurchaseEligibility } from "@/lib/models/payment-request";

export const dynamic = "force-dynamic";

async function getAuthUser(req: NextRequest): Promise<User | null> {
  const authHeader = req.headers.get("Authorization");
  if (authHeader) {
    const token = extractJWTFromHeader(authHeader);
    if (token) {
      const payload = verifyJWT(token);
      if (payload?._id) {
        const user = await findUserById(payload._id);
        if (user) return user;
      }
      if (payload?.email) {
        const user = await findUserByEmail(payload.email);
        if (user) return user;
      }
    }
  }

  const raw = req.cookies.get("rojlo_auth")?.value;
  if (!raw) return null;

  const sessionUser = await findUserBySessionToken(raw);
  if (sessionUser) return sessionUser;

  const jwtPayload = verifyJWT(raw);
  if (jwtPayload?._id) {
    const user = await findUserById(jwtPayload._id);
    if (user) return user;
  }
  if (jwtPayload?.email) {
    const user = await findUserByEmail(jwtPayload.email);
    if (user) return user;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed?._id) {
      const user = await findUserById(parsed._id);
      if (user) return user;
    }
    if (parsed?.email) {
      const user = await findUserByEmail(parsed.email);
      if (user) return user;
    }
  } catch {}

  return findUserById(raw);
}

export async function GET(req: NextRequest) {
  try {
    let email = "";
    const user = await getAuthUser(req);
    if (user?.email) {
      email = String(user.email).toLowerCase().trim();
    }

    const queryEmail = req.nextUrl.searchParams.get("email");
    if (!email && queryEmail) {
      email = String(queryEmail).toLowerCase().trim();
    }

    if (!email) {
      return NextResponse.json({ error: "Unauthorized: email required" }, { status: 401 });
    }

    const eligibility = await checkCoinPurchaseEligibility(email);

    return NextResponse.json(
      {
        success: true,
        email,
        ...eligibility,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("[eligibility] error checking coin purchase eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check coin purchase eligibility" },
      { status: 500 }
    );
  }
}
