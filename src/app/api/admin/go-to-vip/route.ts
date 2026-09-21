import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const token = (process.env.ADMIN_TOKEN ?? "").trim().replace(/^['"]|['"]$/g, "");
  const targetEmail = (request.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  const baseVipToken = token ? `admin_${token}` : "admin";
  const vipCookieValue = targetEmail ? `${baseVipToken}::${targetEmail}` : baseVipToken;

  const response = NextResponse.redirect(new URL("/vip", request.url));
  response.cookies.set("rojlo_vip", vipCookieValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
