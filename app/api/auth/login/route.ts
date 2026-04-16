import { NextRequest, NextResponse } from "next/server";
import { getProductAccess } from "@/lib/product/access";
import { countReportsForUser } from "@/lib/server/reports";
import { loginUserWithPassword } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { email?: string; password?: string };
    if (!payload.email || !payload.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const session = await loginUserWithPassword(payload.email, payload.password);
    return NextResponse.json({
      session,
      access: getProductAccess(session),
      reportCount: await countReportsForUser(session.user.id)
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sign in." }, { status: 401 });
  }
}