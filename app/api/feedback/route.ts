import { NextRequest, NextResponse } from "next/server";
import { createFeedback } from "@/lib/server/feedback";
import { getRequestSession } from "@/lib/server/auth";
import type { FeedbackRequest } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getRequestSession();
    const payload = (await request.json()) as FeedbackRequest;
    const feedback = await createFeedback(payload, session?.user.id);

    return NextResponse.json({
      ok: true,
      feedback: {
        id: feedback.id,
        createdAt: feedback.createdAt
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save feedback." },
      { status: 400 }
    );
  }
}