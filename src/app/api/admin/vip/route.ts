import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  listVipAssignments,
  createVipAssignment,
  updateVipAssignment,
  deleteVipAssignment,
  syncVipStatus,
  extendVipAssignment,
  upsertVipUserWithPhone,
} from "@/lib/models/vip";
import { sendVipInviteEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await syncVipStatus();
  const assignments = await listVipAssignments();
  return NextResponse.json({ assignments, success: true });
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phone = String(body?.phone ?? "").trim();
    const type = (body?.type === "state" ? "state" : "city") as "state" | "city";
    const expiresInDays = Number(body?.expiresInDays ?? 7);

    if (!email) {
      return NextResponse.json(
        { error: "VIP owner email is required." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "VIP owner phone number (used as password) is required." },
        { status: 400 }
      );
    }

    const created: Array<{
      _id?: string;
      type: "city" | "state";
      stateName?: string;
      cityName?: string;
      email: string;
      phone?: string;
      expiresAt: Date;
    }> = [];

    let areaLabel = "";

    if (type === "state") {
      const stateName = String(body?.stateName ?? "").trim();
      if (!stateName) {
        return NextResponse.json(
          { error: "State name is required for state VIP assignment." },
          { status: 400 }
        );
      }

      areaLabel = `State: ${stateName}`;

      const assignment = await createVipAssignment({
        type: "state",
        stateName,
        email,
        phone,
        assignedBy: ctx.role === "main" ? "main-admin" : ctx.email,
        expiresInDays: Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7,
      });

      created.push({
        _id: assignment._id,
        type: "state",
        stateName: assignment.stateName,
        email: assignment.email,
        phone: assignment.phone,
        expiresAt: new Date(assignment.expiresAt),
      });
    } else {
      const rawCities = Array.isArray(body?.cities)
        ? body.cities
        : typeof body?.cities === "string"
          ? body.cities.split(",")
          : [body?.cityName];

      const cityEntries = rawCities
        .map((entry: unknown) => String(entry ?? "").trim())
        .filter(Boolean);

      if (cityEntries.length === 0) {
        return NextResponse.json(
          { error: "At least one city name is required." },
          { status: 400 }
        );
      }

      areaLabel = `Cities: ${cityEntries.join(", ")}`;

      for (const cityNameValue of [...new Set(cityEntries)]) {
        const cityName = String(cityNameValue).trim();
        const citySlug = typeof body?.citySlug === "string" && body.citySlug.trim()
          ? String(body.citySlug).trim()
          : cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

        const assignment = await createVipAssignment({
          type: "city",
          cityName,
          citySlug,
          email,
          phone,
          assignedBy: ctx.role === "main" ? "main-admin" : ctx.email,
          expiresInDays: Number.isFinite(expiresInDays) && expiresInDays > 0 ? expiresInDays : 7,
        });

        created.push({
          _id: assignment._id,
          type: "city",
          cityName: assignment.cityName,
          email: assignment.email,
          phone: assignment.phone,
          expiresAt: new Date(assignment.expiresAt),
        });
      }
    }

    // Upsert VIP user record with phone number as their password
    await upsertVipUserWithPhone(email, phone);

    const envVipUrl = (process.env.VIP_LOGIN_URL || process.env.NEXT_PUBLIC_VIP_URL || "").trim().replace(/^['"]|['"]$/g, "");
    const loginUrl = envVipUrl || "https://rojloo.vercel.app/vip/login";
    const latestExpiry = created[0]?.expiresAt || new Date();

    // Send notification email containing VIP login credentials
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const emailResult = await sendVipInviteEmail({
        to: email,
        areaLabel,
        phone,
        loginUrl,
        expiresAt: latestExpiry,
      });
      emailSent = emailResult.sent;
      if (!emailResult.sent && "error" in emailResult) {
        emailError = emailResult.error || emailResult.reason;
      }
    } catch (err) {
      console.error("[admin/vip] Failed to send VIP email:", err);
      emailSent = false;
      emailError = err instanceof Error ? err.message : "Failed to send notification email.";
    }

    return NextResponse.json(
      {
        success: true,
        assignments: created,
        loginUrl,
        emailSent,
        emailError,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("createVipAssignment failed:", error);
    return NextResponse.json(
      { error: "Failed to assign VIP control." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    const extendDays = Number(body?.extendDays ?? 0);
    const active = typeof body?.active === "boolean" ? body.active : null;
    const status = body?.status;

    if (!id) {
      return NextResponse.json({ error: "VIP id is required." }, { status: 400 });
    }

    if (Number.isFinite(extendDays) && extendDays !== 0) {
      const updated = await extendVipAssignment(String(id), extendDays);
      if (!updated) {
        return NextResponse.json({ error: "VIP assignment not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, assignment: updated });
    }

    if (status && (status === "active" || status === "inactive" || status === "expired")) {
      const nextStatus = status === "expired" ? "inactive" : status;
      const updated = await updateVipAssignment(String(id), { status: nextStatus });
      if (!updated) {
        return NextResponse.json({ error: "VIP assignment not found." }, { status: 404 });
      }
      return NextResponse.json({ success: true, assignment: updated });
    }

    if (active === null) {
      return NextResponse.json({ error: "VIP status update is required." }, { status: 400 });
    }

    const updated = await updateVipAssignment(String(id), { status: active ? "active" : "inactive" });
    if (!updated) {
      return NextResponse.json({ error: "VIP assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, assignment: updated });
  } catch (error) {
    console.error("updateVipAssignment failed:", error);
    return NextResponse.json({ error: "Failed to update VIP assignment." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "vip")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;

    if (!id) {
      return NextResponse.json({ error: "VIP id is required." }, { status: 400 });
    }

    const ok = await deleteVipAssignment(String(id));
    if (!ok) {
      return NextResponse.json({ error: "VIP assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("deleteVipAssignment failed:", error);
    return NextResponse.json({ error: "Failed to delete VIP assignment." }, { status: 500 });
  }
}
