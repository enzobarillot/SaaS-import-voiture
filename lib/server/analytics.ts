import { randomUUID } from "node:crypto";
import type { AnalyticsContext, AnalyticsEventName } from "@/lib/analytics/events";
import { mutateDatabase, type StoredAnalyticsEventRecord } from "@/lib/server/database";

const ANALYTICS_EVENT_LIMIT = 1200;

export interface RecordAnalyticsEventInput {
  name: AnalyticsEventName;
  payload: Record<string, unknown>;
  context?: AnalyticsContext;
  userAgent?: string;
}

export async function recordAnalyticsEvent(input: RecordAnalyticsEventInput): Promise<StoredAnalyticsEventRecord> {
  return mutateDatabase((database) => {
    const event: StoredAnalyticsEventRecord = {
      id: randomUUID(),
      name: input.name,
      payload: input.payload,
      anonymousId: input.context?.anonymousId,
      userId: input.context?.userId,
      path: input.context?.path,
      referrer: input.context?.referrer,
      userAgent: input.userAgent,
      createdAt: new Date().toISOString()
    };

    database.analyticsEvents.push(event);
    if (database.analyticsEvents.length > ANALYTICS_EVENT_LIMIT) {
      database.analyticsEvents = database.analyticsEvents.slice(database.analyticsEvents.length - ANALYTICS_EVENT_LIMIT);
    }

    return event;
  });
}