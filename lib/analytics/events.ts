import type { DealVerdict, ParserStatus, ProductAccessLevel, RiskLevel } from "@/types";

export const ANALYTICS_EVENTS = {
  landingCtaClicked: "landing_cta_clicked",
  sampleScenarioUsed: "sample_scenario_used",
  urlParseAttempted: "url_parse_attempted",
  urlParseSucceeded: "url_parse_success",
  urlParsePartial: "url_parse_partial",
  urlParseFailed: "url_parse_failure",
  simulationCompleted: "simulation_completed",
  resultViewed: "result_viewed",
  reportSaved: "report_saved",
  accountSignup: "account_signup",
  login: "login",
  shareLinkCreated: "share_link_created",
  printableReportViewed: "printable_report_viewed",
  exportActionUsed: "export_action_used",
  premiumUpsellViewed: "premium_upsell_viewed",
  premiumCtaClicked: "premium_cta_clicked",
  feedbackSubmitted: "feedback_submitted",
  leadSubmitted: "lead_submitted"
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export interface AnalyticsPayloadMap {
  [ANALYTICS_EVENTS.landingCtaClicked]: { cta: string; location: string; destination?: string };
  [ANALYTICS_EVENTS.sampleScenarioUsed]: { scenarioId: string; scenarioLabel: string; source: string };
  [ANALYTICS_EVENTS.urlParseAttempted]: { platform: string; urlHost?: string };
  [ANALYTICS_EVENTS.urlParseSucceeded]: { platform: string; extractedFields: number; missingFields: number; source: string };
  [ANALYTICS_EVENTS.urlParsePartial]: { platform: string; extractedFields: number; missingFields: number; source: string };
  [ANALYTICS_EVENTS.urlParseFailed]: { platform: string; status?: ParserStatus; reason?: string };
  [ANALYTICS_EVENTS.simulationCompleted]: { resultId: string; verdict: DealVerdict; riskLevel: RiskLevel; planLevel: ProductAccessLevel; providerLabel: string };
  [ANALYTICS_EVENTS.resultViewed]: { resultId: string; verdict: DealVerdict; riskLevel: RiskLevel; providerLabel: string };
  [ANALYTICS_EVENTS.reportSaved]: { reportId: string; verdict: DealVerdict; planLevel: ProductAccessLevel };
  [ANALYTICS_EVENTS.accountSignup]: { planLevel: ProductAccessLevel; reportCount: number };
  [ANALYTICS_EVENTS.login]: { planLevel: ProductAccessLevel; reportCount: number };
  [ANALYTICS_EVENTS.shareLinkCreated]: { reportId: string; shareId?: string };
  [ANALYTICS_EVENTS.printableReportViewed]: { reportId: string; shared: boolean; verdict?: DealVerdict };
  [ANALYTICS_EVENTS.exportActionUsed]: { reportId: string; source: "result_panel" | "report_route" };
  [ANALYTICS_EVENTS.premiumUpsellViewed]: { location: string; planLevel?: ProductAccessLevel };
  [ANALYTICS_EVENTS.premiumCtaClicked]: { location: string; cta: string; intent?: string };
  [ANALYTICS_EVENTS.feedbackSubmitted]: { screen: string; sentiment: string; rating?: number; wouldPay?: boolean };
  [ANALYTICS_EVENTS.leadSubmitted]: { source: string; intent?: string; role?: string };
}

export type AnalyticsPayload<TName extends AnalyticsEventName> = AnalyticsPayloadMap[TName];

export type AnalyticsCapture = {
  [TName in AnalyticsEventName]: {
    name: TName;
    payload: AnalyticsPayload<TName>;
  };
}[AnalyticsEventName];

export interface AnalyticsContext {
  anonymousId?: string;
  userId?: string;
  path?: string;
  referrer?: string;
}

export const ANALYTICS_EVENT_NAMES = Object.values(ANALYTICS_EVENTS) as AnalyticsEventName[];

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}