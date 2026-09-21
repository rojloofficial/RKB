import { NextRequest, NextResponse } from "next/server";
import {
  validateLocationsJson,
  importLocationsJson,
} from "@/lib/models/localArea";
import { getAdminContext, canAccess } from "@/lib/admin-access";

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || (!canAccess(ctx, "state") && !canAccess(ctx, "city"))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Request body cannot be empty." },
      { status: 400 }
    );
  }

  const { action, payload } = body as { action?: string; payload?: unknown };

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      { error: "Invalid JSON payload. Must be a valid JSON object." },
      { status: 400 }
    );
  }

  if (action === "validate") {
    const result = await validateLocationsJson(payload);
    if (!result.valid) {
      return NextResponse.json({ valid: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({ valid: true, summary: result.summary });
  }

  if (action === "confirm") {
    try {
      const result = await importLocationsJson(payload);
      return NextResponse.json({
        success: true,
        summary: result.summary,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import JSON data.";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
  }

  return NextResponse.json(
    { error: "Invalid action. Expected 'validate' or 'confirm'." },
    { status: 400 }
  );
}
