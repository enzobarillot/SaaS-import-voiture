"use client";

import { useEffect, useState } from "react";
import { AccountPanel } from "@/components/account-panel";
import { CloudHistoryPanel } from "@/components/cloud-history-panel";
import { HistoryPanel } from "@/components/history-panel";
import { LandingSections } from "@/components/landing-sections";
import { FeedbackWidget } from "@/components/feedback-widget";
import { Field, Input, Select, type FieldState } from "@/components/form-primitives";
import { ResultPanel } from "@/components/result-panel";
import { TopNav } from "@/components/top-nav";
import {
  COUNTRY_OPTIONS,
  DEMO_VEHICLE_INPUT,
  EMPTY_VEHICLE_INPUT,
  FIELD_LABELS,
  FREE_SIMULATION_LIMIT,
  FUEL_OPTIONS,
  LEGAL_REFERENCE_LABEL,
  SELLER_TYPE_OPTIONS,
  SAMPLE_SCENARIOS,
  TRANSMISSION_OPTIONS,
  VAT_STATUS_OPTIONS,
  type SampleScenario
} from "@/lib/reference-data";
import { detectPlatform, getParserStatusMessage, parseListingUrl } from "@/lib/parser";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { getProductAccess } from "@/lib/product/access";
import { clearHistory, loadHistory, pushHistory } from "@/lib/storage/history";
import { runSimulation } from "@/lib/simulation";
import { consumeSimulationCredit, getUsageState } from "@/lib/usage";
import type {
  InputMode,
  ParserStatus,
  ReportDocument,
  SavedReportSummary,
  SessionEnvelope,
  SimulationResult,
  UrlParseResult,
  UsageState,
  VehicleFieldKey,
  VehicleInput
} from "@/types";

function valueExists(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return value > 0;
  return true;
}

function emptyToUndefined(value: number | undefined): number | undefined {
  return value && value > 0 ? value : undefined;
}

function validateInput(input: VehicleInput): VehicleFieldKey[] {
  return ["purchasePrice", "brand", "model", "year", "firstRegistrationDate", "mileage", "horsepower"].filter(
    (field) => !valueExists(input[field as VehicleFieldKey])
  ) as VehicleFieldKey[];
}

function mergeInput(current: VehicleInput, patch: Partial<VehicleInput>): VehicleInput {
  const next: VehicleInput = { ...current };
  const target = next as unknown as Record<string, unknown>;
  for (const [key, rawValue] of Object.entries(patch) as Array<[VehicleFieldKey, VehicleInput[VehicleFieldKey]]>) {
    if (valueExists(rawValue)) target[key] = rawValue;
  }
  if (patch.countryOfOrigin) next.countryOfOrigin = patch.countryOfOrigin;
  return next;
}

function normalizeInput(current: VehicleInput, listingUrl: string): VehicleInput {
  return {
    ...current,
    fiscalPower: emptyToUndefined(current.fiscalPower),
    co2Emissions: emptyToUndefined(current.co2Emissions),
    curbWeightKg: emptyToUndefined(current.curbWeightKg),
    transportCost: emptyToUndefined(current.transportCost),
    exportPlatesCost: emptyToUndefined(current.exportPlatesCost),
    cocCost: emptyToUndefined(current.cocCost),
    inspectionCost: emptyToUndefined(current.inspectionCost),
    brokerFees: emptyToUndefined(current.brokerFees),
    frenchMarketEstimate: emptyToUndefined(current.frenchMarketEstimate),
    listingUrl: listingUrl.trim()
  };
}

function parserClasses(status: ParserStatus) {
  if (status === "success") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-rose-200 bg-rose-50 text-rose-900";
}

function getUrlHost(value: string): string | undefined {
  try {
    return new URL(value).host.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function defaultSessionEnvelope(): SessionEnvelope {
  return {
    session: null,
    access: getProductAccess(null),
    reportCount: 0
  };
}

export function ImportMvp() {
  const [mode, setMode] = useState<InputMode>("url");
  const [input, setInput] = useState<VehicleInput>(EMPTY_VEHICLE_INPUT);
  const [listingUrl, setListingUrl] = useState("");
  const [status, setStatus] = useState("Paste a listing URL, choose a sample vehicle, or complete the core fields to get a France import decision.");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [parserResult, setParserResult] = useState<UrlParseResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<VehicleFieldKey[]>([]);
  const [usage, setUsage] = useState<UsageState>(() => getUsageState());
  const [isParsing, setIsParsing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionEnvelope, setSessionEnvelope] = useState<SessionEnvelope>(defaultSessionEnvelope);
  const [cloudReports, setCloudReports] = useState<SavedReportSummary[]>([]);
  const [savedReport, setSavedReport] = useState<ReportDocument | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>();
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMessage, setCloudMessage] = useState<string>();
  const [importBusy, setImportBusy] = useState(false);

  useEffect(() => {
    setHistory(loadHistory());
    setUsage(getUsageState());
    void loadAccountState();
    void trackEvent(ANALYTICS_EVENTS.premiumUpsellViewed, {
      location: "landing_pricing",
      planLevel: "anonymous"
    });
  }, []);

  useEffect(() => {
    if (!result) return;

    void trackEvent(ANALYTICS_EVENTS.resultViewed, {
      resultId: result.id,
      verdict: result.verdict,
      riskLevel: result.risk.level,
      providerLabel: result.market.providerLabel
    });
  }, [result?.id]);

  async function loadAccountState(): Promise<void> {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) {
        setSessionEnvelope(defaultSessionEnvelope());
        setCloudReports([]);
        return;
      }

      const envelope = (await response.json()) as SessionEnvelope;
      setSessionEnvelope(envelope);
      if (envelope.session) {
        await loadCloudReports();
      } else {
        setCloudReports([]);
        setSavedReport(null);
      }
    } catch {
      setSessionEnvelope(defaultSessionEnvelope());
      setCloudReports([]);
    }
  }

  async function loadCloudReports(): Promise<void> {
    try {
      const response = await fetch("/api/reports", { cache: "no-store" });
      if (!response.ok) {
        setCloudReports([]);
        return;
      }

      const payload = (await response.json()) as { reports: SavedReportSummary[] };
      setCloudReports(payload.reports);
      setSessionEnvelope((current) => ({ ...current, reportCount: payload.reports.length }));
    } catch {
      setCloudReports([]);
    }
  }

  const scrollToTry = () => {
    document.getElementById("simulator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLandingCta = (cta: string, location: string, destination?: string) => {
    void trackEvent(ANALYTICS_EVENTS.landingCtaClicked, { cta, location, destination });
  };

  const handleStartUrl = () => {
    setMode("url");
    scrollToTry();
  };

  const handleLandingUrlSubmit = (url: string) => {
    setMode("url");
    setListingUrl(url.trim());
    scrollToTry();
  };

  const handleStartManual = () => {
    setMode("manual");
    scrollToTry();
  };

  const handlePlanCta = (planId: "anonymous" | "account_free" | "premium", intent?: string) => {
    const destination = planId === "premium" ? "#premium-request" : "#try";
    handleLandingCta(`pricing_${planId}`, "pricing", destination);

    if (planId === "premium") {
      void trackEvent(ANALYTICS_EVENTS.premiumCtaClicked, {
        location: "pricing",
        cta: "request_pro_plan",
        intent
      });
      document.getElementById("premium-request")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (planId === "account_free") {
      setAuthMode("signup");
    }

    handleStartUrl();
  };

  const trackParseOutcome = (parsed: UrlParseResult) => {
    const payload = {
      platform: parsed.platform,
      extractedFields: parsed.extractedFields.length,
      missingFields: parsed.missingFields.length,
      source: parsed.source
    };

    if (parsed.status === "success") {
      void trackEvent(ANALYTICS_EVENTS.urlParseSucceeded, payload);
      return;
    }

    if (parsed.status === "partial") {
      void trackEvent(ANALYTICS_EVENTS.urlParsePartial, payload);
      return;
    }

    void trackEvent(ANALYTICS_EVENTS.urlParseFailed, {
      platform: parsed.platform,
      status: parsed.status,
      reason: parsed.summary
    });
  };
  const parserMissing = parserResult?.missingFields ?? [];
  const parserRecommended = parserResult?.recommendedFields ?? [];
  const visibleWarnings = result ? result.warnings : parserResult?.assumptions ?? [];
  const isAnonymousLocked = !sessionEnvelope.session && usage.locked;

  const updateText = <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  const updateNumber = <K extends keyof VehicleInput>(key: K, value: string) => {
    const numericValue = value === "" ? 0 : Number(value);
    setInput((current) => ({ ...current, [key]: Number.isNaN(numericValue) ? 0 : numericValue }));
  };

  const getFieldState = (field: VehicleFieldKey): { state: FieldState; stateLabel?: string } => {
    if (validationErrors.includes(field)) return { state: "error", stateLabel: "required" };
    if (parserMissing.includes(field)) return { state: "missing", stateLabel: "complete" };
    if (parserRecommended.includes(field)) return { state: "recommended", stateLabel: "review" };
    return { state: "default" };
  };

  const applyParseResult = (parsed: UrlParseResult, url: string) => {
    setParserResult(parsed);
    setInput((current) => mergeInput(current, { ...parsed.partialInput, listingUrl: parsed.normalizedUrl ?? url }));
    setListingUrl(parsed.normalizedUrl ?? url);
    setStatus(getParserStatusMessage(parsed));
    setValidationErrors([]);
  };

  const handleParseUrl = async () => {
    const trimmedUrl = listingUrl.trim();
    if (!trimmedUrl) {
      setStatus("Paste a full listing URL to start the parser.");
      return;
    }

    setIsParsing(true);
    setStatus("Parsing listing and extracting public fields...");
    const fallback = parseListingUrl(trimmedUrl);
    void trackEvent(ANALYTICS_EVENTS.urlParseAttempted, {
      platform: detectPlatform(trimmedUrl),
      urlHost: getUrlHost(trimmedUrl)
    });

    try {
      const response = await fetch("/api/parse-listing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl })
      });

      if (!response.ok) {
        applyParseResult(fallback, trimmedUrl);
        trackParseOutcome(fallback);
        return;
      }

      const parsed = (await response.json()) as UrlParseResult;
      applyParseResult(parsed, trimmedUrl);
      trackParseOutcome(parsed);
    } catch {
      applyParseResult(fallback, trimmedUrl);
      trackParseOutcome(fallback);
    } finally {
      setIsParsing(false);
    }
  };
  const handleSimulate = () => {
    const normalizedInput = normalizeInput(input, listingUrl);
    const missingFields = validateInput(normalizedInput);
    setValidationErrors(missingFields);

    if (missingFields.length > 0) {
      setStatus(`Complete these fields first: ${missingFields.map((field) => FIELD_LABELS[field]).join(", ")}.`);
      return;
    }

    if (isAnonymousLocked) {
      setStatus(sessionEnvelope.access.upsellMessage);
      return;
    }

    setIsRunning(true);
    try {
      const simulation = runSimulation(normalizedInput, detectPlatform(listingUrl), parserResult ?? undefined);
      setResult(simulation);
      void trackEvent(ANALYTICS_EVENTS.simulationCompleted, {
        resultId: simulation.id,
        verdict: simulation.verdict,
        riskLevel: simulation.risk.level,
        planLevel: sessionEnvelope.access.level,
        providerLabel: simulation.market.providerLabel
      });
      setSavedReport(null);
      setHistory(pushHistory(simulation));
      if (!sessionEnvelope.session) {
        setUsage(consumeSimulationCredit());
      }
      setStatus("Decision ready. Review landed cost, market gap, and risk.");
      setCloudMessage(undefined);
    } finally {
      setIsRunning(false);
    }
  };

  const handleLoadSample = (scenario: SampleScenario, source = "sample_button") => {
    setMode("manual");
    setInput(scenario.input);
    setListingUrl(scenario.input.listingUrl ?? "");
    setParserResult(parseListingUrl(scenario.input.listingUrl ?? ""));
    setResult(null);
    setSavedReport(null);
    setValidationErrors([]);
    setStatus(`${scenario.label} loaded. Review the prefilled assumptions, then compute the import decision.`);
    scrollToTry();
    void trackEvent(ANALYTICS_EVENTS.sampleScenarioUsed, {
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      source
    });
  };

  const handleLoadDemo = () => {
    handleLoadSample(SAMPLE_SCENARIOS[0] ?? { id: "demo", label: "Demo case", badge: "Demo", description: "Demo vehicle", input: DEMO_VEHICLE_INPUT }, "demo_cta");
  };

  const handleReset = () => {
    setInput(EMPTY_VEHICLE_INPUT);
    setListingUrl("");
    setParserResult(null);
    setResult(null);
    setSavedReport(null);
    setValidationErrors([]);
    setStatus("Form reset. Paste a listing or complete the core fields to continue.");
  };

  const handleSaveSnapshot = () => {
    if (!result) return;
    setHistory(pushHistory(result));
    setStatus("Snapshot saved to local history.");
  };

  const handleAuthSubmit = async () => {
    setAuthBusy(true);
    setAuthStatus(undefined);

    try {
      const response = await fetch(`/api/auth/${authMode === "signup" ? "signup" : "login"}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });

      const payload = (await response.json()) as SessionEnvelope & { error?: string };
      if (!response.ok || !payload.session) {
        setAuthStatus(payload.error ?? "Unable to complete authentication.");
        return;
      }

      setSessionEnvelope(payload);
      setAuthPassword("");
      setAuthStatus(authMode === "signup" ? "Account created. Cloud save is now enabled." : "Signed in. Your cloud history is available.");
      void trackEvent(authMode === "signup" ? ANALYTICS_EVENTS.accountSignup : ANALYTICS_EVENTS.login, {
        planLevel: payload.access.level,
        reportCount: payload.reportCount
      });
      await loadCloudReports();
    } catch {
      setAuthStatus("Authentication failed. Try again.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionEnvelope(defaultSessionEnvelope());
    setCloudReports([]);
    setSavedReport(null);
    setAuthStatus("Signed out. Local history remains in this browser.");
  };

  const handleImportLocal = async () => {
    if (!sessionEnvelope.session || history.length === 0) {
      return;
    }

    setImportBusy(true);
    setAuthStatus(undefined);

    try {
      const response = await fetch("/api/reports/import-local", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reports: history })
      });

      const payload = (await response.json()) as { imported?: number; error?: string };
      if (!response.ok) {
        setAuthStatus(payload.error ?? "Unable to import local history.");
        return;
      }

      await loadCloudReports();
      setAuthStatus(`Imported ${payload.imported ?? 0} local ${payload.imported === 1 ? "decision" : "decisions"} into cloud history.`);
    } catch {
      setAuthStatus("Unable to import local history.");
    } finally {
      setImportBusy(false);
    }
  };

  const saveCurrentReport = async (): Promise<ReportDocument | null> => {
    if (!result) {
      return null;
    }

    if (!sessionEnvelope.access.canSaveCloud) {
      setCloudMessage("Create a free account to save this decision in the cloud.");
      return null;
    }

    setCloudBusy(true);
    setCloudMessage(undefined);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          input: result.input,
          platform: result.platform,
          parseResult: parserResult ?? undefined
        })
      });

      const payload = (await response.json()) as ReportDocument & { error?: string };
      if (!response.ok || payload.error) {
        setCloudMessage(payload.error ?? "Unable to save this report.");
        return null;
      }

      setSavedReport(payload);
      setCloudMessage("Report saved to cloud history.");
      void trackEvent(ANALYTICS_EVENTS.reportSaved, {
        reportId: payload.id,
        verdict: payload.simulation.verdict,
        planLevel: sessionEnvelope.access.level
      });
      await loadCloudReports();
      return payload;
    } catch {
      setCloudMessage("Unable to save this report.");
      return null;
    } finally {
      setCloudBusy(false);
    }
  };

  const handleSaveCloud = async () => {
    await saveCurrentReport();
  };

  const handleCreateShare = async () => {
    const currentReport = savedReport ?? (await saveCurrentReport());
    if (!currentReport) {
      return;
    }

    setCloudBusy(true);
    try {
      const response = await fetch(`/api/reports/${currentReport.id}/share`, { method: "POST" });
      const payload = (await response.json()) as ReportDocument & { error?: string };
      if (!response.ok || payload.error) {
        setCloudMessage(payload.error ?? "Unable to create a share link.");
        return;
      }

      setSavedReport(payload);
      setCloudMessage("Share link created. You can open the shared route from the result panel or cloud history.");
      void trackEvent(ANALYTICS_EVENTS.shareLinkCreated, {
        reportId: payload.id,
        shareId: payload.shareId
      });
      await loadCloudReports();
    } catch {
      setCloudMessage("Unable to create a share link.");
    } finally {
      setCloudBusy(false);
    }
  };

  const handleOpenCloudReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}`, { cache: "no-store" });
      if (!response.ok) {
        setCloudMessage("Unable to load the saved report.");
        return;
      }

      const document = (await response.json()) as ReportDocument;
      setSavedReport(document);
      setResult(document.simulation);
      setInput(document.simulation.input);
      setListingUrl(document.simulation.input.listingUrl ?? "");
      setParserResult(null);
      setStatus("Cloud report loaded into the app.");
    } catch {
      setCloudMessage("Unable to load the saved report.");
    }
  };

  const usageCaption = sessionEnvelope.session
    ? `${sessionEnvelope.access.label}. Anonymous local limits are replaced by account access and cloud save.`
    : usage.locked
      ? `Free limit reached for ${usage.periodLabel}.`
      : `${usage.remaining} of ${FREE_SIMULATION_LIMIT} free decisions left in ${usage.periodLabel}.`;

  return (
    <main className="relative overflow-hidden">
      <LandingSections
        onStartUrl={handleStartUrl}
        onSubmitUrl={handleLandingUrlSubmit}
        onStartManual={handleStartManual}
        onLoadDemo={handleLoadDemo}
        onPlanCta={handlePlanCta}
        onCta={handleLandingCta}
      />

      <section className="section-grid px-6 pb-10 pt-10 md:px-10 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div id="simulator" className="grid gap-8 scroll-mt-24 xl:grid-cols-[0.82fr_1.18fr]">
            <section className="glass-panel rounded-[2rem] border border-white/70 p-6 shadow-soft md:p-8">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Input system</p>
                  <h2 className="mt-2 text-3xl font-semibold text-ink">Run a new decision</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">{status}</p>
                </div>
                <div className="flex gap-2 rounded-full bg-slate-100 p-1">
                  <button type="button" onClick={() => setMode("manual")} className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "manual" ? "bg-white text-ink shadow" : "text-slate-500"}`}>Manual</button>
                  <button type="button" onClick={() => setMode("url")} className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "url" ? "bg-white text-ink shadow" : "text-slate-500"}`}>URL</button>
                </div>
              </div>
              <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Access</p>
                    <p className="mt-1 text-sm text-slate-600">{usageCaption}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isAnonymousLocked ? "bg-rose-100 text-rose-900" : "bg-emerald-100 text-emerald-900"}`}>{sessionEnvelope.session ? "Account" : isAnonymousLocked ? "Limit reached" : "Free"}</span>
                </div>
              </div>
              <details className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
                  Try a sample vehicle
                  <span className="ml-2 text-slate-400">or paste your own listing below</span>
                </summary>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {SAMPLE_SCENARIOS.map((scenario) => (
                    <button
                      key={scenario.id}
                      type="button"
                      onClick={() => handleLoadSample(scenario)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-orange-300 hover:bg-orange-50"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{scenario.badge}</span>
                      <span className="mt-2 block text-base font-semibold text-ink">{scenario.label}</span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">{scenario.description}</span>
                    </button>
                  ))}
                </div>
              </details>
              {mode === "url" ? (
                <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <Field label="Listing URL" hint="Supported in this MVP: mobile.de, AutoScout24, Leboncoin, La Centrale">
                      <Input value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://www.mobile.de/..." />
                    </Field>
                    <button type="button" onClick={handleParseUrl} disabled={isParsing} className="self-end rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">{isParsing ? "Parsing..." : "Extract listing data"}</button>
                  </div>

                  {parserResult ? (
                    <div className={`mt-4 rounded-3xl border p-4 ${parserClasses(parserResult.status)}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] opacity-70">Parser result</p>
                          <p className="mt-2 text-lg font-semibold">{parserResult.summary}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.15em]">
                          <span className="rounded-full border border-current/15 bg-white/70 px-3 py-1">{parserResult.platform}</span>
                          <span className="rounded-full border border-current/15 bg-white/70 px-3 py-1">{parserResult.status}</span>
                          <span className="rounded-full border border-current/15 bg-white/70 px-3 py-1">{parserResult.source.replace("_", " ")}</span>
                        </div>
                      </div>
                      <details className="mt-4 rounded-2xl bg-white/50 p-4">
                        <summary className="cursor-pointer list-none text-sm font-semibold">Parser details</summary>
                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Extracted</p>
                          <div className="mt-3 flex flex-wrap gap-2">{parserResult.extractedFields.length > 0 ? parserResult.extractedFields.map((field) => <span key={field} className="rounded-full bg-white/80 px-3 py-2 text-xs font-medium text-slate-700">{FIELD_LABELS[field]}</span>) : <span className="text-sm">No reliable fields extracted yet.</span>}</div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Complete next</p>
                          <div className="mt-3 flex flex-wrap gap-2">{parserResult.missingFields.length > 0 ? parserResult.missingFields.map((field) => <span key={field} className="rounded-full bg-white/80 px-3 py-2 text-xs font-medium text-slate-700">{FIELD_LABELS[field]}</span>) : <span className="text-sm">Core fields look good.</span>}</div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">Recommended review</p>
                          <div className="mt-3 flex flex-wrap gap-2">{parserResult.recommendedFields.length > 0 ? parserResult.recommendedFields.map((field) => <span key={field} className="rounded-full bg-white/80 px-3 py-2 text-xs font-medium text-slate-700">{FIELD_LABELS[field]}</span>) : <span className="text-sm">No extra review flags.</span>}</div>
                        </div>
                      </div>
                      </details>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Required inputs</p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <Field label="Purchase price (EUR)" {...getFieldState("purchasePrice")}>
                      <Input type="number" value={input.purchasePrice || ""} onChange={(event) => updateNumber("purchasePrice", event.target.value)} />
                    </Field>
                    <Field label="Country of origin" {...getFieldState("countryOfOrigin")}>
                      <Select value={input.countryOfOrigin} onChange={(event) => updateText("countryOfOrigin", event.target.value as VehicleInput["countryOfOrigin"])}>
                        {COUNTRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Brand" {...getFieldState("brand")}>
                      <Input value={input.brand} onChange={(event) => updateText("brand", event.target.value)} />
                    </Field>
                    <Field label="Model" {...getFieldState("model")}>
                      <Input value={input.model} onChange={(event) => updateText("model", event.target.value)} />
                    </Field>
                    <Field label="Year" {...getFieldState("year")}>
                      <Input type="number" value={input.year || ""} onChange={(event) => updateNumber("year", event.target.value)} />
                    </Field>
                    <Field label="First registration" {...getFieldState("firstRegistrationDate")}>
                      <Input type="date" value={input.firstRegistrationDate} onChange={(event) => updateText("firstRegistrationDate", event.target.value)} />
                    </Field>
                    <Field label="Mileage (km)" {...getFieldState("mileage")}>
                      <Input type="number" value={input.mileage || ""} onChange={(event) => updateNumber("mileage", event.target.value)} />
                    </Field>
                    <Field label="Horsepower (hp)" {...getFieldState("horsepower")}>
                      <Input type="number" value={input.horsepower || ""} onChange={(event) => updateNumber("horsepower", event.target.value)} />
                    </Field>
                    <Field label="Fuel type" {...getFieldState("fuelType")}>
                      <Select value={input.fuelType} onChange={(event) => updateText("fuelType", event.target.value as VehicleInput["fuelType"])}>
                        {FUEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Transmission" {...getFieldState("transmission")}>
                      <Select value={input.transmission} onChange={(event) => updateText("transmission", event.target.value as VehicleInput["transmission"])}>
                        {TRANSMISSION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                    </Field>
                  </div>
                </div>

                <details className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink">
                    Advanced assumptions
                    <span className="ml-2 font-normal text-slate-500">tax, logistics, VAT, and market override</span>
                  </summary>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <Field label="Trim" {...getFieldState("trim")}>
                      <Input value={input.trim} onChange={(event) => updateText("trim", event.target.value)} />
                    </Field>
                    <Field label="Fiscal power (CV)" {...getFieldState("fiscalPower")}>
                      <Input type="number" value={input.fiscalPower || ""} onChange={(event) => updateNumber("fiscalPower", event.target.value)} />
                    </Field>
                    <Field label="CO2 emissions (g/km)" {...getFieldState("co2Emissions")}>
                      <Input type="number" value={input.co2Emissions || ""} onChange={(event) => updateNumber("co2Emissions", event.target.value)} />
                    </Field>
                    <Field label="Curb weight (kg)" {...getFieldState("curbWeightKg")}>
                      <Input type="number" value={input.curbWeightKg || ""} onChange={(event) => updateNumber("curbWeightKg", event.target.value)} />
                    </Field>
                    <Field label="Seller type" {...getFieldState("sellerType")}>
                      <Select value={input.sellerType} onChange={(event) => updateText("sellerType", event.target.value as VehicleInput["sellerType"])}>
                        {SELLER_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="VAT status" {...getFieldState("vatStatus")}>
                      <Select value={input.vatStatus} onChange={(event) => updateText("vatStatus", event.target.value as VehicleInput["vatStatus"])}>
                        {VAT_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </Select>
                    </Field>
                    <Field label="Transport cost (EUR)" {...getFieldState("transportCost")}>
                      <Input type="number" value={input.transportCost || ""} onChange={(event) => updateNumber("transportCost", event.target.value)} />
                    </Field>
                    <Field label="Export plates (EUR)" {...getFieldState("exportPlatesCost")}>
                      <Input type="number" value={input.exportPlatesCost || ""} onChange={(event) => updateNumber("exportPlatesCost", event.target.value)} />
                    </Field>
                    <Field label="COC cost (EUR)" {...getFieldState("cocCost")}>
                      <Input type="number" value={input.cocCost || ""} onChange={(event) => updateNumber("cocCost", event.target.value)} />
                    </Field>
                    <Field label="Inspection cost (EUR)" {...getFieldState("inspectionCost")}>
                      <Input type="number" value={input.inspectionCost || ""} onChange={(event) => updateNumber("inspectionCost", event.target.value)} />
                    </Field>
                    <Field label="Broker fees (EUR)" {...getFieldState("brokerFees")}>
                      <Input type="number" value={input.brokerFees || ""} onChange={(event) => updateNumber("brokerFees", event.target.value)} />
                    </Field>
                    <Field label="French market estimate (EUR)" {...getFieldState("frenchMarketEstimate")}>
                      <Input type="number" value={input.frenchMarketEstimate || ""} onChange={(event) => updateNumber("frenchMarketEstimate", event.target.value)} />
                    </Field>
                  </div>
                </details>
              </div>
              <details className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm text-slate-600">
                <summary className="cursor-pointer list-none font-semibold text-ink">Reliability notes</summary>
                <p className="mt-3">When data is missing, the engine shows the assumption or keeps the uncertainty visible. It never silently invents VAT, malus, or market facts.</p>
                <p className="mt-2 text-xs text-slate-500">{LEGAL_REFERENCE_LABEL}.</p>
                {visibleWarnings.length > 0 ? (
                  <div className="mt-4 space-y-2 text-amber-900">
                    {visibleWarnings.map((warning) => <p key={warning} className="rounded-2xl bg-amber-50 px-4 py-3">{warning}</p>)}
                  </div>
                ) : null}
              </details>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={handleSimulate} disabled={isRunning || isAnonymousLocked} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-400">{isAnonymousLocked ? "Create account to continue" : isRunning ? "Computing..." : "Compute import decision"}</button>
                <button type="button" onClick={handleLoadDemo} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400">Load demo</button>
                <button type="button" onClick={handleReset} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400">Reset</button>
              </div>
            </section>
            <div className="space-y-6">
              <ResultPanel
                result={result}
                access={sessionEnvelope.access}
                savedReport={savedReport}
                cloudBusy={cloudBusy}
                cloudMessage={cloudMessage}
                onSaveSnapshot={handleSaveSnapshot}
                onSaveCloud={handleSaveCloud}
                onCreateShare={handleCreateShare}
              />
              <div id="account" className="scroll-mt-24">
                <AccountPanel
                  session={sessionEnvelope.session}
                  access={sessionEnvelope.access}
                  reportCount={sessionEnvelope.reportCount}
                  email={authEmail}
                  password={authPassword}
                  authMode={authMode}
                  busy={authBusy}
                  status={authStatus}
                  localHistoryCount={history.length}
                  importBusy={importBusy}
                  onAuthModeChange={setAuthMode}
                  onEmailChange={setAuthEmail}
                  onPasswordChange={setAuthPassword}
                  onSubmit={handleAuthSubmit}
                  onLogout={handleLogout}
                  onImportLocal={handleImportLocal}
                />
              </div>
              <div id="reports" className="scroll-mt-24 space-y-6">
                {sessionEnvelope.session ? <CloudHistoryPanel reports={cloudReports} onOpen={handleOpenCloudReport} /> : null}
                <HistoryPanel
                  history={history}
                  onSelect={(entry) => {
                    setResult(entry);
                    setInput(entry.input);
                    setListingUrl(entry.input.listingUrl ?? "");
                    setSavedReport(null);
                    setStatus("Loaded a saved local decision.");
                  }}
                  onClear={() => {
                    clearHistory();
                    setHistory([]);
                  }}
                />
              </div>
              <details className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Feedback</summary>
                <div className="mt-4">
                  <FeedbackWidget
                    context={{ screen: "account_history", resultId: result?.id, reportId: savedReport?.id }}
                    title="Help shape the beta"
                    compact
                  />
                </div>
              </details>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
