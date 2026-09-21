import { NextRequest, NextResponse } from "next/server";
import { getVipContext } from "@/lib/vip-access";
import { getVipScopedAds } from "@/lib/models/vip";
import { listAllAds } from "@/lib/models/ad";

export async function GET(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (ctx.role === "admin") {
    const allAds = await listAllAds();
    return NextResponse.json({ ads: allAds });
  }

  const ads = await getVipScopedAds(ctx.email);
  return NextResponse.json({ ads });
}
