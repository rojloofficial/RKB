import { NextRequest, NextResponse } from "next/server";
import { getVipContext } from "@/lib/vip-access";
import { getVipScopedCities } from "@/lib/models/vip";
import { listAllCities } from "@/lib/models/city";

export async function GET(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (ctx.role === "admin") {
    const allCities = await listAllCities();
    return NextResponse.json({ cities: allCities });
  }

  const cities = await getVipScopedCities(ctx.email);
  return NextResponse.json({ cities });
}
