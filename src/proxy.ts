import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEFAULT_ADMIN_TOKEN = "rojlo_admin_secret_token_2026";

function getAdminToken(): string {
  return (process.env.ADMIN_TOKEN ?? "").trim().replace(/^['"]|['"]$/g, "") || DEFAULT_ADMIN_TOKEN;
}

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

  const token = getAdminToken();
  const adminCookie = request.cookies.get("rojlo_admin")?.value;
  const subCookie = request.cookies.get("rojlo_subadmin")?.value;

  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.nextUrl.protocol === "https:";

  // Main admin: valid token -> allow with a sliding session refresh.
  if (token && (adminCookie === token || adminCookie === DEFAULT_ADMIN_TOKEN)) {
    const response = NextResponse.next();
    response.cookies.set("rojlo_admin", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: isHttps,
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
        secure: isHttps,
      });
    }
    if (subCookie) {
      response.cookies.set("rojlo_subadmin", subCookie, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        secure: isHttps,
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

