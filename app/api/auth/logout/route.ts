import { NextResponse } from "next/server";
import { getProductAccess } from "@/lib/product/access";
import { signOutCurrentSession } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST() {
  await signOutCurrentSession();

  return NextResponse.json({
    session: null,
    access: getProductAccess(null),
    reportCount: 0
  });
}