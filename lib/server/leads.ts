import { randomUUID } from "node:crypto";
import { mutateDatabase } from "@/lib/server/database";
import type { LeadCaptureRequest, LeadRecord } from "@/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanOptionalText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

export function validateLeadCapture(input: LeadCaptureRequest): LeadCaptureRequest {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("Enter a valid email address.");
  }

  const source = cleanOptionalText(input.source, 80) ?? "unknown";

  return {
    email,
    source,
    role: cleanOptionalText(input.role, 80),
    message: cleanOptionalText(input.message, 1000),
    intent: input.intent,
    pagePath: cleanOptionalText(input.pagePath, 200)
  };
}

export async function createLead(input: LeadCaptureRequest, userId?: string): Promise<LeadRecord> {
  const normalized = validateLeadCapture(input);

  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const existing = database.leads.find(
      (candidate) => candidate.email === normalized.email && candidate.source === normalized.source && candidate.status === "new"
    );

    if (existing) {
      existing.role = normalized.role ?? existing.role;
      existing.message = normalized.message ?? existing.message;
      existing.intent = normalized.intent ?? existing.intent;
      existing.pagePath = normalized.pagePath ?? existing.pagePath;
      existing.userId = userId ?? existing.userId;
      existing.createdAt = now;
      return existing;
    }

    const record: LeadRecord = {
      id: randomUUID(),
      ...normalized,
      status: "new",
      userId,
      createdAt: now
    };

    database.leads.push(record);
    return record;
  });
}