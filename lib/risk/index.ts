import { RiskAssessment, VehicleInput } from "@/types";

export function assessRisk(input: VehicleInput): RiskAssessment {
  let score = 5;
  const reasons: string[] = [];

  if (!input.co2Emissions) {
    score += 25;
    reasons.push("CO2 emissions are missing, so the ecological penalty may move materially.");
  }

  if (!input.transportCost) {
    score += 15;
    reasons.push("Transport cost is missing, so the landed cost may be understated.");
  }

  if (!input.firstRegistrationDate) {
    score += 15;
    reasons.push("First registration date is missing, which weakens VAT and malus accuracy.");
  }

  if (input.sellerType === "private") {
    score += 10;
    reasons.push("Private seller purchase requires tighter document and payment checks.");
  }

  if (input.vatStatus === "recoverable") {
    score += 18;
    reasons.push("Recoverable VAT assumes a professional buyer who can legally deduct VAT.");
  }

  if (input.vatStatus === "excluded") {
    score += 12;
    reasons.push("VAT is marked excluded, so verify whether French VAT or extra local tax still applies on top of the asking price.");
  }

  if (!input.curbWeightKg) {
    score += 8;
    reasons.push("Vehicle curb weight is missing, so weight malus may be understated.");
  }

  if (!input.cocCost) {
    score += 5;
    reasons.push("No COC budget entered. Some imports need a paid conformity document.");
  }

  const level = score >= 55 ? "HIGH" : score >= 30 ? "MEDIUM" : "LOW";

  return {
    score,
    level,
    reasons
  };
}

