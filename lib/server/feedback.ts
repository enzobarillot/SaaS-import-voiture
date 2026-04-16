import { randomUUID } from "node:crypto";
import { mutateDatabase } from "@/lib/server/database";
import type { FeedbackRecord, FeedbackRequest, FeedbackSentiment } from "@/types";

const SENTIMENTS: FeedbackSentiment[] = ["positive", "neutral", "negative"];

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanOptionalText(value: unknown, maxLength: number): string | undefined {
  const cleaned = cleanText(value, maxLength);
  return cleaned ? cleaned : undefined;
}

export function validateFeedback(input: FeedbackRequest): FeedbackRequest {
  if (!SENTIMENTS.includes(input.sentiment)) {
    throw new Error("Choose a feedback sentiment.");
  }

  const message = cleanText(input.message, 1500);
  if (message.length < 3) {
    throw new Error("Add a short feedback message.");
  }

  const rating = typeof input.rating === "number" ? Math.max(1, Math.min(5, Math.round(input.rating))) : undefined;
  const screen = cleanText(input.context?.screen, 80) || "unknown";

  return {
    sentiment: input.sentiment,
    rating,
    message,
    wouldPay: Boolean(input.wouldPay),
    context: {
      screen,
      resultId: cleanOptionalText(input.context?.resultId, 80),
      reportId: cleanOptionalText(input.context?.reportId, 80),
      pagePath: cleanOptionalText(input.context?.pagePath, 200)
    }
  };
}

export async function createFeedback(input: FeedbackRequest, userId?: string): Promise<FeedbackRecord> {
  const normalized = validateFeedback(input);

  return mutateDatabase((database) => {
    const record: FeedbackRecord = {
      id: randomUUID(),
      ...normalized,
      userId,
      createdAt: new Date().toISOString()
    };

    database.feedback.push(record);
    return record;
  });
}