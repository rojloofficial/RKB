import { NextRequest, NextResponse } from "next/server";
import { setVipPassword, verifyVipSetupToken } from "@/lib/models/vip";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`vip-create-pass:${ip}`, 10);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: "Email, setup token, and new password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const result = await setVipPassword(email, token, password);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to set password." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password created successfully. Redirecting to VIP login...",
    });
  } catch (error) {
    console.error("[vip-create-password] Error:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  if (!email || !token) {
    return NextResponse.json({ valid: false, error: "Missing parameters" }, { status: 400 });
  }

  const valid = await verifyVipSetupToken(token, email);
  return NextResponse.json({ valid });
}
