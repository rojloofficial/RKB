import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  listNotFoundLogs,
  toggleNotFoundResolved,
  deleteNotFoundLog,
  clearNotFoundLogs,
} from "@/lib/models/not-found-log";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "not-found")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const statusFilter = searchParams.get("status");

  let resolved: boolean | undefined = undefined;
  if (statusFilter === "unresolved") resolved = false;
  else if (statusFilter === "resolved") resolved = true;

  const logs = await listNotFoundLogs({ resolved, search, limit: 300 });
  const allLogs = await listNotFoundLogs({ limit: 1000 });

  const totalHits = allLogs.reduce((sum, l) => sum + Number(l.hits || 1), 0);
  const unresolvedCount = allLogs.filter((l) => !l.resolved).length;
  const resolvedCount = allLogs.filter((l) => l.resolved).length;

  return NextResponse.json({
    logs,
    totalCount: allLogs.length,
    totalHits,
    unresolvedCount,
    resolvedCount,
  });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "not-found")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { id, resolved } = body ?? {};
  if (!id || typeof resolved !== "boolean") {
    return NextResponse.json({ error: "ID and resolved status required." }, { status: 400 });
  }

  const ok = await toggleNotFoundResolved(String(id), resolved);
  if (!ok) {
    return NextResponse.json({ error: "Log entry not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "not-found")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const { id, all } = body ?? {};

  if (all) {
    await clearNotFoundLogs();
    return NextResponse.json({ success: true, message: "All 404 logs cleared." });
  }

  if (!id) {
    return NextResponse.json({ error: "ID is required." }, { status: 400 });
  }

  const ok = await deleteNotFoundLog(String(id));
  if (!ok) {
    return NextResponse.json({ error: "Log entry not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Log entry deleted." });
}