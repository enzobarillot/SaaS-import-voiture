import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { serializeReport } from "@/lib/report";
import { recordAnalyticsEvent } from "@/lib/server/analytics";
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

  await recordAnalyticsEvent({
    name: ANALYTICS_EVENTS.exportActionUsed,
    payload: { reportId, source: "report_route" },
    context: { userId: session.user.id },
    userAgent: _request.headers.get("user-agent") ?? undefined
  });

  return new NextResponse(serializeReport(document), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="importscore-report-${reportId}.json"`
    }
  });
}