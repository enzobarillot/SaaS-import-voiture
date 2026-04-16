import { NextRequest, NextResponse } from "next/server";
import { getProductAccess } from "@/lib/product/access";
import { registerUserWithPassword } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string };
    if (!payload.email || !payload.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const session = await registerUserWithPassword(payload.email, payload.password);
    return NextResponse.json({
      session,
      access: getProductAccess(session),
      reportCount: 0
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create account." }, { status: 400 });
  }
}