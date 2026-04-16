import assert from "node:assert/strict";
import test from "node:test";
import { estimateFrenchMarketValue } from "@/lib/market";
import {
  dealerRecoverableCase,
  heuristicCase,
  providerBackedCase,
  strongMarginCase,
  TEST_CONTEXT
} from "@/tests/fixtures/scenarios";

test("manual French market input takes precedence", () => {
  const market = estimateFrenchMarketValue(strongMarginCase, TEST_CONTEXT);

  assert.equal(market.providerId, "manual");
  assert.equal(market.estimatedPrice, 36000);
  assert.equal(market.confidence, "high");
});

test("seeded provider handles known local comparables", () => {
  const market = estimateFrenchMarketValue({ ...dealerRecoverableCase, frenchMarketEstimate: undefined }, TEST_CONTEXT);

  assert.equal(market.providerId, "seeded_reference");
  assert.ok(market.estimatedPrice > 30000);
});

test("provider-backed market feed handles non-seeded cases", () => {
  const market = estimateFrenchMarketValue(providerBackedCase, TEST_CONTEXT);

  assert.equal(market.providerId, "mock_live_feed");
  assert.equal(market.source, "provider");
  assert.ok((market.comparableListings?.length ?? 0) >= 2);
});

test("heuristic provider handles unmatched vehicles", () => {
  const market = estimateFrenchMarketValue(heuristicCase, TEST_CONTEXT);

  assert.equal(market.providerId, "heuristic");
  assert.equal(market.confidence, "low");
});