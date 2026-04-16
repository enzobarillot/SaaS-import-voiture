import { NextRequest, NextResponse } from "next/server";
import { ingestListingUrl } from "@/lib/parser";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { url?: string };
    if (!payload.url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const result = await ingestListingUrl(payload.url);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to parse listing request." }, { status: 500 });
  }
}

