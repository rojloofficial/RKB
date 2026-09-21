import { NextRequest, NextResponse } from "next/server";
import { getVipContext } from "@/lib/vip-access";
import { getVipScopedStats } from "@/lib/models/vip";
import { listStates } from "@/lib/models/state";
import { listAllCities } from "@/lib/models/city";
import { listAllAds } from "@/lib/models/ad";
import { listUsers } from "@/lib/models/user";

export async function GET(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (ctx.role === "admin") {
    const [states, cities, ads, users] = await Promise.all([
      listStates(),
      listAllCities(),
      listAllAds(),
      listUsers(),
    ]);

    return NextResponse.json({
      statesCount: states.length,
      citiesCount: cities.length,
      usersCount: users.length,
      adsCount: ads.length,
      hasStateAccess: true,
      assignments: [],
    });
  }

  const stats = await getVipScopedStats(ctx.email);
  return NextResponse.json(stats);
}
