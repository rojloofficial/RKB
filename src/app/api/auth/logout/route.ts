import { NextRequest, NextResponse } from "next/server";
import { clearUserSession } from "@/lib/models/user";

function clearAuthCookie(response: NextResponse) {
  response.cookies.set("rojlo_auth", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function POST(request: NextRequest) {
  const raw = request.cookies.get("rojlo_auth")?.value;
  const response = NextResponse.json({ message: "Logged out successfully." });
  try {
    await clearUserSession(raw ?? "");
  } catch (error) {
    console.error("[auth/logout] Session cleanup failed:", error);
  }
  clearAuthCookie(response);
  return response;
}

export async function GET(request: NextRequest) {
  const raw = request.cookies.get("rojlo_auth")?.value;
  const response = NextResponse.redirect(new URL("/login", request.url));
  try {
    await clearUserSession(raw ?? "");
  } catch (error) {
    console.error("[auth/logout] Session cleanup failed:", error);
  }
  clearAuthCookie(response);
  return response;
}

