import { NextResponse } from "next/server";
import { getSessionEnvelope } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getSessionEnvelope());
}