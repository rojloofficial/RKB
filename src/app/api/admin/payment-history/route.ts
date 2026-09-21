import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { listPaymentHistory, deletePaymentHistory } from "@/lib/models/payment-history";

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "payment-history")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const history = await listPaymentHistory();
    return NextResponse.json({ history, success: true });
  } catch (error) {
    console.error("Failed to fetch payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "payment-history")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { all, startDate, endDate, id } = body;

    const result = await deletePaymentHistory({
      all: Boolean(all),
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      id: id ? String(id) : undefined,
    });

    return NextResponse.json({
      success: true,
      count: result.deletedCount,
      message: `${result.deletedCount} payment history record(s) deleted successfully.`,
    });
  } catch (error) {
    console.error("Payment history DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete payment history" },
      { status: 500 }
    );
  }
}

