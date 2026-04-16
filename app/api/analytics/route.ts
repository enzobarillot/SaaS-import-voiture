import { NextRequest, NextResponse } from "next/server";
import { isAnalyticsEventName } from "@/lib/analytics/events";
import { recordAnalyticsEvent } from "@/lib/server/analytics";
import { getRequestSession } from "@/lib/server/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      payload?: Record<string, unknown>;
      context?: {
        anonymousId?: string;
        path?: string;
        referrer?: string;
      };
    };

    if (!payload.name || !isAnalyticsEventName(payload.name)) {
      return NextResponse.json({ error: "Unknown analytics event." }, { status: 400 });
    }

    const session = await getRequestSession();
    const event = await recordAnalyticsEvent({
      name: payload.name,
      payload: payload.payload ?? {},
      context: {
        ...payload.context,
        userId: session?.user.id
      },
      userAgent: request.headers.get("user-agent") ?? undefined
    });

    return NextResponse.json({ ok: true, id: event.id });
  } catch {
    return NextResponse.json({ error: "Unable to record analytics event." }, { status: 400 });
  }
}