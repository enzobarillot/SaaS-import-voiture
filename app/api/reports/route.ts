import { NextRequest, NextResponse } from "next/server";
import { detectPlatform, parseListingUrl } from "@/lib/parser";
import { runSimulation } from "@/lib/simulation";
import { getRequestSession } from "@/lib/server/auth";
import { listReportSummariesForUser, saveReportForUser } from "@/lib/server/reports";
import { SaveReportRequest } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  return NextResponse.json({ reports: await listReportSummariesForUser(session.user.id) });
}

export async function POST(request: NextRequest) {
  const session = await getRequestSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as SaveReportRequest;
    if (!payload.input) {
      return NextResponse.json({ error: "Vehicle input is required." }, { status: 400 });
    }

    const parseResult = payload.parseResult ?? (payload.input.listingUrl ? parseListingUrl(payload.input.listingUrl) : undefined);
    const platform = payload.platform ?? detectPlatform(payload.input.listingUrl ?? "");
    const simulation = runSimulation(payload.input, platform, parseResult);
    const document = await saveReportForUser(session.user.id, simulation);

    return NextResponse.json(document);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save report." }, { status: 400 });
  }
}