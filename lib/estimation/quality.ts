import { FIELD_LABELS } from "@/lib/reference-data";
import type {
  EstimateAssumption,
  EstimateConfidence,
  EstimateQuality,
  EstimateValueStatus,
  InputEvidence,
  MarketConfidence,
  UrlParseResult,
  VehicleFieldKey,
  VehicleInput
} from "@/types";

const CRITICAL_FIELDS: VehicleFieldKey[] = [
  "countryOfOrigin",
  "firstRegistrationDate",
  "fuelType",
  "co2Emissions",
  "curbWeightKg",
  "sellerType",
  "vatStatus",
  "transportCost"
];

const FIELDS_REQUIRING_EVIDENCE = new Set<VehicleFieldKey>([
  "countryOfOrigin",
  "fuelType",
  "transmission",
  "sellerType",
  "vatStatus",
  "co2Emissions",
  "curbWeightKg",
  "transportCost"
]);

const TRACKED_FIELDS: VehicleFieldKey[] = [
  "purchasePrice",
  "countryOfOrigin",
  "brand",
  "model",
  "year",
  "firstRegistrationDate",
  "mileage",
  "fuelType",
  "transmission",
  "horsepower",
  "fiscalPower",
  "co2Emissions",
  "curbWeightKg",
  "sellerType",
  "vatStatus",
  "transportCost",
  "exportPlatesCost",
  "cocCost",
  "inspectionCost",
  "brokerFees",
  "frenchMarketEstimate"
];

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function hasEvidenceObject(evidence?: InputEvidence): boolean {
  return Boolean(evidence);
}

function hasFieldEvidence(field: VehicleFieldKey, evidence?: InputEvidence, parseResult?: UrlParseResult): boolean {
  if (!evidence) return false;
  return Boolean(
    evidence.userSuppliedFields?.includes(field) ||
      evidence.extractedFields?.includes(field) ||
      evidence.inferredFields?.includes(field) ||
      parseResult?.extractedFields.includes(field)
  );
}

function isUserSupplied(field: VehicleFieldKey, evidence?: InputEvidence): boolean {
  return Boolean(evidence?.userSuppliedFields?.includes(field));
}

function isExtracted(field: VehicleFieldKey, evidence?: InputEvidence, parseResult?: UrlParseResult): boolean {
  return Boolean(evidence?.extractedFields?.includes(field) || parseResult?.extractedFields.includes(field));
}

function isInferred(field: VehicleFieldKey, evidence?: InputEvidence, parseResult?: UrlParseResult, input?: VehicleInput): boolean {
  if (evidence?.inferredFields?.includes(field)) return true;
  if (field === "countryOfOrigin" && input && parseResult?.partialInput.countryOfOrigin === input.countryOfOrigin) return true;
  return false;
}

function hasRawValue(field: VehicleFieldKey, input: VehicleInput, evidence?: InputEvidence, parseResult?: UrlParseResult): boolean {
  const value = input[field];

  if (field === "co2Emissions" && input.fuelType === "electric" && hasFieldValue("fuelType", input, evidence, parseResult)) {
    return true;
  }

  if (value === null || value === undefined) return false;

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    if (field === "co2Emissions") return value >= 0;
    if (["transportCost", "exportPlatesCost", "cocCost", "inspectionCost", "brokerFees", "frenchMarketEstimate"].includes(field)) {
      return value > 0 || hasFieldEvidence(field, evidence, parseResult);
    }
    return value > 0;
  }

  return true;
}

function hasFieldValue(field: VehicleFieldKey, input: VehicleInput, evidence?: InputEvidence, parseResult?: UrlParseResult): boolean {
  if (!hasRawValue(field, input, evidence, parseResult)) return false;

  if (hasEvidenceObject(evidence) && FIELDS_REQUIRING_EVIDENCE.has(field)) {
    return hasFieldEvidence(field, evidence, parseResult) || isInferred(field, evidence, parseResult, input);
  }

  return true;
}

function getFieldStatus(field: VehicleFieldKey, input: VehicleInput, evidence?: InputEvidence, parseResult?: UrlParseResult): EstimateValueStatus {
  if (!hasFieldValue(field, input, evidence, parseResult)) return "missing";
  if (isUserSupplied(field, evidence)) return "user_entered";
  if (isExtracted(field, evidence, parseResult)) return parseResult?.source === "url_tokens" ? "estimated" : "confirmed";
  if (isInferred(field, evidence, parseResult, input)) return "estimated";
  if (!hasEvidenceObject(evidence)) return "user_entered";
  return "user_entered";
}

function buildNote(field: VehicleFieldKey, status: EstimateValueStatus, input: VehicleInput, parseResult?: UrlParseResult): string {
  if (field === "co2Emissions" && input.fuelType === "electric" && status !== "missing") {
    return status === "estimated" ? "CO2 is treated as zero because the confirmed fuel type is electric." : "CO2 value is available for malus calculation.";
  }

  if (status === "missing") return `${FIELD_LABELS[field]} still needs confirmation before the estimate can be trusted.`;
  if (status === "confirmed") return `${FIELD_LABELS[field]} was found in listing metadata or structured data.`;
  if (status === "estimated") {
    if (field === "countryOfOrigin") return "Origin country was inferred from the marketplace/source and should be confirmed.";
    return `${FIELD_LABELS[field]} was inferred from weak listing data and should be reviewed.`;
  }
  return `${FIELD_LABELS[field]} was entered or confirmed by the user.`;
}

function getLabel(confidence: EstimateConfidence): string {
  switch (confidence) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
    default:
      return "Incomplete estimate";
  }
}

function listLabels(fields: VehicleFieldKey[]): string {
  return fields.map((field) => FIELD_LABELS[field]).join(", ");
}

export function assessEstimateQuality({
  input,
  parseResult,
  evidence,
  marketConfidence
}: {
  input: VehicleInput;
  parseResult?: UrlParseResult;
  evidence?: InputEvidence;
  marketConfidence?: MarketConfidence;
}): EstimateQuality {
  const assumptions: EstimateAssumption[] = TRACKED_FIELDS.map((field) => {
    const status = getFieldStatus(field, input, evidence, parseResult);
    return {
      field,
      label: FIELD_LABELS[field],
      status,
      critical: CRITICAL_FIELDS.includes(field),
      note: buildNote(field, status, input, parseResult)
    };
  });

  if (!input.fiscalPower && input.horsepower > 0) {
    assumptions.push({
      field: "fiscalPower",
      label: FIELD_LABELS.fiscalPower,
      status: "estimated",
      critical: false,
      note: "Fiscal power is estimated from horsepower for registration tax. Confirm fiscal CV for a stronger estimate."
    });
  }

  const missingFields = unique(assumptions.filter((item) => item.status === "missing").map((item) => item.field));
  const criticalMissingFields = CRITICAL_FIELDS.filter((field) => assumptions.some((item) => item.field === field && item.status === "missing"));
  const estimatedFields = unique(assumptions.filter((item) => item.status === "estimated").map((item) => item.field));
  const confirmedFields = unique(assumptions.filter((item) => item.status === "confirmed").map((item) => item.field));
  const userEnteredFields = unique(assumptions.filter((item) => item.status === "user_entered").map((item) => item.field));

  const estimatedCriticalFields = estimatedFields.filter((field) => CRITICAL_FIELDS.includes(field));
  const confidence: EstimateConfidence =
    criticalMissingFields.length > 0
      ? "incomplete"
      : marketConfidence === "low" || estimatedCriticalFields.length > 0
        ? "low"
        : marketConfidence === "medium" || estimatedFields.length > 0
          ? "medium"
          : "high";

  const summary =
    confidence === "incomplete"
      ? `Missing critical data: ${listLabels(criticalMissingFields)}.`
      : confidence === "low"
        ? "All critical fields are present, but some key values are inferred or market confidence is low."
        : confidence === "medium"
          ? "Critical fields are present. Some supporting values or market data remain estimated."
          : "Critical values are present and the comparison source is strong.";

  const nextAction =
    confidence === "incomplete"
      ? `Complete ${listLabels(criticalMissingFields.slice(0, 4))}${criticalMissingFields.length > 4 ? " and the remaining highlighted fields" : ""}.`
      : confidence === "low"
        ? "Review inferred fields before making a purchase decision."
        : "Use the breakdown and checklist to verify the deal before committing.";

  return {
    confidence,
    label: getLabel(confidence),
    isComplete: criticalMissingFields.length === 0,
    canShowStrongVerdict: criticalMissingFields.length === 0,
    criticalMissingFields,
    missingFields,
    confirmedFields,
    userEnteredFields,
    estimatedFields,
    assumptions,
    summary,
    nextAction
  };
}