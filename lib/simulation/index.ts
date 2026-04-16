import { generateChecklist } from "@/lib/checklist";
import { computeTotalCost } from "@/lib/cost";
import { estimateFrenchMarketValue } from "@/lib/market";
import { buildComparisonInsight, buildResultNarrative, computeDealVerdict } from "@/lib/result";
import { assessRisk } from "@/lib/risk";
import { ListingPlatform, SimulationContext, SimulationResult, UrlParseResult, VehicleInput } from "@/types";

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function buildTitle(input: VehicleInput): string {
  return [input.brand, input.model, input.trim].filter(Boolean).join(" ");
}

export function runSimulation(
  input: VehicleInput,
  platform: ListingPlatform = "unknown",
  parseResult?: UrlParseResult,
  context?: SimulationContext
): SimulationResult {
  const breakdown = computeTotalCost(input, context);
  const market = estimateFrenchMarketValue(input, context);
  const comparison = buildComparisonInsight(breakdown.total, market);
  const risk = assessRisk(input);
  const checklist = generateChecklist(input, context);
  const profitOrLoss = comparison.estimatedSpread;
  const marginPercent = comparison.marginPercent;
  const verdict = computeDealVerdict(profitOrLoss, marginPercent, risk.level);
  const generatedAt = new Date().toISOString();

  const warnings = dedupe([
    ...(parseResult?.assumptions ?? []),
    ...breakdown.assumptions,
    ...(market.confidence === "low" ? [market.explanation] : [])
  ]);

  const narrative = buildResultNarrative({
    verdict,
    comparison,
    risk,
    market,
    warnings
  });

  return {
    id: `${generatedAt}-${buildTitle(input)}`,
    title: buildTitle(input),
    input,
    platform,
    parsedListingSummary: parseResult?.summary,
    parserStatus: parseResult?.status,
    breakdown,
    market,
    comparison,
    risk,
    checklist,
    verdict,
    narrative,
    profitOrLoss,
    marginPercent,
    warnings,
    generatedAt
  };
}

