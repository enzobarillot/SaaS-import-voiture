import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/server/auth";
import { importReportsForUser } from "@/lib/server/reports";
import { SimulationResult } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { reports?: SimulationResult[] };
    const reports = Array.isArray(payload.reports) ? payload.reports : [];
    const result = await importReportsForUser(session.user.id, reports);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import local history." }, { status: 400 });
  }
}