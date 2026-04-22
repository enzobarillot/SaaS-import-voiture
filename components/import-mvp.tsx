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
import { assessEstimateQuality } from "@/lib/estimation/quality";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/client";
import { getProductAccess } from "@/lib/product/access";
import { clearHistory, loadHistory, pushHistory } from "@/lib/storage/history";
import { runSimulation } from "@/lib/simulation";
import { consumeSimulationCredit, getUsageState } from "@/lib/usage";
import type {
  ExtensionExtractionPayload,
  InputEvidence,
  InputMode,
  ListingPlatform,
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
  if (status === "partial" || status === "insufficient") return "border-amber-200 bg-amber-50 text-amber-900";
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

function getFilledInputFields(input: VehicleInput): VehicleFieldKey[] {
  return (Object.keys(input) as VehicleFieldKey[]).filter((field) => valueExists(input[field]));
}

function formatFieldList(fields: VehicleFieldKey[]): string {
  return fields.map((field) => FIELD_LABELS[field]).join(", ");
}

function getInferredFields(parserResult: UrlParseResult | null): VehicleFieldKey[] {
  const fields = parserResult?.inferredFields ?? [];
  return parserResult?.partialInput.countryOfOrigin ? Array.from(new Set([...fields, "countryOfOrigin"])) : fields;
}

const EXTENSION_PAYLOAD_HASH_KEY = "extensionPayload";
const EXTENSION_FIELD_KEYS: VehicleFieldKey[] = [
  "brand",
  "model",
  "trim",
  "purchasePrice",
  "year",
  "firstRegistrationDate",
  "mileage",
  "fuelType",
  "transmission",
  "horsepower",
  "fiscalPower",
  "co2Emissions",
  "sellerType",
  "vatStatus",
  "countryOfOrigin",
  "listingUrl"
];

function decodeExtensionPayload(encoded: string): ExtensionExtractionPayload | null {
  try {
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as ExtensionExtractionPayload;
    if (!payload || typeof payload !== "object" || !payload.confirmedFields || !payload.inferredFields) return null;
    return payload;
  } catch {
    return null;
  }
}

function readExtensionPayloadFromHash(): ExtensionExtractionPayload | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  const encoded = new URLSearchParams(hash).get(EXTENSION_PAYLOAD_HASH_KEY);
  return encoded ? decodeExtensionPayload(encoded) : null;
}

function platformFromExtensionSource(source: string): ListingPlatform {
  const normalized = source.toLowerCase();
  if (normalized.includes("mobile")) return "mobile.de";
  if (normalized.includes("autoscout")) return "autoscout24";
  if (normalized.includes("leboncoin")) return "leboncoin";
  if (normalized.includes("lacentrale")) return "lacentrale";
  return "unknown";
}

function filterExtensionFields(fields: Partial<VehicleInput>): Partial<VehicleInput> {
  const filtered: Partial<VehicleInput> = {};
  for (const key of EXTENSION_FIELD_KEYS) {
    const value = fields[key];
    if (valueExists(value)) {
      (filtered as Record<VehicleFieldKey, unknown>)[key] = value;
    }
  }
  return filtered;
}

function extensionStatusToParserStatus(status: ExtensionExtractionPayload["status"]): ParserStatus {
  if (status === "unsupported_source") return "unsupported";
  return status;
}

function extensionPayloadToParserResult(payload: ExtensionExtractionPayload): UrlParseResult {
  const confirmedFields = filterExtensionFields(payload.confirmedFields);
  const inferredFields = filterExtensionFields(payload.inferredFields);
  const confirmedKeys = new Set(Object.keys(confirmedFields) as VehicleFieldKey[]);
  const extractedFieldKeys = (Object.keys(confirmedFields) as VehicleFieldKey[]).filter(
    (field) => field !== "countryOfOrigin" && field !== "listingUrl"
  );
  const inferredFieldKeys = (Object.keys(inferredFields) as VehicleFieldKey[]).filter(
    (field) => !confirmedKeys.has(field) && field !== "listingUrl"
  );
  const partialInput = {
    ...inferredFields,
    ...confirmedFields
  };
  const source = extractedFieldKeys.length > 0 && inferredFieldKeys.length > 0
    ? "mixed"
    : extractedFieldKeys.length > 0
      ? "html_metadata"
      : inferredFieldKeys.length > 0
        ? "url_tokens"
        : "none";
  const status = extensionStatusToParserStatus(payload.status);

  return {
    status,
    platform: platformFromExtensionSource(payload.source),
    partialInput,
    assumptions: [
      "Imported from the Chrome extension using the already-open listing page.",
      ...(inferredFieldKeys.length > 0 ? ["Fields inferred from the page title or URL slug are weak signals and should be reviewed."] : []),
      ...(payload.diagnostics.messages ?? [])
    ],
    summary:
      status === "success"
        ? "Chrome extension extracted usable listing data from the open page."
        : status === "partial"
          ? "Chrome extension prefilled available fields from the open page. Review inferred values."
          : status === "unsupported"
            ? "This listing source is not supported by the Chrome extension."
            : "Chrome extension could not extract enough usable listing data.",
    extractedFields: extractedFieldKeys,
    inferredFields: inferredFieldKeys,
    missingFields: payload.missingCriticalFields,
    recommendedFields: [],
    source,
    normalizedUrl: partialInput.listingUrl,
    diagnostics: [
      `extension:domain:${payload.diagnostics.domain}`,
      `extension:title:${payload.diagnostics.title}`,
      `extension:confirmed_fields:${payload.diagnostics.extractedFieldCount}`
    ]
  };
}

export function ImportMvp() {
  const [mode, setMode] = useState<InputMode>("url");
  const [input, setInput] = useState<VehicleInput>(EMPTY_VEHICLE_INPUT);
  const [listingUrl, setListingUrl] = useState("");
  const [status, setStatus] = useState("Paste a listing URL or complete the fields needed for a reliable France import estimate.");
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [parserResult, setParserResult] = useState<UrlParseResult | null>(null);
  const [userSuppliedFields, setUserSuppliedFields] = useState<VehicleFieldKey[]>([]);
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
    const destination = planId === "premium" ? "#account" : "#simulator";
    handleLandingCta(`pricing_${planId}`, "pricing", destination);

    if (planId === "premium") {
      void trackEvent(ANALYTICS_EVENTS.premiumCtaClicked, {
        location: "pricing",
        cta: "request_pro_plan",
        intent
      });
      setAuthMode("signup");
      document.getElementById("account")?.setAttribute("open", "true");
      document.getElementById("account")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (planId === "account_free") {
      setAuthMode("signup");
      document.getElementById("account")?.setAttribute("open", "true");
      document.getElementById("account")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
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

    if (parsed.status === "partial" || parsed.status === "insufficient") {
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
  const inputEvidence: InputEvidence = {
    userSuppliedFields,
    extractedFields: parserResult?.extractedFields ?? [],
    inferredFields: getInferredFields(parserResult)
  };
  const currentEstimateQuality = assessEstimateQuality({
    input,
    parseResult: parserResult ?? undefined,
    evidence: inputEvidence
  });
  const criticalMissingFields = currentEstimateQuality.criticalMissingFields;
  const advancedCriticalFields: VehicleFieldKey[] = ["co2Emissions", "curbWeightKg", "sellerType", "vatStatus", "transportCost"];
  const hasAdvancedCriticalMissing = criticalMissingFields.some((field) => advancedCriticalFields.includes(field));
  const visibleWarnings = result ? result.warnings : parserResult?.assumptions ?? [];
  const isAnonymousLocked = !sessionEnvelope.session && usage.locked;

  const markUserSuppliedField = (field: VehicleFieldKey) => {
    setUserSuppliedFields((current) => (current.includes(field) ? current : [...current, field]));
  };

  const updateText = <K extends keyof VehicleInput>(key: K, value: VehicleInput[K]) => {
    markUserSuppliedField(key as VehicleFieldKey);
    setInput((current) => ({ ...current, [key]: value }));
  };

  const updateNumber = <K extends keyof VehicleInput>(key: K, value: string) => {
    markUserSuppliedField(key as VehicleFieldKey);
    const numericValue = value === "" ? 0 : Number(value);
    setInput((current) => ({ ...current, [key]: Number.isNaN(numericValue) ? 0 : numericValue }));
  };

  const getFieldState = (field: VehicleFieldKey): { state: FieldState; stateLabel?: string } => {
    if (validationErrors.includes(field)) return { state: "error", stateLabel: "required" };
    if (criticalMissingFields.includes(field)) return { state: "missing", stateLabel: "critical" };
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

  useEffect(() => {
    const extensionPayload = readExtensionPayloadFromHash();
    if (!extensionPayload) return;

    const parsed = extensionPayloadToParserResult(extensionPayload);
    setMode("url");
    setResult(null);
    setSavedReport(null);
    setUserSuppliedFields([]);
    applyParseResult(parsed, parsed.normalizedUrl ?? "");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#simulator`);
    window.setTimeout(scrollToTry, 0);
  }, []);

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
      const simulation = runSimulation(normalizedInput, detectPlatform(listingUrl), parserResult ?? undefined, { inputEvidence });
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
      setStatus(simulation.estimateQuality?.isComplete ? "Reliable estimate ready. Review landed cost, market gap, and risk." : `Incomplete estimate. Confirm ${formatFieldList(simulation.estimateQuality?.criticalMissingFields ?? [])} before trusting the verdict.`);
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
    setUserSuppliedFields(getFilledInputFields(scenario.input));
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
    setUserSuppliedFields([]);
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
      setUserSuppliedFields(getFilledInputFields(document.simulation.input));
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
    <main id="top" className="min-h-screen bg-slate-50 text-ink">
      <TopNav onStart={handleStartUrl} />
      <LandingSections
        onSubmitUrl={handleLandingUrlSubmit}
        onStartManual={handleStartManual}
        onPlanCta={handlePlanCta}
        onCta={handleLandingCta}
      />

      <section id="simulator" className="scroll-mt-20 px-6 py-10 md:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(340px,440px)_1fr]">
          <section className="rounded-[1.5rem] bg-white p-5 shadow-soft ring-1 ring-slate-200/70 md:p-6 xl:self-start">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Simulator</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">New decision</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isAnonymousLocked ? "bg-rose-100 text-rose-900" : "bg-slate-100 text-slate-600"}`}>
                {sessionEnvelope.session ? sessionEnvelope.access.label : isAnonymousLocked ? "Limit reached" : `${usage.remaining}/${FREE_SIMULATION_LIMIT} free`}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-500">{status}</p>
            {!currentEstimateQuality.isComplete ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                <p className="font-semibold">Reliable verdict locked</p>
                <p className="mt-1 text-amber-800">{currentEstimateQuality.nextAction}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {criticalMissingFields.slice(0, 6).map((field) => <span key={field} className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-amber-900">{FIELD_LABELS[field]}</span>)}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <span className="font-semibold">{currentEstimateQuality.label}</span>
                <span className="ml-2 text-emerald-700">Critical fields are present.</span>
              </div>
            )}

            <div className="mt-5 inline-flex rounded-full bg-slate-100 p-1">
              <button type="button" onClick={() => setMode("url")} className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "url" ? "bg-white text-ink shadow" : "text-slate-500"}`}>URL</button>
              <button type="button" onClick={() => setMode("manual")} className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "manual" ? "bg-white text-ink shadow" : "text-slate-500"}`}>Manual</button>
            </div>

            {mode === "url" ? (
              <div className="mt-5 space-y-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <Field label="Listing URL">
                    <Input value={listingUrl} onChange={(event) => setListingUrl(event.target.value)} placeholder="https://www.mobile.de/..." />
                  </Field>
                  <button type="button" onClick={handleParseUrl} disabled={isParsing} className="self-end rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
                    {isParsing ? "Parsing..." : "Extract"}
                  </button>
                </div>

                {parserResult ? (
                  <div className={`rounded-xl px-4 py-3 text-sm ${parserClasses(parserResult.status)}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{parserResult.summary}</span>
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">{parserResult.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {parserResult.extractedFields.length > 0 ? <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold">Imported {parserResult.extractedFields.length}</span> : null}
                      {criticalMissingFields.length > 0 ? <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold">Still needed {criticalMissingFields.length}</span> : <span className="rounded-full bg-white/70 px-2.5 py-1 font-semibold">Critical fields ready</span>}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold">Parser details</summary>
                      <div className="mt-3 grid gap-3 text-xs md:grid-cols-3">
                        <p><span className="block font-semibold uppercase opacity-70">Extracted</span>{parserResult.extractedFields.length > 0 ? parserResult.extractedFields.map((field) => FIELD_LABELS[field]).join(", ") : "None yet"}</p>
                        <p><span className="block font-semibold uppercase opacity-70">Complete</span>{parserResult.missingFields.length > 0 ? parserResult.missingFields.map((field) => FIELD_LABELS[field]).join(", ") : "Core fields ok"}</p>
                        <p><span className="block font-semibold uppercase opacity-70">Review</span>{parserResult.recommendedFields.length > 0 ? parserResult.recommendedFields.map((field) => FIELD_LABELS[field]).join(", ") : "No flags"}</p>
                      </div>
                    </details>
                  </div>
                ) : null}
              </div>
            ) : null}

            <details open={mode === "manual" || Boolean(parserResult)} className="mt-5 border-t border-slate-200 pt-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                Vehicle details
                <span className="text-xs font-normal text-slate-400">required</span>
              </summary>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
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

              <details open={hasAdvancedCriticalMissing} className="mt-5 border-t border-slate-100 pt-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Advanced assumptions</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
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

              <details className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <summary className="cursor-pointer list-none font-semibold text-ink">Methodology notes</summary>
                <p className="mt-3">Missing data stays visible as an assumption. VAT, malus, market confidence, and provider source are not silently invented.</p>
                <p className="mt-2 text-xs text-slate-500">{LEGAL_REFERENCE_LABEL}.</p>
                {visibleWarnings.length > 0 ? (
                  <div className="mt-3 space-y-2 text-amber-900">
                    {visibleWarnings.map((warning) => <p key={warning} className="rounded-xl bg-amber-50 px-3 py-2">{warning}</p>)}
                  </div>
                ) : null}
              </details>
            </details>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" onClick={handleSimulate} disabled={isRunning || isAnonymousLocked} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-400">
                {isAnonymousLocked ? "Create account" : isRunning ? "Computing..." : "Get verdict"}
              </button>
              <button type="button" onClick={handleReset} className="px-3 py-2 text-sm font-semibold text-slate-500 transition hover:text-ink">Reset</button>
            </div>
          </section>

          <div className="min-w-0 xl:sticky xl:top-20 xl:self-start">
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
          </div>
        </div>

        <div className="mx-auto mt-6 grid max-w-7xl gap-3 lg:grid-cols-3">
          <details id="reports" className="scroll-mt-24 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70">
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Reports</summary>
            <div className="mt-5 space-y-5">
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
          </details>

          <details id="account" className="scroll-mt-24 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70">
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Account</summary>
            <div className="mt-5">
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
          </details>

          <details className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70">
            <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Feedback</summary>
            <div className="mt-5">
              <FeedbackWidget
                context={{ screen: "account_history", resultId: result?.id, reportId: savedReport?.id }}
                title="Help shape the beta"
                compact
              />
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
