import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "@/lib/models/coupon";

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "coupon")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coupons = await listCoupons();
  return NextResponse.json({ coupons, success: true });
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "coupon")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { code, discountType, discountValue, minPurchase, maxDiscount, validTill, id } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (id) {
      // Update existing coupon
      const updated = await updateCoupon(id, {
        code,
        discountType,
        discountValue,
        minPurchase,
        maxDiscount,
        validTill,
      });
      if (!updated) {
        return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
      }
      return NextResponse.json({ coupon: updated, success: true });
    } else {
      // Create new coupon
      const coupon = await createCoupon({
        code,
        discountType,
        discountValue,
        minPurchase,
        maxDiscount,
        validTill,
      });
      return NextResponse.json({ coupon, success: true });
    }
  } catch (error) {
    console.error("Coupon creation/update error:", error);
    return NextResponse.json(
      { error: "Failed to create/update coupon" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "coupon")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, active } = body;

    if (!id || typeof active !== "boolean") {
      return NextResponse.json(
        { error: "Coupon id and active state are required." },
        { status: 400 }
      );
    }

    const updated = await updateCoupon(id, { active });
    if (!updated) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ coupon: updated, success: true });
  } catch (error) {
    console.error("Coupon toggle error:", error);
    return NextResponse.json(
      { error: "Failed to update coupon status" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "coupon")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const deleted = await deleteCoupon(id);
    if (!deleted) {
      return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Coupon deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete coupon" },
      { status: 500 }
    );
  }
}
