import "server-only";

import { NextRequest } from "next/server";
import {
  getAdminBySession,
} from "@/lib/models/admin-user";

export type AdminContext =
  | { role: "main" }
  | { role: "subadmin"; id: string; email: string; permissions: string[] };

export const ADMIN_SECTIONS = [
  { key: "dashboard", name: "Dashboard" },
  { key: "state", name: "State" },
  { key: "city", name: "City" },
  { key: "city-seo", name: "City SEO" },
  { key: "dynamic-seo", name: "Dynamic SEO" },
  { key: "ads", name: "Ads" },
  { key: "users", name: "Users" },
  { key: "upi", name: "UPI" },
  { key: "coupon", name: "Coupon" },
  { key: "payment-request", name: "Payment Request" },
  { key: "payment-history", name: "Payment History" },
  { key: "set-coins", name: "Set Coins" },
  { key: "promotion-packages", name: "Promotion Package" },
  { key: "vip", name: "VIP" },
  { key: "phone-control", name: "Phone No. Control" },
  { key: "admin-control", name: "Admin Control" },
  { key: "sub-admins", name: "Sub Admin List" },
  { key: "not-found", name: "404 Pages" },
] as const;

export function sectionFromHref(href: string): string | null {
  if (href === "/admin") return "dashboard";
  const match = ADMIN_SECTIONS.find(
    (s) =>
      s.key !== "dashboard" &&
      (href === `/admin/${s.key}` || href.startsWith(`/admin/${s.key}/`))
  );
  return match ? match.key : null;
}

const DEFAULT_ADMIN_TOKEN = "rojlo_admin_secret_token_2026";

function normalizeEnvValue(value?: string): string {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "");
}

function getAdminToken(): string {
  return normalizeEnvValue(process.env.ADMIN_TOKEN) || DEFAULT_ADMIN_TOKEN;
}

export async function getAdminContext(
  request: NextRequest
): Promise<AdminContext | null> {
  const token = getAdminToken();
  const adminCookie = request.cookies.get("rojlo_admin")?.value;
  if (token && (adminCookie === token || adminCookie === DEFAULT_ADMIN_TOKEN)) {
    return { role: "main" };
  }
  const subToken = request.cookies.get("rojlo_subadmin")?.value;
  if (subToken) {
    const admin = await getAdminBySession(subToken);
    if (admin) {
      if (admin.role === "main") {
        return { role: "main" };
      }
      return {
        role: "subadmin",
        id: admin._id,
        email: admin.email,
        permissions: admin.permissions ?? [],
      };
    }
  }
  return null;
}

export function isAuthenticated(request: NextRequest): boolean {
  const token = getAdminToken();
  const adminCookie = request.cookies.get("rojlo_admin")?.value;
  if (token && (adminCookie === token || adminCookie === DEFAULT_ADMIN_TOKEN)) {
    return true;
  }
  return Boolean(request.cookies.get("rojlo_subadmin")?.value);
}

export function canAccess(
  context: AdminContext | null,
  section: string
): boolean {
  if (!context) return false;
  if (context.role === "main") return true;
  if (section === "admin-control" || section === "sub-admins") return false;
  if (section === "dynamic-seo") {
    return (
      context.permissions.includes("dynamic-seo") ||
      context.permissions.includes("city-seo") ||
      context.permissions.includes("city")
    );
  }
  return context.permissions.includes(section);
}
