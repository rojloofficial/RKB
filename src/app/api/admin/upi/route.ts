import { NextRequest, NextResponse } from "next/server";
import {
  listUPIs,
  createUPI,
  deleteUPI,
  updateUPI,
  setUPIActive,
  getNextUPIForPayment,
} from "@/lib/models/upi";
import { getAdminContext, canAccess } from "@/lib/admin-access";
import { uploadImageToCloudinary } from "@/lib/cloudinary";

export async function GET(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "upi")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    if (request.nextUrl.searchParams.get("mode") === "payment") {
      const upi = await getNextUPIForPayment();
      return NextResponse.json({
        upi,
        upis: upi ? [upi] : [],
        success: true,
      });
    }

    const upis = await listUPIs();
    const defaultUpi = {
      _id: "default-upi",
      upiId: "surajkumar40407@ybl",
      name: "suraj",
      qrCode: "/surajkumar40407@ybl.jpeg",
      active: true,
      createdAt: new Date().toISOString(),
    };

    const hasDefaultUpi = upis.some(
      (upi) => upi.upiId.toLowerCase() === defaultUpi.upiId.toLowerCase()
    );

    return NextResponse.json({
      upis: hasDefaultUpi ? upis : [defaultUpi, ...upis],
      success: true,
    });
  } catch (error) {
    console.error("Failed to list UPIs:", error);
    return NextResponse.json(
      { error: "Failed to list UPIs." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "upi")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const upiId = formData.get("upiId") as string;
    const name = formData.get("name") as string;
    const qrCodeFile = formData.get("qrCode") as File | null;
    const id = formData.get("id") as string | null; // For update

    if (!upiId || !name) {
      return NextResponse.json(
        { error: "UPI ID and name are required." },
        { status: 400 }
      );
    }

    const activeFlag = formData.get("active");
    const active = activeFlag === null ? true : String(activeFlag) === "true";

    let qrCodeUrl = "";

    // Handle QR code image upload
    if (qrCodeFile && qrCodeFile.size > 0) {
      try {
        const buffer = await qrCodeFile.arrayBuffer();
        const uploadUrl = await uploadImageToCloudinary(
          Buffer.from(buffer),
          `rojlo-upi-${Date.now()}`
        );
        qrCodeUrl = uploadUrl || "";
      } catch (err) {
        console.error("Failed to upload QR code:", err);
        return NextResponse.json(
          { error: "Failed to upload QR code image." },
          { status: 500 }
        );
      }
    }

    let upi;
    if (id) {
      // Update existing UPI
      upi = await updateUPI(id, {
        upiId: String(upiId),
        name: String(name),
        qrCode: qrCodeUrl || undefined,
        active,
      });
    } else {
      // Create new UPI
      upi = await createUPI({
        upiId: String(upiId),
        name: String(name),
        qrCode: qrCodeUrl,
        active,
      });
    }

    return NextResponse.json({ success: true, upi }, { status: 201 });
  } catch (error) {
    console.error("createUPI/updateUPI failed:", error);
    return NextResponse.json(
      { error: "Failed to save UPI." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "upi")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;
    const active = typeof body?.active === "boolean" ? body.active : null;

    if (!id || active === null) {
      return NextResponse.json(
        { error: "UPI id and active status are required." },
        { status: 400 }
      );
    }

    const upi = await setUPIActive(String(id), Boolean(active));
    if (!upi) {
      return NextResponse.json({ error: "UPI not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, upi });
  } catch (error) {
    console.error("toggleUPI failed:", error);
    return NextResponse.json(
      { error: "Failed to update UPI status." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAdminContext(request);
  if (!ctx || !canAccess(ctx, "upi")) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const id = body?.id;

    if (!id) {
      return NextResponse.json(
        { error: "UPI id is required." },
        { status: 400 }
      );
    }

    const ok = await deleteUPI(String(id));
    if (!ok) {
      return NextResponse.json({ error: "UPI not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("deleteUPI failed:", error);
    return NextResponse.json(
      { error: "Failed to delete UPI." },
      { status: 500 }
    );
  }
}
