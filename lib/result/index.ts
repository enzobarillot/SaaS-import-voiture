import { ComparisonInsight, DealVerdict, MarketConfidence, RiskLevel, SimulationResult } from "@/types";

export function getComparisonConfidenceLabel(confidence: MarketConfidence): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    default:
      return "Approximate comparison";
  }
}

export function computeDealVerdict(profitOrLoss: number, marginPercent: number, riskLevel: RiskLevel): DealVerdict {
  if (profitOrLoss >= 1800 || marginPercent >= 7) {
    return riskLevel === "HIGH" ? "FAIR DEAL" : "GOOD DEAL";
  }

  if (profitOrLoss >= 0 || marginPercent >= -2) {
    return riskLevel === "HIGH" && profitOrLoss < 1000 ? "BAD DEAL" : "FAIR DEAL";
  }

  return "BAD DEAL";
}

export function buildComparisonInsight(totalCost: number, marketEstimate: SimulationResult["market"]): ComparisonInsight {
  const estimatedSpread = marketEstimate.estimatedPrice - totalCost;
  const marginPercent = totalCost > 0 ? (estimatedSpread / totalCost) * 100 : 0;
  const direction = estimatedSpread > 250 ? "saving" : estimatedSpread < -250 ? "overpay" : "break_even";
  const spreadLabel =
    direction === "saving"
      ? `Estimated savings of ${Math.abs(Math.round(estimatedSpread)).toLocaleString("fr-FR")} EUR versus France`
      : direction === "overpay"
        ? `Estimated overpay of ${Math.abs(Math.round(estimatedSpread)).toLocaleString("fr-FR")} EUR versus France`
        : "Roughly aligned with the French market";

  return {
    estimatedSpread,
    marginPercent,
    direction,
    spreadLabel,
    confidenceLabel: getComparisonConfidenceLabel(marketEstimate.confidence),
    sourceLabel: marketEstimate.providerLabel
  };
}

export function computeDealSummary(result: Pick<SimulationResult, "verdict" | "comparison" | "risk" | "market" | "warnings">) {
  const riskFragment =
    result.risk.level === "LOW"
      ? "execution risk stays controlled"
      : result.risk.level === "MEDIUM"
        ? "the margin exists but execution risk needs attention"
        : "execution risk is elevated and can erase the upside";

  const verdictReason =
    result.verdict === "GOOD DEAL"
      ? `Good deal because ${result.comparison.spreadLabel.toLowerCase()} and ${riskFragment}.`
      : result.verdict === "FAIR DEAL"
        ? `Fair deal because the import is close to the French market and ${riskFragment}.`
        : `Bad deal because ${result.comparison.spreadLabel.toLowerCase()} and ${riskFragment}.`;

  const headline =
    result.verdict === "GOOD DEAL"
      ? "This import still lands below the French market."
      : result.verdict === "FAIR DEAL"
        ? "This import is workable, but the edge is thin."
        : "This import does not clear the margin you want.";

  const explanation = `${result.comparison.spreadLabel}. ${result.market.providerLabel} with ${getComparisonConfidenceLabel(result.market.confidence).toLowerCase()}.`;

  const whyVerdict = [
    `France comparison: ${result.comparison.spreadLabel}.`,
    `Risk level: ${result.risk.level.toLowerCase()}${result.risk.reasons[0] ? ` - ${result.risk.reasons[0]}` : ""}.`,
    `Comparison source: ${result.market.providerLabel}.`,
    ...(result.warnings.length > 0 ? [`Primary uncertainty: ${result.warnings[0]}.`] : [])
  ];

  return {
    headline,
    explanation,
    verdictReason,
    whyVerdict
  };
}

export function buildResultNarrative(result: Pick<SimulationResult, "verdict" | "comparison" | "risk" | "market" | "warnings">) {
  return computeDealSummary(result);
}

