import { MARKET_LIVE_FEED } from "@/data/market-live-feed";
import { MARKET_REFERENCE_SEEDS } from "@/data/market-seed";
import {
  BRAND_MARKET_MULTIPLIERS,
  COUNTRY_MARKET_ADJUSTMENTS,
  FUEL_MARKET_ADJUSTMENTS
} from "@/lib/reference-data";
import type {
  MarketComparable,
  MarketEstimate,
  MarketProviderId,
  MarketProviderKind,
  SimulationContext,
  VehicleInput
} from "@/types";

export interface MarketProvider {
  id: MarketProviderId;
  label: string;
  kind: MarketProviderKind;
  canHandle: (input: VehicleInput) => boolean;
  estimate: (input: VehicleInput, context?: SimulationContext) => MarketEstimate | null;
}

function roundCurrency(value: number): number {
  return Math.max(0, Math.round(value));
}

function resolveEvaluationDate(context?: SimulationContext): Date {
  if (!context?.evaluationDate) {
    return new Date();
  }

  return context.evaluationDate instanceof Date ? context.evaluationDate : new Date(context.evaluationDate);
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeWords(value: string): string[] {
  return normalizeToken(value)
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function buildManualEstimate(input: VehicleInput): MarketEstimate {
  return {
    estimatedPrice: roundCurrency(input.frenchMarketEstimate || 0),
    source: "manual",
    providerId: "manual",
    providerLabel: "Manual France market input",
    confidence: "high",
    explanation: "Using the French market price entered by the user.",
    comparableLabel: "User-supplied France retail reference",
    provenance: {
      kind: "manual",
      sourceLabel: "Manual user input",
      connectorLabel: "Direct user override",
      freshness: "manual",
      note: "Best used when the operator already knows the live France retail market."
    }
  };
}

function buildSeededEstimate(input: VehicleInput): MarketEstimate | null {
  const brandKey = normalizeToken(input.brand);
  const modelKey = normalizeToken(input.model);
  const trimKey = normalizeToken(input.trim);
  const record = MARKET_REFERENCE_SEEDS.find((candidate) => {
    if (normalizeToken(candidate.brand) !== brandKey) {
      return false;
    }

    const candidateModel = normalizeToken(candidate.model);
    const modelMatch = modelKey.includes(candidateModel) || candidateModel.includes(modelKey);
    const fuelMatch = !candidate.fuelType || candidate.fuelType === input.fuelType;
    const trimMatch = !candidate.trimKeywords?.length || candidate.trimKeywords.some((keyword) => trimKey.includes(normalizeToken(keyword)));
    return modelMatch && fuelMatch && trimMatch;
  });

  if (!record) {
    return null;
  }

  const yearDelta = input.year - record.targetYear;
  const mileageDelta = record.targetMileage - input.mileage;
  const yearAdjustment = yearDelta * 1100;
  const mileageAdjustment = mileageDelta * 0.035;
  const powerAdjustment = Math.max(-1800, Math.min(1800, (input.horsepower - 140) * 8));
  const estimatedPrice = roundCurrency(record.basePrice + yearAdjustment + mileageAdjustment + powerAdjustment);

  return {
    estimatedPrice,
    source: "seeded",
    providerId: "seeded_reference",
    providerLabel: "Seeded France reference",
    confidence: record.fuelType ? "medium" : "low",
    explanation: record.note,
    comparableLabel: `${record.brand} ${record.model} seeded France reference`,
    provenance: {
      kind: "seeded",
      sourceLabel: "Internal seeded references",
      connectorLabel: "Local curated benchmark set",
      freshness: "seeded_reference",
      listingCount: 1,
      note: record.note
    }
  };
}

function buildComparableListings(input: VehicleInput): MarketComparable[] {
  const brandKey = normalizeToken(input.brand);
  const modelKey = normalizeToken(input.model);
  const inputTrimWords = normalizeWords(input.trim);

  return MARKET_LIVE_FEED.map((record) => {
    let score = 0;
    if (normalizeToken(record.brand) === brandKey) score += 40;
    if (modelKey.includes(normalizeToken(record.model)) || normalizeToken(record.model).includes(modelKey)) score += 35;
    if (record.fuelType === input.fuelType) score += 15;
    if (inputTrimWords.length > 0 && inputTrimWords.some((word) => normalizeWords(record.trim).includes(word))) score += 10;
    score -= Math.abs(input.year - record.year) * 6;
    score -= Math.min(20, Math.round(Math.abs(input.mileage - record.mileage) / 15000) * 4);

    return { record, score };
  })
    .filter((candidate) => candidate.score >= 35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(({ record }) => ({
      id: record.id,
      title: `${record.brand} ${record.model} ${record.trim}`.trim(),
      price: record.price,
      mileage: record.mileage,
      year: record.year,
      sourceLabel: record.sourceLabel,
      observedAt: record.observedAt,
      url: record.url
    }));
}

function buildMockLiveEstimate(input: VehicleInput): MarketEstimate | null {
  const comparables = buildComparableListings(input);
  if (comparables.length < 2) {
    return null;
  }

  const adjustedValues = comparables.map((comparable) => {
    const yearAdjustment = (input.year - comparable.year) * 950;
    const mileageAdjustment = (comparable.mileage - input.mileage) * 0.035;
    return comparable.price + yearAdjustment + mileageAdjustment;
  });

  const estimatedPrice = roundCurrency(median(adjustedValues));
  const latestObservation = comparables
    .map((candidate) => candidate.observedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    estimatedPrice,
    source: "provider",
    providerId: "mock_live_feed",
    providerLabel: "Provider-backed France snapshot",
    confidence: comparables.length >= 4 ? "high" : "medium",
    explanation: `Based on ${comparables.length} curated France-market comparables with year and mileage normalization.`,
    comparableLabel: `Curated France snapshot using ${comparables.length} listings`,
    provenance: {
      kind: "mock_live",
      sourceLabel: "Curated France provider snapshot",
      connectorLabel: "Mock live provider",
      freshness: "recent_snapshot",
      observedAt: latestObservation,
      listingCount: comparables.length,
      isMock: true,
      note: "Designed to mirror a future live connector without relying on fragile scraping today."
    },
    comparableListings: comparables
  };
}

function buildHeuristicEstimate(input: VehicleInput, context?: SimulationContext): MarketEstimate {
  const brandKey = input.brand.trim().toLowerCase();
  const brandMultiplier = BRAND_MARKET_MULTIPLIERS[brandKey] ?? 1.02;
  const countryAdjustment = COUNTRY_MARKET_ADJUSTMENTS[input.countryOfOrigin];
  const fuelAdjustment = FUEL_MARKET_ADJUSTMENTS[input.fuelType];
  const age = Math.max(0, resolveEvaluationDate(context).getFullYear() - input.year);
  const expectedMileage = age * 15000;
  const mileageGap = input.mileage - expectedMileage;
  const mileageAdjustment = Math.max(-3500, Math.min(2200, -mileageGap * 0.025));
  const desirabilityBoost = Math.max(0, input.horsepower - 110) * 12;
  const baselineMarkup = input.purchasePrice * (brandMultiplier + countryAdjustment + fuelAdjustment - 0.92);
  const heuristicValue = input.purchasePrice + baselineMarkup + mileageAdjustment + desirabilityBoost;

  return {
    estimatedPrice: roundCurrency(heuristicValue),
    source: "heuristic",
    providerId: "heuristic",
    providerLabel: "Heuristic France estimate",
    confidence: "low",
    explanation:
      "Approximation based on origin-country spread, brand demand, age, mileage, and power. Replace with a provider-backed or manual market value for the strongest decision.",
    comparableLabel: "Modeled France retail approximation",
    provenance: {
      kind: "heuristic",
      sourceLabel: "Modeled market fallback",
      connectorLabel: "Heuristic estimator",
      freshness: "modeled",
      note: "Fallback only when no direct market reference is available."
    }
  };
}

const manualMarketProvider: MarketProvider = {
  id: "manual",
  label: "Manual France market input",
  kind: "manual",
  canHandle: (input) => Boolean(input.frenchMarketEstimate && input.frenchMarketEstimate > 0),
  estimate: (input) => buildManualEstimate(input)
};

const seededMarketProvider: MarketProvider = {
  id: "seeded_reference",
  label: "Seeded France reference",
  kind: "seeded",
  canHandle: (input) => Boolean(input.brand && input.model),
  estimate: (input) => buildSeededEstimate(input)
};

const mockLiveMarketProvider: MarketProvider = {
  id: "mock_live_feed",
  label: "Provider-backed France snapshot",
  kind: "mock_live",
  canHandle: (input) => Boolean(input.brand && input.model),
  estimate: (input) => buildMockLiveEstimate(input)
};

const heuristicMarketProvider: MarketProvider = {
  id: "heuristic",
  label: "Heuristic France estimate",
  kind: "heuristic",
  canHandle: () => true,
  estimate: (input, context) => buildHeuristicEstimate(input, context)
};

export const MARKET_PROVIDERS: MarketProvider[] = [manualMarketProvider, seededMarketProvider, mockLiveMarketProvider, heuristicMarketProvider];

export function estimateFrenchMarketValue(input: VehicleInput, context?: SimulationContext): MarketEstimate {
  for (const provider of MARKET_PROVIDERS) {
    if (!provider.canHandle(input)) {
      continue;
    }

    const estimate = provider.estimate(input, context);
    if (estimate) {
      return estimate;
    }
  }

  return buildHeuristicEstimate(input, context);
}