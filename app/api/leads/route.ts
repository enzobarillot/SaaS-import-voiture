import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/server/leads";
import { getRequestSession } from "@/lib/server/auth";
import type { LeadCaptureRequest } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    const payload = (await request.json()) as LeadCaptureRequest;
    const lead = await createLead(payload, session?.user.id);

    return NextResponse.json({
      ok: true,
      lead: {
        id: lead.id,
        status: lead.status,
        createdAt: lead.createdAt
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to capture this request." },
      { status: 400 }
    );
  }
}