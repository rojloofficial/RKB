import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, normalizeEmail } from "@/lib/models/user";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body ?? {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ exists: false });
    }

    const user = await findUserByEmail(normalizedEmail);
    const exists = Boolean(
      user &&
      user.passwordHash &&
      user.passwordHash.trim().length > 0
    );

    return NextResponse.json({
      exists,
      message: exists ? "Use other email, this email already have account." : "",
    });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
