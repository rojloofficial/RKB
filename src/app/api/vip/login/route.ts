import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyVipCredentials } from "@/lib/models/vip";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";

function normalizeEnvValue(value?: string): string {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

async function matchesAdminPassword(
  password: string,
  configuredPassword: string
): Promise<boolean> {
  const clean = configuredPassword.replace(/\\(\$)/g, "$1");
  if (/^\$2[aby]\$\d{2}\$/.test(clean)) {
    return bcrypt.compare(password, clean).catch(() => false);
  }
  return password === clean || password === configuredPassword;
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`vip-login:${ip}`, 10);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in a few minutes." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Check if main admin is logging in via VIP login portal
    const validAdminEmail = normalizeEnvValue(process.env.ADMIN_EMAIL).toLowerCase();
    const validAdminPassword = normalizeEnvValue(process.env.ADMIN_PASSWORD);
    const configuredToken = normalizeEnvValue(process.env.ADMIN_TOKEN);

    if (
      validAdminEmail &&
      validAdminPassword &&
      configuredToken &&
      email === validAdminEmail &&
      (await matchesAdminPassword(password, validAdminPassword))
    ) {
      const response = NextResponse.json({
        success: true,
        role: "admin",
        redirect: "/vip",
      });
      response.cookies.set("rojlo_vip", `admin_${configuredToken}`, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });
      response.cookies.set("rojlo_admin", configuredToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }

    // Verify VIP credentials
    const vipRes = await verifyVipCredentials(email, password);
    if (!vipRes.success || !vipRes.sessionToken) {
      return NextResponse.json(
        { error: vipRes.error || "Invalid email or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      role: "vip",
      redirect: "/vip",
    });

    response.cookies.set("rojlo_vip", vipRes.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("[vip-login] Error:", error);
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
