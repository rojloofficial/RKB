import { NextRequest, NextResponse } from "next/server";
import { getVipContext } from "@/lib/vip-access";
import { getVipScopedStates } from "@/lib/models/vip";
import { listStates } from "@/lib/models/state";

export async function GET(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (ctx.role === "admin") {
    const allStates = await listStates();
    return NextResponse.json({ states: allStates });
  }

  const states = await getVipScopedStates(ctx.email);
  return NextResponse.json({ states });
}
