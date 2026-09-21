import { NextResponse } from "next/server";
import { listStates } from "@/lib/models/state";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const states = await listStates();
    return NextResponse.json(
      { states },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("[states] GET error:", error);
    return NextResponse.json(
      { error: "Unable to load states." },
      { status: 500 }
    );
  }
}
