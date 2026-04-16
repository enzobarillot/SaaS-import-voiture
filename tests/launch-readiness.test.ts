import assert from "node:assert/strict";
import test from "node:test";
import { isAnalyticsEventName, ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { validateFeedback } from "@/lib/server/feedback";
import { validateLeadCapture } from "@/lib/server/leads";

test("lead capture validation normalizes beta requests", () => {
  const lead = validateLeadCapture({
    email: " Buyer@Example.COM ",
    role: " Dealer ",
    source: "landing_beta_access",
    intent: "premium_interest",
    message: "Need pro comparisons."
  });

  assert.equal(lead.email, "buyer@example.com");
  assert.equal(lead.role, "Dealer");
  assert.equal(lead.source, "landing_beta_access");
});

test("feedback validation clamps rating and requires a useful message", () => {
  const feedback = validateFeedback({
    sentiment: "positive",
    rating: 9,
    message: "The assumptions were clear.",
    wouldPay: true,
    context: { screen: "result_panel", resultId: "result-1" }
  });

  assert.equal(feedback.rating, 5);
  assert.equal(feedback.context.screen, "result_panel");
  assert.equal(feedback.wouldPay, true);
});

test("analytics event catalogue exposes required funnel events", () => {
  assert.equal(isAnalyticsEventName(ANALYTICS_EVENTS.landingCtaClicked), true);
  assert.equal(isAnalyticsEventName(ANALYTICS_EVENTS.feedbackSubmitted), true);
  assert.equal(isAnalyticsEventName("unknown_event"), false);
});