import type { AnalyticsContext, AnalyticsEventName, AnalyticsPayload } from "@/lib/analytics/events";

const ANONYMOUS_ID_KEY = "importscore_anonymous_id";

export interface AnalyticsProvider {
  track<TName extends AnalyticsEventName>(
    name: TName,
    payload: AnalyticsPayload<TName>,
    context?: AnalyticsContext
  ): Promise<void>;
}

function getAnonymousId(): string | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing) return existing;

    const generated = globalThis.crypto?.randomUUID?.() ?? `anon-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(ANONYMOUS_ID_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

class ApiAnalyticsProvider implements AnalyticsProvider {
  async track<TName extends AnalyticsEventName>(
    name: TName,
    payload: AnalyticsPayload<TName>,
    context: AnalyticsContext = {}
  ): Promise<void> {
    if (typeof window === "undefined") return;

    const body = {
      name,
      payload,
      context: {
        anonymousId: getAnonymousId(),
        path: window.location.pathname,
        referrer: document.referrer || undefined,
        ...context
      }
    };

    await fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify(body)
    });
  }
}

let analyticsProvider: AnalyticsProvider = new ApiAnalyticsProvider();

export function setAnalyticsProvider(provider: AnalyticsProvider): void {
  analyticsProvider = provider;
}

export async function trackEvent<TName extends AnalyticsEventName>(
  name: TName,
  payload: AnalyticsPayload<TName>,
  context: AnalyticsContext = {}
): Promise<void> {
  try {
    await analyticsProvider.track(name, payload, context);
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.debug("ImportScore analytics event not sent", name);
    }
  }
}