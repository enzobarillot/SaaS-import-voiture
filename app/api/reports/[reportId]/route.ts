import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/server/auth";
import { getReportForUser } from "@/lib/server/reports";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { reportId } = await context.params;
  const document = await getReportForUser(session.user.id, reportId);
  if (!document) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  return NextResponse.json(document);
}