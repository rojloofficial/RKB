import { NextRequest, NextResponse } from "next/server";
import { getVipContext } from "@/lib/vip-access";
import { getVipScopedUsers } from "@/lib/models/vip";
import { listUsers } from "@/lib/models/user";
import { countAdsPerUser } from "@/lib/models/ad";

export async function GET(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (ctx.role === "admin") {
    const [users, counts] = await Promise.all([listUsers(), countAdsPerUser()]);
    const usersWithCount = users.map((u) => ({
      ...u,
      adCount: counts[u._id ?? ""] ?? 0,
    }));
    return NextResponse.json({ users: usersWithCount });
  }

  const users = await getVipScopedUsers(ctx.email);
  return NextResponse.json({ users });
}
