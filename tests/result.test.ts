import assert from "node:assert/strict";
import test from "node:test";
import { estimateFrenchMarketValue } from "@/lib/market";
import { buildComparisonInsight, computeDealVerdict } from "@/lib/result";
import { strongMarginCase, TEST_CONTEXT } from "@/tests/fixtures/scenarios";

test("profitable low-risk imports are marked as good deals", () => {
  assert.equal(computeDealVerdict(4200, 12, "LOW"), "GOOD DEAL");
});

test("thin high-risk imports are downgraded to bad deals", () => {
  assert.equal(computeDealVerdict(500, 1, "HIGH"), "BAD DEAL");
});

test("comparison insight includes savings direction and provider source", () => {
  const market = estimateFrenchMarketValue(strongMarginCase, TEST_CONTEXT);
  const comparison = buildComparisonInsight(29000, market);

  assert.equal(comparison.direction, "saving");
  assert.equal(comparison.sourceLabel, market.providerLabel);
  assert.ok(comparison.confidenceLabel.length > 0);
});

