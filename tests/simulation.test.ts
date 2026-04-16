import assert from "node:assert/strict";
import test from "node:test";
import { runSimulation } from "@/lib/simulation";
import { badDealCase, strongMarginCase, TEST_CONTEXT } from "@/tests/fixtures/scenarios";

test("good simulations include verdict narrative and checklist data", () => {
  const result = runSimulation(strongMarginCase, "mobile.de", undefined, TEST_CONTEXT);

  assert.equal(result.verdict, "GOOD DEAL");
  assert.ok(result.checklist.length > 4);
  assert.ok(result.narrative.whyVerdict.length > 2);
});

test("negative France spreads produce a bad-deal verdict", () => {
  const result = runSimulation(badDealCase, "mobile.de", undefined, TEST_CONTEXT);

  assert.equal(result.verdict, "BAD DEAL");
  assert.ok(result.profitOrLoss < 0);
});

