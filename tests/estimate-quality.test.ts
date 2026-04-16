import assert from "node:assert/strict";
import test from "node:test";
import { assessEstimateQuality } from "@/lib/estimation/quality";
import { runSimulation } from "@/lib/simulation";
import { strongMarginCase, TEST_CONTEXT } from "@/tests/fixtures/scenarios";
import type { VehicleFieldKey } from "@/types";

const allFilledFields = Object.keys(strongMarginCase).filter((field) => {
  const value = strongMarginCase[field as VehicleFieldKey];
  if (typeof value === "number") return value >= 0;
  if (typeof value === "string") return value.length > 0;
  return Boolean(value);
}) as VehicleFieldKey[];

test("estimate quality becomes incomplete when critical defaults were not confirmed", () => {
  const quality = assessEstimateQuality({
    input: strongMarginCase,
    evidence: {
      userSuppliedFields: ["purchasePrice", "brand", "model", "year", "firstRegistrationDate", "mileage", "horsepower"]
    },
    marketConfidence: "high"
  });

  assert.equal(quality.confidence, "incomplete");
  assert.ok(quality.criticalMissingFields.includes("sellerType"));
  assert.ok(quality.criticalMissingFields.includes("vatStatus"));
  assert.ok(quality.criticalMissingFields.includes("transportCost"));
});

test("estimate quality is complete when critical fields are user-confirmed", () => {
  const quality = assessEstimateQuality({
    input: strongMarginCase,
    evidence: { userSuppliedFields: allFilledFields },
    marketConfidence: "high"
  });

  assert.equal(quality.isComplete, true);
  assert.notEqual(quality.confidence, "incomplete");
  assert.equal(quality.criticalMissingFields.length, 0);
});

test("simulation surfaces incomplete estimate state instead of a strong verdict", () => {
  const result = runSimulation(strongMarginCase, "mobile.de", undefined, {
    ...TEST_CONTEXT,
    inputEvidence: {
      userSuppliedFields: ["purchasePrice", "brand", "model", "year", "firstRegistrationDate", "mileage", "horsepower"]
    }
  });

  assert.equal(result.estimateQuality?.confidence, "incomplete");
  assert.equal(result.verdict, "FAIR DEAL");
  assert.equal(result.narrative.headline, "This estimate is incomplete.");
});