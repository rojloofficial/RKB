import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const token =
    (process.env.ADMIN_TOKEN ?? "").trim().replace(/^['"]|['"]$/g, "") ||
    "rojlo_admin_secret_token_2026";
  const targetEmail = (request.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  const baseVipToken = token ? `admin_${token}` : "admin";
  const vipCookieValue = targetEmail ? `${baseVipToken}::${targetEmail}` : baseVipToken;

  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:";

  const response = NextResponse.redirect(new URL("/vip", request.url));
  response.cookies.set("rojlo_vip", vipCookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    secure: isHttps,
  });

  return response;
}
