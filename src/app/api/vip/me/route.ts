import { NextRequest, NextResponse } from "next/server";
import { getVipContext } from "@/lib/vip-access";
import { listStates } from "@/lib/models/state";
import { listAllCities } from "@/lib/models/city";

export async function GET(request: NextRequest) {
  const ctx = await getVipContext(request);
  if (!ctx.authenticated) {
    return NextResponse.json({ authenticated: false });
  }

  if (ctx.role === "admin") {
    const [allStates, allCities] = await Promise.all([listStates(), listAllCities()]);
    return NextResponse.json({
      authenticated: true,
      role: "admin",
      email: ctx.email,
      hasStateAccess: true,
      states: allStates.map((s) => s.name),
      cities: allCities.map((c) => c.name),
      assignments: [],
    });
  }

  return NextResponse.json({
    authenticated: true,
    role: "vip",
    email: ctx.email,
    hasStateAccess: ctx.scope.hasStateAccess,
    states: ctx.scope.states,
    cities: ctx.scope.cities,
    assignments: ctx.scope.assignments,
  });
}
