import assert from "node:assert/strict";
import test from "node:test";
import { assessRisk } from "@/lib/risk";
import { dealerRecoverableCase, missingCo2Case, privateSellerCase } from "@/tests/fixtures/scenarios";

test("missing emissions and logistics inputs drive high risk", () => {
  const risk = assessRisk(missingCo2Case);

  assert.equal(risk.level, "HIGH");
  assert.match(risk.reasons.join(" "), /CO2 emissions are missing/);
  assert.match(risk.reasons.join(" "), /Transport cost is missing/);
});

test("private seller purchases are flagged", () => {
  const risk = assessRisk(privateSellerCase);

  assert.match(risk.reasons.join(" "), /Private seller purchase/);
});

test("recoverable VAT ambiguity is surfaced", () => {
  const risk = assessRisk(dealerRecoverableCase);

  assert.match(risk.reasons.join(" "), /Recoverable VAT/);
});

