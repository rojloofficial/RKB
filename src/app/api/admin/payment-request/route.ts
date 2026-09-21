import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import {
  listPaymentRequests,
  confirmPaymentRequest,
  declinePaymentRequest,
  deletePaymentRequests,
} from "@/lib/models/payment-request";
import { createPaymentHistory } from "@/lib/models/payment-history";
import { findUserById, findUserByEmail } from "@/lib/models/user";

export async function GET(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "payment-request")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await listPaymentRequests();
  return NextResponse.json(
    { requests, success: true },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "payment-request")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, id, reason, upiId, upiName, userName } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action === "confirm") {
      const updated = await confirmPaymentRequest(id);
      if (!updated) {
        return NextResponse.json(
          { error: "Payment request not found" },
          { status: 404 }
        );
      }

      // Create payment history record
      try {
        let finalUserName = userName;
        if (!finalUserName) {
          const user = (await findUserById(updated.userId)) || (await findUserByEmail(updated.userEmail));
          finalUserName = user?.name || "";
        }

        await createPaymentHistory({
          userEmail: updated.userEmail,
          userName: finalUserName,
          userId: updated.userId,
          transactionId: updated.transactionId,
          upiId: upiId || "manual",
          upiName: upiName,
          coins: updated.coins,
          amount: updated.amount,
          discount: updated.discount,
          finalAmount: Math.max(0, updated.amount - (updated.discount || 0)),
          couponCode: updated.couponCode,
          paymentRequestId: id,
        });
      } catch (err) {
        console.error("Failed to create payment history:", err);
        // Don't fail the entire operation if history creation fails
      }

      return NextResponse.json({ request: updated, success: true });
    } else if (action === "decline") {
      const declineReason = reason && String(reason).trim() ? String(reason).trim() : "Wrong Transaction ID";
      const updated = await declinePaymentRequest(id, declineReason);
      if (!updated) {
        return NextResponse.json(
          { error: "Payment request not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ request: updated, success: true });
    } else {
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Payment request action error:", error);
    return NextResponse.json(
      { error: "Failed to process payment request" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const ctx = await getAdminContext(req);

  if (!ctx || !canAccess(ctx, "payment-request")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { all, startDate, endDate, id } = body;

    const result = await deletePaymentRequests({
      all: Boolean(all),
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      id: id ? String(id) : undefined,
    });

    return NextResponse.json({
      success: true,
      count: result.deletedCount,
      message: `${result.deletedCount} payment request(s) deleted successfully.`,
    });
  } catch (error) {
    console.error("Payment request DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete payment requests" },
      { status: 500 }
    );
  }
}
