import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-access";
import { findUserById, findUserBySessionToken } from "@/lib/models/user";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { checkRateLimitAsync, clientIp } from "@/lib/rate-limit";

function isValidImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return true;
  }
  return false;
}

async function isAuthorizedUploader(request: NextRequest): Promise<boolean> {
  const admin = await getAdminContext(request);
  if (admin) return true;

  const raw = request.cookies.get("rojlo_auth")?.value;
  if (!raw) return false;

  if (await findUserBySessionToken(raw)) return true;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed && parsed._id) {
      return Boolean(await findUserById(String(parsed._id)));
    }
  } catch {
    if (await findUserById(raw)) return true;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const rate = await checkRateLimitAsync(`upload:${ip}`, 20, 5 * 60 * 1000);
    if (!rate.ok) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    if (!(await isAuthorizedUploader(request))) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "An image file is required." },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed." },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image must be 8 MB or smaller." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!isValidImageMagicBytes(buffer)) {
      return NextResponse.json(
        { error: "Invalid image file format." },
        { status: 400 }
      );
    }

    const url = await uploadImageToCloudinary(buffer);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image." },
      { status: 500 }
    );
  }
}

