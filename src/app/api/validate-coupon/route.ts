import { NextRequest, NextResponse } from "next/server";
import { calculateDiscount } from "@/lib/models/coupon";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, amount } = body;

    if (!code || !amount) {
      return NextResponse.json(
        { error: "Missing code or amount" },
        { status: 400 }
      );
    }

    const result = await calculateDiscount(code, amount);
    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired coupon code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      discount: result.discount,
      finalAmount: result.finalAmount,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
