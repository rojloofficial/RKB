import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";
import { verifySubAdmin } from "@/lib/models/admin-user";

const DEFAULT_ADMIN_EMAIL = "vanni@gmail.com";
const DEFAULT_ADMIN_PASSWORD = "vanni12@";
const DEFAULT_ADMIN_TOKEN = "rojlo_admin_secret_token_2026";

function normalizeEnvValue(value?: string): string {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

async function matchesAdminPassword(
  password: string,
  configuredPassword: string
): Promise<boolean> {
  const clean = configuredPassword.replace(/\\(\$)/g, "$1").trim().replace(/^['"]|['"]$/g, "");
  const trimmedPassword = password.trim();
  if (/^\$2[aby]\$\d{2}\$/.test(clean)) {
    const directMatch = await bcrypt.compare(password, clean).catch(() => false);
    if (directMatch) return true;
    return bcrypt.compare(trimmedPassword, clean).catch(() => false);
  }
  return (
    password === clean ||
    password === configuredPassword ||
    trimmedPassword === clean ||
    trimmedPassword === configuredPassword.trim()
  );
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`admin-login:${ip}`, 10);
    if (!rate.ok) {
      return NextResponse.json(
        {
          error:
            "Too many login attempts. Please try again in a few minutes.",
        },
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

    const validEmail = (normalizeEnvValue(process.env.ADMIN_EMAIL) || DEFAULT_ADMIN_EMAIL).toLowerCase();
    const validPassword = normalizeEnvValue(process.env.ADMIN_PASSWORD) || DEFAULT_ADMIN_PASSWORD;
    const configuredToken = normalizeEnvValue(process.env.ADMIN_TOKEN) || DEFAULT_ADMIN_TOKEN;

    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.nextUrl.protocol === "https:";

    // 1. Check Main Admin credentials
    if (validEmail && validPassword && configuredToken) {
      const emailMatch = email === validEmail;
      const passwordMatch = emailMatch ? await matchesAdminPassword(password, validPassword) : false;

      if (emailMatch && passwordMatch) {
        const response = NextResponse.json({ success: true, role: "main" });
        response.cookies.set("rojlo_admin", configuredToken, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
          secure: isHttps,
        });
        response.cookies.set("rojlo_subadmin", "", {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
          secure: isHttps,
        });

        return response;
      }
    }

    // 2. Check Sub-Admin credentials in database
    const subAdmin = await verifySubAdmin(email, password);
    if (subAdmin && subAdmin.sessionToken) {
      const response = NextResponse.json({ success: true, role: "subadmin" });
      response.cookies.set("rojlo_subadmin", subAdmin.sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        secure: isHttps,
      });
      response.cookies.set("rojlo_admin", "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
        secure: isHttps,
      });

      return response;
    }

    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  } catch (error) {
    console.error("[admin-login] Error details:", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Unable to log in. Please try again." },
      { status: 500 }
    );
  }
}
