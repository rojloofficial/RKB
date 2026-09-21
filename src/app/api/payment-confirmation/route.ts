import { NextRequest, NextResponse } from "next/server";
import {
  findUserById,
  findUserByEmail,
  findUserBySessionToken,
  type User,
} from "@/lib/models/user";
import { extractJWTFromHeader, verifyJWT } from "@/lib/jwt";
import {
  createPaymentRequest,
  findPaymentRequestByTransactionId,
  listPaymentRequestsByUser,
  checkCoinPurchaseEligibility,
} from "@/lib/models/payment-request";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";

async function getAuthUser(req: NextRequest): Promise<User | null> {
  // 1. Try Authorization header
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

  // 2. Try cookie
  const raw = req.cookies.get("rojlo_auth")?.value;
  if (!raw) return null;

  const sessionUser = await findUserBySessionToken(raw);
  if (sessionUser) return sessionUser;

  // Might be stored JWT in cookie
  const jwtPayload = verifyJWT(raw);
  if (jwtPayload?._id) {
    const user = await findUserById(jwtPayload._id);
    if (user) return user;
  }
  if (jwtPayload?.email) {
    const user = await findUserByEmail(jwtPayload.email);
    if (user) return user;
  }

  // Legacy JSON cookie
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
  } catch {
    // Non-JSON
  }

  return findUserById(raw);
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userIdStr = String(user._id || "");
    const userEmailStr = (user.email || "").toLowerCase();

    const myRequests = await listPaymentRequestsByUser(userIdStr, userEmailStr);

    return NextResponse.json({ requests: myRequests, success: true });
  } catch (error) {
    console.error("Payment history fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch payment history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = clientIp(req);
    const rate = await checkRateLimitAsync(`payment-submit:${ip}`, 10, 60 * 1000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many payment submissions. Please wait a moment." },
        { status: 429 }
      );
    }

    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { coins, amount, transactionId, couponCode, discount } = body;

    if (!transactionId || !coins || !amount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const coinCount = Number(coins);
    const amountValue = Number(amount);

    // Basic sanity validation to prevent negative/zero/abusive values.
    if (!Number.isFinite(coinCount) || coinCount <= 0) {
      return NextResponse.json(
        { error: "Invalid coins value" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return NextResponse.json(
        { error: "Invalid amount value" },
        { status: 400 }
      );
    }

    // Deduplicate: reject an already-used transaction id using direct indexed query
    const existing = await findPaymentRequestByTransactionId(String(transactionId).trim());
    if (existing) {
      return NextResponse.json(
        { error: "This transaction has already been recorded." },
        { status: 409 }
      );
    }

    // 24-Hour Purchase Limit: Each email can only purchase coins once every 24 hours
    const eligibility = await checkCoinPurchaseEligibility(user.email);
    if (!eligibility.allowed) {
      return NextResponse.json(
        {
          error: `You can only purchase coins once every 24 hours on this email. Please wait ${eligibility.remainingFormatted} before purchasing again.`,
          remainingMs: eligibility.remainingMs,
          remainingFormatted: eligibility.remainingFormatted,
          nextAllowedAt: eligibility.nextAllowedAt,
        },
        { status: 403 }
      );
    }

    const paymentRequest = await createPaymentRequest({
      userEmail: user.email.toLowerCase(),
      userId: String(user._id || ""),
      transactionId: String(transactionId).trim(),
      coins: coinCount,
      amount: amountValue,
      discount: discount ? Number(discount) : undefined,
      couponCode: couponCode ? String(couponCode).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      paymentRequest,
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to record payment" },
      { status: 500 }
    );
  }
}
