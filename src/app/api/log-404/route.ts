import { NextRequest, NextResponse } from "next/server";
import { recordNotFound } from "@/lib/models/not-found-log";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`log-404:${ip}`, 30, 60 * 1000);
    if (!rate.ok) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    const rawUrl = typeof body?.url === "string" ? body.url : "";
    const referrer = typeof body?.referrer === "string" ? body.referrer : undefined;
    const userAgent = request.headers.get("user-agent") ?? undefined;

    if (!rawUrl || rawUrl.length > 2000) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    await recordNotFound(rawUrl, referrer, userAgent, ip);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/log-404] Error recording 404:", err);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }
}