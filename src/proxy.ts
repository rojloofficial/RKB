import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const adminToken = (process.env.ADMIN_TOKEN ?? "").trim().replace(/^['"]|['"]$/g, "");

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- VIP Route Protection ---
  if (
    pathname === "/vip" ||
    pathname.startsWith("/vip/") ||
    pathname === "/api/vip" ||
    pathname.startsWith("/api/vip/")
  ) {
    const isVipLoginPage =
      pathname === "/vip/login" || pathname.startsWith("/vip/login/");
    const isVipCreatePasswordPage =
      pathname === "/vip/create-password" ||
      pathname.startsWith("/vip/create-password/");
    const isVipLoginApi =
      pathname === "/api/vip/login" || pathname.startsWith("/api/vip/login/");
    const isVipCreatePasswordApi =
      pathname === "/api/vip/create-password" ||
      pathname.startsWith("/api/vip/create-password/");

    if (
      isVipLoginPage ||
      isVipCreatePasswordPage ||
      isVipLoginApi ||
      isVipCreatePasswordApi
    ) {
      return NextResponse.next();
    }

    const vipCookie = request.cookies.get("rojlo_vip")?.value;

    // Strict VIP authentication check:
    // Only users who have authenticated via the VIP login portal possess a valid rojlo_vip cookie.
    if (vipCookie && vipCookie.trim().length > 0) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/vip")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/vip/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // --- Admin Route Protection ---
  const isLoginPage =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  const isLoginApi =
    pathname === "/api/admin/login" || pathname.startsWith("/api/admin/login/");
  if (isLoginPage || isLoginApi) {
    return NextResponse.next();
  }

  const token = adminToken;
  const adminCookie = request.cookies.get("rojlo_admin")?.value;
  const subCookie = request.cookies.get("rojlo_subadmin")?.value;

  // Main admin: valid token -> allow with a sliding session refresh.
  if (token && adminCookie === token) {
    const response = NextResponse.next();
    response.cookies.set("rojlo_admin", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: process.env.NODE_ENV === "production",
    });
    return response;
  }

  // Dedicated admin session cookies are validated by the route handlers.
  // The proxy only prevents unauthenticated navigation and API calls.
  if (adminCookie || subCookie) {
    const response = NextResponse.next();
    if (adminCookie) {
      response.cookies.set("rojlo_admin", adminCookie, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });
    }
    if (subCookie) {
      response.cookies.set("rojlo_subadmin", subCookie, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response;
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/vip",
    "/vip/:path*",
    "/api/vip/:path*",
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};

export default proxy;
export { proxy as middleware };

