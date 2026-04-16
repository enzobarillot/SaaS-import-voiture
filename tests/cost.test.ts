import assert from "node:assert/strict";
import test from "node:test";
import { computeMalus, computeTotalCost, computeVAT } from "@/lib/cost";
import { dealerRecoverableCase, evCase, recentDieselCase, TEST_CONTEXT } from "@/tests/fixtures/scenarios";

test("cost engine adds fees, VAT, registration, and malus into total cost", () => {
  const breakdown = computeTotalCost(recentDieselCase, TEST_CONTEXT);

  assert.equal(breakdown.importSubtotal, 29895);
  assert.equal(breakdown.vat.amount, 5640);
  assert.equal(breakdown.registration.amount, 454);
  assert.ok(breakdown.malus.total > 0);
  assert.ok(breakdown.total > breakdown.importSubtotal);
});

test("electric vehicles remain exempt from malus", () => {
  const malus = computeMalus(evCase, TEST_CONTEXT);

  assert.equal(malus.co2Malus, 0);
  assert.equal(malus.massMalus, 0);
  assert.equal(malus.total, 0);
});

test("recoverable VAT is surfaced separately for dealer cases", () => {
  const vat = computeVAT(dealerRecoverableCase, TEST_CONTEXT);

  assert.equal(vat.amount, 0);
  assert.equal(vat.recoverableAmount, 5180);
  assert.match(vat.reason, /Recoverable VAT/);
});

